const RUNTIME_FIX_VERSION = "20261005-stable-v2";
console.info(`[ViralClip] runtime loader ${RUNTIME_FIX_VERSION}`);

const API_BASE = "https://harnet.tail89c9ef.ts.net";
const bundleUrl = `/viralclip-web/assets/index-DK5reAhc.js?v=${RUNTIME_FIX_VERSION}`;
const nativeFetch = window.fetch.bind(window);

const getSetting = (key, fallback) => localStorage.getItem(`viralclip_${key}`) || fallback;
const setSetting = (key, value) => localStorage.setItem(`viralclip_${key}`, String(value));

function queryProfile(rawQuery) {
  const q = String(rawQuery || "").toLowerCase();
  if (/anak|kids|keluarga|parenting|family/.test(q)) return {
    type: "kids",
    extra: "edukasi anak belajar anak kartun anak cerita anak lagu anak kids learning family",
    banned: /politik|pemilu|presiden|menteri|partai|dpr|gubernur|pilkada|kampanye|berita politik|prabowo|jokowi|anies|ganjar/i,
    relevant: /anak|kids|kartun|belajar|edukasi|cerita|lagu|family|keluarga|parenting|sekolah|balita|bayi/i
  };
  if (/keuangan|finance|bisnis|uang|investasi/.test(q)) return { type:"finance", extra:"keuangan bisnis investasi uang entrepreneur financial literacy", banned:null, relevant:null };
  if (/teknologi|technology|ai|artificial|tools/.test(q)) return { type:"tech", extra:"AI tools teknologi artificial intelligence tutorial productivity software", banned:null, relevant:null };
  if (/motivasi|psikologi|psychology|self improvement/.test(q)) return { type:"motivation", extra:"motivasi psikologi self improvement mindset produktivitas", banned:null, relevant:null };
  if (/fitness|kesehatan|health|nutrisi/.test(q)) return { type:"health", extra:"fitness kesehatan olahraga nutrisi workout healthy habits", banned:null, relevant:null };
  if (/karier|career|profesional|produktif/.test(q)) return { type:"career", extra:"karier career interview profesional produktivitas skill kerja", banned:null, relevant:null };
  if (/properti|property|real estate|rumah/.test(q)) return { type:"property", extra:"properti rumah real estate investasi properti renovasi", banned:null, relevant:null };
  if (/otomotif|automotive|mobil|motor/.test(q)) return { type:"auto", extra:"otomotif mobil motor review kendaraan tips perawatan", banned:null, relevant:null };
  if (/beauty|skincare|fashion|makeup/.test(q)) return { type:"beauty", extra:"beauty skincare fashion makeup tutorial review", banned:null, relevant:null };
  if (/travel|kuliner|hotel|wisata/.test(q)) return { type:"travel", extra:"travel wisata kuliner hotel itinerary hidden gem", banned:null, relevant:null };
  if (/edukasi|education|skill|belajar/.test(q)) return { type:"education", extra:"edukasi skill belajar tutorial profesional", banned:null, relevant:null };
  return { type:"general", extra:"", banned:null, relevant:null };
}

function rewriteSourceUrl(url) {
  try {
    const u = new URL(url, location.href);
    const query = u.searchParams.get("query") || "";
    const profile = queryProfile(query);
    if (profile.extra && !u.searchParams.has("vc_niche")) {
      u.searchParams.set("query", `${query} ${profile.extra}`.trim());
      u.searchParams.set("vc_niche", profile.type);
    }
    u.searchParams.set("refresh", Date.now());
    return { url: u.toString(), profile };
  } catch {
    return { url, profile: queryProfile("") };
  }
}

async function filterSourceResponse(response, profile) {
  if (!response.ok) return response;
  try {
    const data = await response.clone().json();
    if (!Array.isArray(data?.items)) return response;
    let items = data.items.filter(Boolean);
    if (profile?.banned) {
      items = items.filter(item => !profile.banned.test(`${item.title || ""} ${item.channel || ""}`));
    }
    if (profile?.relevant) {
      const relevant = items.filter(item => profile.relevant.test(`${item.title || ""} ${item.channel || ""}`));
      if (relevant.length >= 4) items = [...relevant, ...items.filter(item => !relevant.includes(item))];
    }
    data.items = items.slice(0, 10);
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return response;
  }
}

