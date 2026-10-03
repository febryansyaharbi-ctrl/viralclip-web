from pathlib import Path
import shutil

src = Path("/home/harnet/main.py.inspect")
dst = Path("/home/harnet/main.py.fast")

text = src.read_text(encoding="utf-8")

old_import = "import uuid\nimport re\nimport numpy as np\n"
new_import = "import uuid\nimport re\nimport json\nimport numpy as np\n"

if old_import not in text:
    raise SystemExit("IMPORT_MARKER_NOT_FOUND")

text = text.replace(old_import, new_import, 1)

marker = '''    return audio_file


# =========================================================
# TRANSCRIBE
# =========================================================
'''

helper = r'''    return audio_file


# =========================================================
# FAST YOUTUBE CAPTIONS
# =========================================================

def _preferred_caption_language(track_map):
    if not isinstance(track_map, dict):
        return None

    languages = [
        str(language)
        for language in track_map.keys()
        if language and str(language) != "live_chat"
    ]

    for prefix in ("id", "en"):
        for language in languages:
            lowered = language.lower()

            if (
                lowered == prefix
                or lowered.startswith(prefix + "-")
                or lowered.startswith(prefix + ".")
            ):
                return language

    return None


def _fallback_caption_language(track_map):
    if not isinstance(track_map, dict):
        return None

    for language in track_map.keys():
        if language and str(language) != "live_chat":
            return str(language)

    return None


def _caption_json3_to_transcript(caption_file: str, language: str):
    with open(caption_file, "r", encoding="utf-8") as file:
        data = json.load(file)

    raw_segments = []

    for event in data.get("events", []):
        segs = event.get("segs") or []
        if not segs:
            continue

        text = "".join(
            str(seg.get("utf8") or "")
            for seg in segs
        )
        text = re.sub(r"\s+", " ", text).strip()

        if not text:
            continue

        start = float(event.get("tStartMs") or 0) / 1000.0
        duration = float(event.get("dDurationMs") or 0) / 1000.0

        raw_segments.append({
            "start": start,
            "end": start + duration,
            "text": text
        })

    transcript_segments = []
    full_text = []

    for index, segment in enumerate(raw_segments):
        start = float(segment["start"])
        end = float(segment["end"])

        if end <= start:
            if index + 1 < len(raw_segments):
                next_start = float(raw_segments[index + 1]["start"])
                if next_start > start:
                    end = next_start

            if end <= start:
                end = start + 2.0

        text = segment["text"]

        if transcript_segments:
            previous = transcript_segments[-1]

            if (
                previous["text"] == text
                and start <= float(previous["end"]) + 0.75
            ):
                previous["end"] = round(
                    max(float(previous["end"]), end),
                    3
                )
                previous["end_time"] = format_time(
                    float(previous["end"])
                )
                continue

        item = {
            "id": len(transcript_segments) + 1,
            "start": round(start, 3),
            "end": round(end, 3),
            "start_time": format_time(start),
            "end_time": format_time(end),
            "text": text
        }

        transcript_segments.append(item)
        full_text.append(text)

    if not transcript_segments:
        return None

    return {
        "language": language,
        "language_probability": 1.0,
        "segments": transcript_segments,
        "text": " ".join(full_text)
    }


def try_youtube_caption_transcript(video_url: str, output_dir: str):
    # Jalur cepat caption YouTube. Jika gagal, caller fallback ke Whisper.
    try:
        metadata_command = [
            "yt-dlp",
            "--no-warnings",
            "--skip-download",
            "--no-playlist",
            "--dump-single-json",
            video_url
        ]

        print("[Caption] Mengecek subtitle YouTube...")

        metadata_result = subprocess.run(
            metadata_command,
            capture_output=True,
            text=True,
            timeout=90
        )

        if metadata_result.returncode != 0:
            print("[Caption] Metadata subtitle gagal, fallback ke Whisper.")

            if metadata_result.stderr:
                print(metadata_result.stderr[-1500:])

            return None

        info = json.loads(metadata_result.stdout)

        manual_tracks = info.get("subtitles") or {}
        automatic_tracks = info.get("automatic_captions") or {}

        selected_language = _preferred_caption_language(manual_tracks)
        caption_type = "manual" if selected_language else None

        if not selected_language:
            selected_language = _preferred_caption_language(automatic_tracks)

            if selected_language:
                caption_type = "auto"

        if not selected_language:
            selected_language = _fallback_caption_language(manual_tracks)

            if selected_language:
                caption_type = "manual"

        if not selected_language:
            selected_language = _fallback_caption_language(automatic_tracks)

            if selected_language:
                caption_type = "auto"

        if not selected_language:
            print("[Caption] Caption tidak tersedia, fallback ke Whisper.")
            return None

        print(
            f"[Caption] Memakai {caption_type}: {selected_language}"
        )

        output_template = os.path.join(
            output_dir,
            "caption.%(ext)s"
        )

        download_command = [
            "yt-dlp",
            "--no-warnings",
            "--skip-download",
            "--no-playlist",
            "--sub-format",
            "json3",
            "--sub-langs",
            selected_language,
            "-o",
            output_template
        ]

        if caption_type == "manual":
            download_command.append("--write-subs")
        else:
            download_command.append("--write-auto-subs")

        download_command.append(video_url)

        subtitle_result = subprocess.run(
            download_command,
            capture_output=True,
            text=True,
            timeout=90
        )

        if subtitle_result.returncode != 0:
            print("[Caption] Download caption gagal, fallback ke Whisper.")

            if subtitle_result.stderr:
                print(subtitle_result.stderr[-1500:])

            return None

        caption_files = [
            os.path.join(output_dir, filename)
            for filename in os.listdir(output_dir)
            if (
                filename.startswith("caption.")
                and filename.endswith(".json3")
            )
        ]

        if not caption_files:
            print("[Caption] File caption JSON3 tidak ditemukan, fallback ke Whisper.")
            return None

        transcript = _caption_json3_to_transcript(
            caption_files[0],
            selected_language
        )

        if not transcript:
            print("[Caption] Caption kosong, fallback ke Whisper.")
            return None

        transcript["transcription_source"] = "youtube_caption"
        transcript["caption_type"] = caption_type

        print(
            f"[Caption] Selesai cepat: "
            f"{len(transcript['segments'])} segmen."
        )

        return transcript

    except Exception as error:
        print(f"[Caption] Gagal memakai caption: {error}")
        print("[Caption] Fallback ke Whisper.")
        return None


# =========================================================
# TRANSCRIBE
# =========================================================
'''

