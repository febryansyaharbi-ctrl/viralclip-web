from pathlib import Path
from datetime import datetime
import shutil

p=Path("/home/harnet/viralclip-api/server.js")
s=p.read_text()
b=p.with_name(f"server.js.backup-postsubtitle-{datetime.now():%Y%m%d-%H%M%S}")
shutil.copy2(p,b)

# Add fs/path imports once.
anchor='''const { promisify } = require("util");

const execFileAsync = promisify(execFile);'''
replacement='''const { promisify } = require("util");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const execFileAsync = promisify(execFile);

const POST_RENDER_ROOT =
    "/home/harnet/viralclip-api/postrender";

fs.mkdirSync(
    POST_RENDER_ROOT,
    { recursive: true }
);'''
if 'const POST_RENDER_ROOT =' not in s:
    if anchor not in s:
        raise SystemExit("IMPORT_ANCHOR_NOT_FOUND")
    s=s.replace(anchor,replacement,1)

stream_marker='''// =====================================================
// STREAM VIDEO HASIL RENDER
// ====================================================='''
helpers=r'''
function assTime(seconds) {
    const safe = Math.max(
        0,
        Number(seconds || 0)
    );

    const hours =
        Math.floor(safe / 3600);

    const minutes =
        Math.floor(
            (safe % 3600) / 60
        );

    const secs =
        Math.floor(safe % 60);

    const centis =
        Math.floor(
            (safe - Math.floor(safe)) *
            100
        );

    return (
        `${hours}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}.` +
        `${String(centis).padStart(2, "0")}`
    );
}


function escapeAssText(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, " ")
        .replace(/[{}]/g, "")
        .trim();
}


function normalizeSubtitleSegments(
    segments,
    clipStart,
    clipEnd
) {
    const duration =
        Math.max(
            0,
            Number(clipEnd) -
            Number(clipStart)
        );

    return (
        Array.isArray(segments)
            ? segments
            : []
    )
        .map(segment => {
            let start =
                Number(segment.start || 0);

            let end =
                Number(segment.end || 0);

            // Frontend production sends relative times.
            // Also accept absolute transcript times.
            if (
                start > duration + 2 ||
                end > duration + 2
            ) {
                start -= Number(clipStart);
                end -= Number(clipStart);
            }

            start =
                Math.max(
                    0,
                    Math.min(
                        duration,
                        start
                    )
                );

            end =
                Math.max(
                    0,
                    Math.min(
                        duration,
                        end
                    )
                );

            return {
                start,
                end,
                text:
                    String(
                        segment.text || ""
                    )
                        .replace(/\s+/g, " ")
                        .trim()
            };
        })
        .filter(segment =>
            segment.text &&
            segment.end > segment.start
        );
}


function buildAssSubtitle({
    segments,
    clipStart,
    clipEnd,
    maxWords,
    font,
    styleName,
    animation
}) {
    const allowedFonts =
        new Set([
            "DejaVu Sans",
            "Liberation Sans",
            "Arial"
        ]);

    const safeFont =
        allowedFonts.has(font)
            ? font
            : "DejaVu Sans";

    const style =
        String(styleName || "hormozi")
            .toLowerCase();

    let fontSize = 42;
    let primary = "&H0000FFFF";
    let outline = 4;
    let shadow = 1;
    let bold = -1;
    let marginV = 82;

    if (style === "minimal") {
        fontSize = 34;
        primary = "&H00FFFFFF";
        outline = 2;
        shadow = 0;
        bold = 0;
        marginV = 72;
    }

    if (
        style === "mrbeast" ||
        style === "pop"
    ) {
        fontSize = 46;
        primary = "&H00FFFFFF";
        outline = 5;
        shadow = 2;
        bold = -1;
        marginV = 92;
    }

    const max =
        Math.max(
            1,
            Math.min(
                6,
                Number(maxWords) || 3
            )
        );

    const normalized =
        normalizeSubtitleSegments(
            segments,
            clipStart,
            clipEnd
        );

    const events = [];

    for (const segment of normalized) {
        const words =
            segment.text
                .split(/\s+/)
                .filter(Boolean);

        if (!words.length) {
            continue;
        }

        const groups = [];

        for (
            let i = 0;
            i < words.length;
            i += max
        ) {
            groups.push(
                words.slice(
                    i,
                    i + max
                )
            );
        }

        const segmentDuration =
            segment.end -
            segment.start;

        const totalWords =
            words.length;

        let consumedWords = 0;

        for (const group of groups) {
            const groupStart =
                segment.start +
                segmentDuration *
                (
                    consumedWords /
                    totalWords
                );

            consumedWords +=
                group.length;

            const groupEnd =
                segment.start +
                segmentDuration *
                (
                    consumedWords /
                    totalWords
                );

            let prefix = "";

            if (
                animation === "pop"
            ) {
                prefix =
                    "{\\fscx82\\fscy82" +
                    "\\t(0,120," +
                    "\\fscx100\\fscy100)}";
            } else if (
                animation === "fade"
            ) {
                prefix =
                    "{\\fad(90,90)}";
            }

            events.push(
                "Dialogue: 0," +
                assTime(groupStart) +
                "," +
                assTime(groupEnd) +
                ",Default,,0,0,0,," +
                prefix +
                escapeAssText(
                    group.join(" ")
                )
            );
        }
    }

    return [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 608",
        "PlayResY: 1080",
        "WrapStyle: 2",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
        `Style: Default,${safeFont},${fontSize},${primary},&H000000FF,&H00000000,&H64000000,${bold},0,0,0,100,100,0,0,1,${outline},${shadow},2,34,34,${marginV},1`,
        "",
        "[Events]",
        "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
        ...events,
        ""
    ].join("\n");
}


function localRenderDir(jobId) {
    return path.join(
        POST_RENDER_ROOT,
        path.basename(
            String(jobId || "")
        )
    );
}


function localRenderFile(jobId) {
    return path.join(
        localRenderDir(jobId),
        "viralclip.mp4"
    );
}


async function makeCustomSubtitleRender({
    jobId,
    segments,
    clipStart,
    clipEnd,
    maxWords,
    font,
    styleName,
    animation
}) {
    const dir =
        localRenderDir(jobId);

    await fsp.mkdir(
        dir,
        { recursive: true }
    );

    const baseFile =
        path.join(
            dir,
            "base.mp4"
        );

    const assFile =
        path.join(
            dir,
            "subtitle.ass"
        );

    const outputFile =
        localRenderFile(jobId);

    const response =
        await fetchWhisper(
            `${WHISPER_URL}/api/render/download/${encodeURIComponent(jobId)}`
        );

    if (!response.ok) {
        throw new Error(
            `Gagal mengambil base render: HTTP ${response.status}`
        );
    }

    const baseBuffer =
        Buffer.from(
            await response.arrayBuffer()
        );

    await fsp.writeFile(
        baseFile,
        baseBuffer
    );

    const ass =
        buildAssSubtitle({
            segments,
            clipStart,
            clipEnd,
            maxWords,
            font,
            styleName,
            animation
        });

    await fsp.writeFile(
        assFile,
        ass,
        "utf8"
    );

    const escapedAss =
        assFile
            .replace(/\\/g, "/")
            .replace(/:/g, "\\:")
            .replace(/'/g, "\\'");

    await execFileAsync(
        "ffmpeg",
        [
            "-y",
            "-i",
            baseFile,
            "-vf",
            `subtitles='${escapedAss}'`,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            outputFile
        ],
        {
            maxBuffer:
                20 * 1024 * 1024
        }
    );

    await fsp.rm(
        baseFile,
        { force: true }
    );

    return outputFile;
}


'''
if "function buildAssSubtitle(" not in s:
    if stream_marker not in s:
        raise SystemExit("STREAM_MARKER_NOT_FOUND")
    s=s.replace(stream_marker, helpers+stream_marker,1)