let progressTimer = null;
function ensureProgressUI() {
  let el = document.getElementById("vc-process-progress");
  if (el) return el;
  el = document.createElement("div");
  el.id = "vc-process-progress";
  el.innerHTML = `
    <div class="vc-progress-card">
      <div class="vc-progress-top"><b>ViralClip sedang bekerja</b><span id="vc-progress-time">0s</span></div>
      <div class="vc-progress-bar"><i id="vc-progress-fill"></i></div>
      <div id="vc-progress-stage" class="vc-progress-stage">Menghubungkan server…</div>
      <div class="vc-progress-note">Status visual mengikuti alur proses; hasil akhir tetap divalidasi server.</div>
    </div>`;
  document.body.appendChild(el);
  return el;
}
function startProgress() {
  const el = ensureProgressUI();
  el.classList.add("show");
  const stage = el.querySelector("#vc-progress-stage");
  const time = el.querySelector("#vc-progress-time");
  const fill = el.querySelector("#vc-progress-fill");
  const started = Date.now();
  const stages = [
    [0,"Menghubungkan server & memvalidasi link…",8],
    [2,"Membaca judul, durasi, dan metadata video…",18],
    [5,"Mengambil Fast Transcript / subtitle YouTube…",34],
    [9,"AI membaca transcript dan memahami isi video…",55],
    [18,"AI mencari poin, hook, dan momen terkuat…",72],
    [35,"Merapikan timestamp agar poin tidak terpotong…",86],
    [55,"Menyiapkan rekomendasi clip dan data export…",94]
  ];
  clearInterval(progressTimer);
  const tick = () => {
    const sec = Math.floor((Date.now()-started)/1000);
    let active = stages[0];
    for (const item of stages) if (sec >= item[0]) active = item;
    stage.textContent = active[1];
    time.textContent = `${sec}s`;
    fill.style.width = `${active[2]}%`;
  };
  tick();
  progressTimer = setInterval(tick, 1000);
}
function finishProgress(ok, message) {
  clearInterval(progressTimer);
  const el = document.getElementById("vc-process-progress");
  if (!el) return;
  const stage = el.querySelector("#vc-progress-stage");
  const fill = el.querySelector("#vc-progress-fill");
  stage.textContent = message || (ok ? "Selesai. Hasil analisis siap." : "Proses gagal. Silakan coba lagi.");
  fill.style.width = "100%";
  el.classList.toggle("error", !ok);
  setTimeout(() => el.classList.remove("show", "error"), ok ? 1400 : 4500);
}

window.fetch = async (input, init = {}) => {
  let url = typeof input === "string" ? input : input?.url || "";
  let nextInput = input;
  let nextInit = { ...init };
  let sourceProfile = null;

  if (url.includes("/api/sources?")) {
    const rewritten = rewriteSourceUrl(url);
    url = rewritten.url;
    sourceProfile = rewritten.profile;
    if (typeof input === "string") nextInput = url;
    else nextInput = new Request(url, input);
  }

  if (url.includes("/api/render-selected") && typeof nextInit.body === "string") {
    try {
      const body = JSON.parse(nextInit.body);
      if (body.subtitles !== false) {
        body.subtitles = true;
        body.subtitle_max_words = Number(getSetting("subtitle_max_words", "3"));
        body.subtitle_font = getSetting("subtitle_font", "DejaVu Sans");
        body.subtitle_style = getSetting("subtitle_style", "hormozi");
        body.subtitle_animation = getSetting("subtitle_animation", "pop");
      }
      nextInit.body = JSON.stringify(body);
    } catch (error) {
      console.warn("[ViralClip] setting subtitle gagal disisipkan:", error);
    }
  }

  const isProcess = url.includes("/api/process") && String(nextInit.method || "GET").toUpperCase() === "POST";
  if (isProcess) startProgress();

  try {
    const response = await nativeFetch(nextInput, nextInit);
    if (sourceProfile) return await filterSourceResponse(response, sourceProfile);
    if (isProcess) finishProgress(response.ok, response.ok ? "Analisis selesai. Menampilkan clip terbaik…" : `Server mengembalikan HTTP ${response.status}.`);
    return response;
  } catch (error) {
    if (isProcess) finishProgress(false, `Proses gagal: ${error?.message || "koneksi terputus"}`);
    throw error;
  }
};

const response = await nativeFetch(bundleUrl, { cache: "no-store" });
if (!response.ok) throw new Error(`Gagal memuat bundle ViralClip: HTTP ${response.status}`);
let code = await response.text();