if marker not in text:
    raise SystemExit("HELPER_MARKER_NOT_FOUND")

text = text.replace(marker, helper, 1)

old_endpoint = '''    try:

        audio_file = download_audio(
            video_url,
            temp_dir
        )

        transcript = transcribe_audio(
            audio_file
        )
'''

new_endpoint = '''    try:

        transcript = try_youtube_caption_transcript(
            video_url,
            temp_dir
        )

        if transcript:
            transcription_source = "youtube_caption"
        else:
            audio_file = download_audio(
                video_url,
                temp_dir
            )

            transcript = transcribe_audio(
                audio_file
            )

            transcription_source = "whisper"
'''

if old_endpoint not in text:
    raise SystemExit("ENDPOINT_MARKER_NOT_FOUND")

text = text.replace(old_endpoint, new_endpoint, 1)

old_response = '''            "text":
                transcript["text"]
        }
'''

new_response = '''            "text":
                transcript["text"],

            "transcription_source":
                transcription_source,

            "caption_type":
                transcript.get("caption_type")
        }
'''

if old_response not in text:
    raise SystemExit("RESPONSE_MARKER_NOT_FOUND")

text = text.replace(old_response, new_response, 1)

backup = Path("/home/harnet/main.py.inspect.backup-fast")
if not backup.exists():
    shutil.copy2(src, backup)

dst.write_text(text, encoding="utf-8")
print("PATCH_OK", dst)