# Replace render-selected route with custom post-render version.
start=s.find('app.post("/api/render-selected"')
end=s.find('\n\napp.get(\n    "/api/render/video/:job_id"',start)
if start < 0 or end < 0:
    raise SystemExit("RENDER_SELECTED_BLOCK_NOT_FOUND")

new_route=r'''app.post("/api/render-selected", async (req, res) => {
    const {
        video_url,
        start,
        end,
        hook = "",
        segments = [],
        subtitles = true,
        subtitle_max_words = 3,
        subtitle_font = "DejaVu Sans",
        subtitle_style = "hormozi",
        subtitle_animation = "pop",
        cleanup_source = false
    } = req.body || {};

    if (!video_url) {
        return res.status(400).json({
            error: "video_url wajib diisi."
        });
    }

    if (
        !Number.isFinite(Number(start)) ||
        !Number.isFinite(Number(end)) ||
        Number(end) <= Number(start)
    ) {
        return res.status(400).json({
            error: "start/end tidak valid."
        });
    }

    if (
        Number(end) -
        Number(start) >
        60
    ) {
        return res.status(400).json({
            error:
                "Durasi clip maksimal 60 detik."
        });
    }

    try {
        const useCustomSubtitle =
            Boolean(subtitles) &&
            Array.isArray(segments) &&
            segments.length > 0;

        // FastAPI creates the cropped base.
        // Subtitle is disabled there when Node will add ASS.
        const renderResponse =
            await fetchWhisper(
                `${WHISPER_URL}/api/render`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        video_url,
                        start:
                            Number(start),
                        end:
                            Number(end),
                        hook:
                            String(hook || ""),
                        segments: [],
                        subtitles: false,
                        cleanup_source:
                            Boolean(
                                cleanup_source
                            )
                    })
                }
            );

        const data =
            await renderResponse.json();

        if (!renderResponse.ok) {
            return res
                .status(
                    renderResponse.status
                )
                .json(data);
        }

        if (
            useCustomSubtitle &&
            data?.job_id
        ) {
            console.log(
                `[Subtitle] Custom ASS ${data.job_id}: ` +
                `${subtitle_max_words} kata/frame, ` +
                `${subtitle_font}, ${subtitle_style}, ` +
                `${subtitle_animation}`
            );

            await makeCustomSubtitleRender({
                jobId:
                    data.job_id,
                segments,
                clipStart:
                    Number(start),
                clipEnd:
                    Number(end),
                maxWords:
                    Math.max(
                        1,
                        Math.min(
                            6,
                            Number(
                                subtitle_max_words
                            ) || 3
                        )
                    ),
                font:
                    String(
                        subtitle_font ||
                        "DejaVu Sans"
                    ),
                styleName:
                    String(
                        subtitle_style ||
                        "hormozi"
                    ),
                animation:
                    String(
                        subtitle_animation ||
                        "pop"
                    )
            });

            data.subtitles = true;
            data.subtitle_engine =
                "node_ass";
            data.subtitle_max_words =
                Math.max(
                    1,
                    Math.min(
                        6,
                        Number(
                            subtitle_max_words
                        ) || 3
                    )
                );
        } else {
            data.subtitles = false;
        }

        return res.json(data);

    } catch (error) {
        console.error(
            "[-] ERROR /api/render-selected:",
            error
        );

        return res.status(500).json({
            error:
                "Gagal membuat render clip.",
            detail:
                error?.message ||
                String(error)
        });
    }
});'''