const requiredPatches = [
  ['let t=await fetch("https://harnet.tail89c9ef.ts.net/api/process",','let response=await fetch("https://harnet.tail89c9ef.ts.net/api/process",'],
  ['if(!t.ok){let e=await t.text();throw Error("HTTP "+t.status+": "+e.slice(0,500))}d(2);let n=await t.json();','if(!response.ok){let e=await response.text();throw Error("HTTP "+response.status+": "+e.slice(0,500))}d(2);let n=await response.json();'],
  ['let t=f.filter(e=>m.includes(e.id)),r=[];for(let n=0;n<t.length;n++){let a=t[n],','let selected=f.filter(e=>m.includes(e.id)),r=[];for(let n=0;n<selected.length;n++){let a=selected[n],'],
  ['cleanup_source:n===t.length-1','cleanup_source:n===selected.length-1'],
  ['`Render `,m.length,` Clip`]})})]})]})(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`,children:[`Estimasi render: `','`Render `,m.length,` Clip`]})})]})]}),(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`,children:[`Estimasi render: `']
];
let applied = 0;
for (const [from,to] of requiredPatches) {
  const first = code.indexOf(from), last = code.lastIndexOf(from);
  if (first === -1) throw new Error(`Runtime patch gagal: ${from.slice(0,80)}`);
  if (first !== last) throw new Error(`Runtime patch tidak unik: ${from.slice(0,80)}`);
  code = code.replace(from,to); applied++;
}

const historyFrom = 'video_url:e.video_url,download_url:e.download_url}))}';
const historyTo = 'video_url:e.video_url,download_url:e.download_url,render_job_id:e.render_job_id,score:e.score,title:e.title,hook:e.hook,caption:e.caption,tags:e.tags}))}';
if (code.includes(historyFrom)) { code = code.replace(historyFrom, historyTo); applied++; }

const nicheAnchor = 'ideas:`Cara berhenti malas dalam 1 menit, aturan 5 detik, dark psychology.`}],Ke=';
if (code.includes(nicheAnchor)) {
  const extraNiches = `ideas:\`Cara berhenti malas dalam 1 menit, aturan 5 detik, dark psychology.\`},
{id:\`health_fitness\`,name:\`Kesehatan & Fitness\`,cpm:\`Lokal & Global\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Fitness, nutrisi umum, kebiasaan sehat, dan edukasi kebugaran.\`,domesticExample:\`Fitness Indonesia\`,intlExample:\`Fitness & health creators\`,ideas:\`Kesalahan latihan, kebiasaan sehat, konsistensi olahraga.\`},
{id:\`career\`,name:\`Karier & Produktivitas\`,cpm:\`Lokal & Global\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Karier, interview, produktivitas, skill kerja dan profesional.\`,domesticExample:\`Creator karier Indonesia\`,intlExample:\`Career creators\`,ideas:\`Tips interview, skill bernilai tinggi, fokus kerja.\`},
{id:\`property\`,name:\`Properti & Real Estate\`,cpm:\`Lokal & Global\`,difficulty:\`Sulit\`,viralPotential:\`Tinggi\`,description:\`Rumah, investasi properti, renovasi dan edukasi pembelian properti.\`,domesticExample:\`Review properti Indonesia\`,intlExample:\`Real estate creators\`,ideas:\`Kesalahan beli rumah, renovasi, biaya properti.\`},
{id:\`automotive\`,name:\`Otomotif\`,cpm:\`Lokal & Global\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Mobil, motor, teknologi kendaraan, review dan perawatan.\`,domesticExample:\`Otomotif Indonesia\`,intlExample:\`Automotive creators\`,ideas:\`Fitur kendaraan, perbandingan, perawatan.\`},
{id:\`beauty\`,name:\`Beauty, Skincare & Fashion\`,cpm:\`Lokal & Global\`,difficulty:\`Menengah\`,viralPotential:\`Sangat Tinggi\`,description:\`Skincare, makeup, fashion, transformasi dan review.\`,domesticExample:\`Beauty Indonesia\`,intlExample:\`Beauty creators\`,ideas:\`Before-after, skincare, styling cepat.\`},
{id:\`travel\`,name:\`Travel, Kuliner & Hospitality\`,cpm:\`Lokal & Global\`,difficulty:\`Menengah\`,viralPotential:\`Sangat Tinggi\`,description:\`Destinasi, hotel, kuliner, itinerary dan hidden gem.\`,domesticExample:\`Travel Indonesia\`,intlExample:\`Travel creators\`,ideas:\`Hidden gem, hotel unik, kuliner, itinerary.\`},
{id:\`education_pro\`,name:\`Edukasi & Skill Profesional\`,cpm:\`Lokal & Global\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Bahasa, coding, desain, komunikasi dan skill praktis.\`,domesticExample:\`Edukasi Indonesia\`,intlExample:\`Educational creators\`,ideas:\`Belajar skill, kesalahan umum, tutorial singkat.\`}],Ke=`;
  code = code.replace(nicheAnchor, extraNiches); applied++;
}

const malformedClipResult = ']})]})(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`';
if (code.includes(malformedClipResult)) throw new Error("Runtime patch JSX gagal.");
console.info(`[ViralClip] ${applied} patch diterapkan`);

const blobUrl = URL.createObjectURL(new Blob([code], {type:"text/javascript"}));
try { await import(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }

const style = document.createElement("style");
style.textContent = `
#vc-process-progress{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.72);backdrop-filter:blur(5px);z-index:999999;padding:20px}
#vc-process-progress.show{display:flex}
.vc-progress-card{width:min(540px,94vw);background:#0f172a;border:1px solid #334155;border-radius:20px;padding:22px;box-shadow:0 25px 80px rgba(0,0,0,.5);color:#e2e8f0}
.vc-progress-top{display:flex;justify-content:space-between;gap:12px;font-size:15px}.vc-progress-bar{height:9px;background:#1e293b;border-radius:99px;overflow:hidden;margin:16px 0}.vc-progress-bar i{display:block;height:100%;width:8%;background:linear-gradient(90deg,#6366f1,#22d3ee);transition:width .5s;border-radius:99px}.vc-progress-stage{font-weight:700;font-size:14px}.vc-progress-note{font-size:11px;color:#94a3b8;margin-top:7px}#vc-process-progress.error .vc-progress-bar i{background:#ef4444}
.vc-extra-card{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;color:#cbd5e1;margin-top:12px}.vc-extra-title{font-size:12px;font-weight:800;color:#a5b4fc;margin-bottom:8px;text-transform:uppercase}.vc-sub-controls{display:flex;gap:8px;flex-wrap:wrap}.vc-sub-controls label{font-size:11px;color:#94a3b8;display:flex;flex-direction:column;gap:4px}.vc-sub-controls select{background:#020617;border:1px solid #475569;color:#fff;border-radius:8px;padding:7px 9px}.vc-history-meta{display:grid;gap:8px;margin-top:10px}.vc-history-clip{padding:10px;border:1px solid #334155;border-radius:10px;background:#020617}.vc-tags{color:#60a5fa;font-size:12px}.vc-score{display:inline-block;background:#312e81;color:#c7d2fe;padding:3px 7px;border-radius:999px;font-size:11px;font-weight:800;margin-right:6px}
`;
document.head.appendChild(style);

function installSubtitleControls() {
  if (document.getElementById("vc-subtitle-controls")) return;
  const label = [...document.querySelectorAll("span,div,p")].find(el => el.childElementCount===0 && el.textContent?.trim()==="Subtitle:");
  if (!label) return;
  const host = label.parentElement?.parentElement || label.parentElement;
  if (!host) return;
  const box = document.createElement("div"); box.id="vc-subtitle-controls"; box.className="vc-extra-card";
  box.innerHTML=`<div class="vc-extra-title">Pengaturan Subtitle Export</div><div class="vc-sub-controls">
  <label>Maks kata/frame<select data-vc="subtitle_max_words">${[1,2,3,4,5,6].map(v=>`<option value="${v}">${v} kata</option>`).join("")}</select></label>
  <label>Font<select data-vc="subtitle_font"><option>DejaVu Sans</option><option>Liberation Sans</option><option>Arial</option></select></label>
  <label>Gaya<select data-vc="subtitle_style"><option value="hormozi">Hormozi Kuning</option><option value="minimal">Minimal Putih</option><option value="mrbeast">MrBeast Pop</option></select></label>
  <label>Animasi<select data-vc="subtitle_animation"><option value="pop">Pop</option><option value="fade">Fade</option><option value="none">Tanpa animasi</option></select></label></div><div style="font-size:11px;color:#64748b;margin-top:7px">Jika checkbox Subtitle aktif, setting ini dibakar langsung ke MP4.</div>`;
  host.insertAdjacentElement("afterend",box);
  box.querySelectorAll("select[data-vc]").forEach(select=>{ const key=select.dataset.vc; const def=key==="subtitle_max_words"?"3":key==="subtitle_font"?"DejaVu Sans":key==="subtitle_style"?"hormozi":"pop"; select.value=getSetting(key,def); select.onchange=()=>setSetting(key,select.value); });
}

function selectedNicheName() {
  const active = [...document.querySelectorAll("*")].find(el => el.childElementCount===0 && el.textContent?.trim()==="Niche Aktif");
  const card = active?.closest(".cursor-pointer") || active?.parentElement?.parentElement;
  return card?.querySelector("h3")?.textContent?.replace("⭐","").trim() || "niche aktif";
}
function globalTarget() {
  const buttons=[...document.querySelectorAll("button")];
  const global=buttons.find(b=>b.textContent?.includes("Global (EN)"));
  return !!global && /bg-indigo|bg-blue|bg-violet/.test(global.className||"");
}
function installTiming() {
  const heading=[...document.querySelectorAll("h1,h2,h3,h4")].find(h=>/Jam Upload Terbaik|Waktu Upload|Upload Terbaik/i.test(h.textContent||""));
  if(!heading) return;
  const host=heading.parentElement; if(!host) return;
  let panel=document.getElementById("vc-market-timing"); if(!panel){panel=document.createElement("div");panel.id="vc-market-timing";panel.className="vc-extra-card";host.appendChild(panel);}
  const niche=selectedNicheName(), global=globalTarget();
  const local={"Anak-anak & Edukasi Keluarga":"15:00–19:00 WIB; akhir pekan 08:00–11:00","Keuangan Pribadi & Bisnis":"11:30–13:30 & 19:00–21:30 WIB","Teknologi & Tools AI":"12:00–14:00 & 19:00–22:00 WIB","Motivasi & Psikologi":"05:30–07:30 & 20:00–22:00 WIB","Kesehatan & Fitness":"05:30–08:00 & 18:00–21:00 WIB","Karier & Produktivitas":"07:00–09:00 & 19:00–21:00 WIB","Properti & Real Estate":"12:00–14:00 & 19:00–21:30 WIB","Otomotif":"12:00–14:00 & 19:00–22:00 WIB","Beauty, Skincare & Fashion":"11:00–13:00 & 19:00–22:00 WIB","Travel, Kuliner & Hospitality":"11:00–14:00 & 19:00–21:30 WIB","Edukasi & Skill Profesional":"15:00–18:00 & 19:00–21:00 WIB"};
  const html=global?`<div class="vc-extra-title">Target Global • ${niche}</div><div style="font-size:12px;line-height:1.6">🇺🇸/🇨🇦 Amerika/Kanada: <b>05:00–10:00 WIB</b> (uji prime time malam mereka).<br>🇬🇧 UK: <b>00:00–05:00 WIB</b>.<br>🇦🇺 Australia timur: <b>14:00–19:00 WIB</b>.<br><span style="color:#94a3b8">Finance, AI, career, software, properti biasanya layak diuji ke pasar CPM lebih tinggi. Gunakan retention/RPM kanal untuk memilih slot final.</span></div>`:`<div class="vc-extra-title">Target Indonesia • ${niche}</div><div style="font-size:12px;line-height:1.6">Rekomendasi awal: <b>${local[niche]||"11:30–13:30 & 19:00–21:30 WIB"}</b>.<br><span style="color:#94a3b8">Jam akan mengikuti niche aktif; validasi lagi dengan analytics kanal Anda.</span></div>`;
  if(panel.dataset.content!==html){panel.innerHTML=html;panel.dataset.content=html;}
}

function historyData(){try{return JSON.parse(localStorage.getItem("viralclip_history")||"[]")}catch{return[]}}
function installHistoryMeta(){
  const entries=historyData(); if(!entries.length) return;
  const headings=[...document.querySelectorAll("h3")];
  entries.forEach(entry=>{
    const title=headings.find(h=>h.textContent?.trim()===entry.sourceUrl); if(!title) return;
    const card=title.parentElement; if(!card||card.querySelector(".vc-history-meta")) return;
    const clips=entry.clips||[]; if(!clips.length) return;
    const box=document.createElement("div");box.className="vc-history-meta";
    clips.forEach((clip,i)=>{const c=document.createElement("div");c.className="vc-history-clip";const tags=Array.isArray(clip.tags)?clip.tags.join(" "):"";c.innerHTML=`<div><span class="vc-score">Score ${Number(clip.score||0)}</span><b>${clip.title||`Clip ${i+1}`}</b></div>${clip.hook?`<div style="font-size:12px;color:#e2e8f0;margin-top:6px"><b>Hook:</b> ${clip.hook}</div>`:""}${clip.caption?`<div style="font-size:12px;color:#cbd5e1;margin-top:5px"><b>Caption:</b> ${clip.caption}</div>`:""}${tags?`<div class="vc-tags" style="margin-top:5px">${tags}</div>`:""}`;box.appendChild(c)});
    card.appendChild(box);
  });
}

setInterval(()=>{try{installSubtitleControls();installTiming();installHistoryMeta();}catch(e){console.warn("[ViralClip] enhancement UI:",e)}},1400);
installSubtitleControls(); installTiming(); installHistoryMeta();
console.info(`[ViralClip] ${RUNTIME_FIX_VERSION} siap`);