s=s[:start]+new_route+s[end:]

# Add local cleanup before forwarding cleanup to FastAPI.
cleanup_anchor='''    try {

        const cleanupResponse = await fetchWhisper(`${WHISPER_URL}/api/render/cleanup`,'''
cleanup_new='''    try {

        await Promise.all(
            jobIds.map(jobId =>
                fsp.rm(
                    localRenderDir(jobId),
                    {
                        recursive: true,
                        force: true
                    }
                )
            )
        );

        const cleanupResponse = await fetchWhisper(`${WHISPER_URL}/api/render/cleanup`,'''
if cleanup_anchor not in s:
    raise SystemExit("CLEANUP_ANCHOR_NOT_FOUND")
s=s.replace(cleanup_anchor,cleanup_new,1)

# Serve Node post-render file first for inline video.
video_anchor='''            const response =
                await fetchWhisper(`${WHISPER_URL}/api/render/download/${jobId}`
                );'''
video_new='''            const rawJobId =
                String(
                    req.params.job_id || ""
                );

            const localFile =
                localRenderFile(
                    rawJobId
                );

            if (
                fs.existsSync(localFile)
            ) {
                res.setHeader(
                    "Content-Type",
                    "video/mp4"
                );
                res.setHeader(
                    "Cache-Control",
                    "public, max-age=3600"
                );
                res.setHeader(
                    "Content-Disposition",
                    "inline"
                );

                return res.sendFile(
                    localFile
                );
            }

            const response =
                await fetchWhisper(`${WHISPER_URL}/api/render/download/${jobId}`
                );'''
if s.count(video_anchor) < 2:
    raise SystemExit("VIDEO_DOWNLOAD_ANCHOR_COUNT_BAD")
s=s.replace(video_anchor,video_new,1)

# Serve Node post-render file first for download.
download_new='''            const rawJobId =
                String(
                    req.params.job_id || ""
                );

            const localFile =
                localRenderFile(
                    rawJobId
                );

            if (
                fs.existsSync(localFile)
            ) {
                return res.download(
                    localFile,
                    "viralclip.mp4"
                );
            }

            const response =
                await fetchWhisper(`${WHISPER_URL}/api/render/download/${jobId}`
                );'''
s=s.replace(video_anchor,download_new,1)

p.write_text(s)
print("PATCH_POSTSUBTITLE_OK")
print("BACKUP="+str(b))
