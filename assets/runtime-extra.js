const VC_EXTRA_VERSION = "20261005-extra-v5";
const API = "https://harnet.tail89c9ef.ts.net";
console.info(`[ViralClip] extra ${VC_EXTRA_VERSION}`);

const nativeFetch = window.fetch.bind(window);
const J = (s, fallback = null) => { try { return JSON.parse(s); } catch { return fallback; } };
const readAnalysis = () => J(localStorage.getItem("viralclip_last_analysis"), {}) || {};
const readHistory = () => J(localStorage.getItem("viralclip_history"), []) || [];
const rawSetItem = localStorage.setItem.bind(localStorage);

const KEYS = {
  target: "viralclip_target_market",
  niche: "viralclip_custom_niche",
  words: "viralclip_subtitle_max_words",
  font: "viralclip_subtitle_font",
  style: "viralclip_subtitle_style",
  anim: "viralclip_subtitle_animation"
};

let activeTab = "";

function textOf(el) { return (el?.textContent || "").trim(); }
function visible(el) {
  if (!el) return false;
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
}
function normalizeTab(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("riwayat") || t.includes("history")) return "history";
  if (t.includes("ai clipper") || t.includes("clipper")) return "clipper";
  if (t.includes("cari 10 bahan") || t.includes("bahan")) return "sources";
  if (t.includes("strategi")) return "strategy";
  if (t.includes("roadmap")) return "roadmap";
  return "";
}
function inferTab() {
  if (activeTab) return activeTab;
  const headings = [...document.querySelectorAll("main h1,main h2,main h3")].filter(visible).map(textOf).join(" | ");
  if (/riwayat|history/i.test(headings)) return "history";
  if (/editor\s*&\s*export|ai clipper/i.test(headings)) return "clipper";
  if (/cari 10 bahan|bahan viral/i.test(headings)) return "sources";
  if (/analisis niche|target pasar|strategi/i.test(headings)) return "strategy";
  return "";
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const tab = normalizeTab(textOf(b));
  if (tab) activeTab = tab;

  const t = textOf(b);
  if (/Global\s*\(EN\)/i.test(t)) {
    localStorage.setItem(KEYS.target, "global");
  } else if (/^Indonesia/i.test(t)) {
    localStorage.setItem(KEYS.target, "id");
  }
}, false);

function analysisSegments() {
  const a = readAnalysis();
  return a.segments || a.transcription?.segments || a.data?.segments || [];
}
function clipBounds(body) {
  const c = body.clip || body.selected_clip || body;
  return { start: Number(c.start ?? body.start ?? 0), end: Number(c.end ?? body.end ?? 0) };
}
function segmentsFor(start, end) {
  return analysisSegments().filter(s => Number(s.end ?? s.start) >= start && Number(s.start ?? 0) <= end);
}

window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  const next = { ...init };

  if (url.includes("/api/render-selected") && typeof next.body === "string") {
    try {
      const body = JSON.parse(next.body);
      if (body.subtitles !== false) {
        const { start, end } = clipBounds(body);
        body.subtitles = true;
        body.subtitle_max_words = Number(localStorage.getItem(KEYS.words) || 3);
        body.subtitle_font = localStorage.getItem(KEYS.font) || "DejaVu Sans";
        body.subtitle_style = localStorage.getItem(KEYS.style) || "hormozi";
        body.subtitle_animation = localStorage.getItem(KEYS.anim) || "pop";
        if (!Array.isArray(body.segments) || !body.segments.length) {
          body.segments = segmentsFor(start, end);
        }
        console.info("[ViralClip] render subtitle", { start, end, segments: body.segments.length });
      }
      next.body = JSON.stringify(body);
    } catch (err) {
      console.warn("[ViralClip] gagal memperkaya render request", err);
    }
  }

  const response = await nativeFetch(input, next);

  if ((url.includes("/api/process") || url.includes("/api/analyze-v2")) && response.ok) {
    try {
      const data = await response.clone().json();
      rawSetItem("viralclip_last_analysis", JSON.stringify({ ...readAnalysis(), ...data, _savedAt: Date.now() }));
    } catch {}
  }

  return response;
};

const css = document.createElement("style");
css.textContent = `
.vcx{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;margin:12px 0;color:#e2e8f0;font-family:Inter,system-ui,sans-serif}
.vcx h4{margin:0 0 10px;color:#a5b4fc}.vcx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.vcx-card{background:#020617;border:1px solid #334155;border-radius:12px;padding:12px;color:#e2e8f0}.vcx-row{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
.vcx-row label{font-size:11px;color:#94a3b8;flex:1;min-width:120px}.vcx input,.vcx select{width:100%;background:#020617;border:1px solid #475569;color:#fff;border-radius:8px;padding:8px}
.vcx button,.vcx a{background:#4f46e5;color:white;border:0;border-radius:9px;padding:9px 12px;font-weight:700;text-decoration:none;cursor:pointer}.vcx .danger{background:#b91c1c}
.vcx small{color:#94a3b8;line-height:1.55}.vcx video{width:100%;max-height:380px;background:#000;border-radius:10px;margin:8px 0}.vcx-score{color:#facc15;font-weight:900;font-size:18px}
.vcx-tag{display:inline-block;background:#1e293b;border-radius:99px;padding:4px 8px;margin:2px;font-size:11px}.vcx-kpi{font-size:12px;color:#cbd5e1}
#vcx-toast{position:fixed;right:14px;bottom:14px;z-index:999999;background:#111827;color:#fff;border:1px solid #475569;border-radius:10px;padding:10px 12px;display:none;max-width:360px}
`;
document.head.appendChild(css);

function toast(msg) {
  let e = document.getElementById("vcx-toast");
  if (!e) { e = document.createElement("div"); e.id = "vcx-toast"; document.body.appendChild(e); }
  e.textContent = msg; e.style.display = "block"; clearTimeout(e._t); e._t = setTimeout(() => e.style.display = "none", 3500);
}
function mainHost() { return document.querySelector("main") || document.body; }
function findHeading(pattern) { return [...document.querySelectorAll("main h1,main h2,main h3,main h4")].find(el => visible(el) && pattern.test(textOf(el))); }

const niches = [
  {id:"property",name:"Properti & Real Estate",usd:10,ease:2,viral:3},
  {id:"finance",name:"Keuangan & Bisnis",usd:9.5,ease:3,viral:4},
  {id:"ai",name:"AI, Software & Teknologi",usd:9,ease:4,viral:5},
  {id:"career",name:"Karier & Produktivitas",usd:7.5,ease:5,viral:4},
  {id:"auto",name:"Otomotif",usd:6.5,ease:3,viral:4},
  {id:"health",name:"Kesehatan & Fitness",usd:6.5,ease:4,viral:5},
  {id:"education",name:"Edukasi & Skill Profesional",usd:6,ease:5,viral:4},
  {id:"beauty",name:"Beauty, Skincare & Fashion",usd:5.5,ease:4,viral:5},
  {id:"travel",name:"Travel, Kuliner & Hospitality",usd:4.5,ease:3,viral:5},
  {id:"kids",name:"Anak-anak & Edukasi Keluarga",usd:3.5,ease:3,viral:4}
];
function nicheScore(n) { return Math.round(n.usd/10*55 + n.ease/5*25 + n.viral/5*20); }
function currentNiche() { return localStorage.getItem(KEYS.niche) || "ai"; }
function currentTarget() { return localStorage.getItem(KEYS.target) || "id"; }
function bestMarket() {
  const n = niches.find(x => x.id === currentNiche()) || niches[2];
  if (n.usd >= 7.5) return { market:"US/Canada + UK", why:"CPM/RPM cenderung lebih tinggi untuk niche ini", slot:"US/Canada 05:00–10:00 WIB • UK 00:00–05:00 WIB" };
  return currentTarget() === "global"
    ? { market:"Global", why:"target Global dipilih", slot:"Australia timur 14:00–19:00 WIB • US/Canada 05:00–10:00 WIB" }
    : { market:"Indonesia", why:"bahasa dan pasar lokal lebih natural", slot:"11:30–13:30 & 19:00–21:30 WIB" };
}
function timing() {
  if (currentTarget() === "global") return bestMarket().slot;
  const n = currentNiche();
  if (n === "kids") return "15:00–19:00 WIB; akhir pekan 08:00–11:00 WIB";
  if (n === "health") return "05:30–08:00 atau 18:00–21:00 WIB";
  if (["finance","career","ai"].includes(n)) return "07:00–09:00 atau 19:00–21:00 WIB";
  return "11:30–13:30 & 19:00–21:30 WIB";
}
function tagsFor(niche, global) {
  const map = {finance:["#Finance","#MoneyTips","#Business"],ai:["#AI","#AITools","#Tech"],career:["#Career","#Productivity","#Success"],property:["#RealEstate","#Property","#Investment"],health:["#Fitness","#Health","#HealthyLife"],kids:["#KidsLearning","#Parenting","#Education"],travel:["#Travel","#Food","#HiddenGem"],beauty:["#Beauty","#Skincare","#Fashion"],auto:["#Automotive","#Cars","#Motor"],education:["#Education","#Skills","#Learning"]};
  const base = map[niche] || ["#Viral","#Shorts","#Reels"];
  return [...base, global ? "#Shorts" : "#FYP", "#Reels"];
}
function textFromSegments(segs) { return segs.map(s => s.text || "").join(" ").replace(/\s+/g," ").trim(); }
function suggestFromRange(start,end) {
  const segs = segmentsFor(start,end), text = textFromSegments(segs);
  const words = text.split(/\s+/).filter(Boolean);
  const title = words.slice(0, Math.min(10,words.length)).join(" ") || "Clip pilihan Anda";
  let score = 72;
  if (/\?/.test(text)) score += 4;
  if (/\b\d+(?:[.,]\d+)?\b/.test(text)) score += 4;
  if (/rahasia|ternyata|jangan|penting|kesalahan|cara|tips|fakta|kunci|gagal|berhasil/i.test(text)) score += 8;
  score = Math.min(96,score);
  const caption = text ? `${text.slice(0,180)}${text.length>180?"…":""}` : "Potongan pilihan dari video utama.";
  return { score, title, caption, tags: tagsFor(currentNiche(), currentTarget()==="global"), market: bestMarket(), segs };
}
function metaHTML(c) {
  const tags = Array.isArray(c.tags) ? c.tags : [];
  const market = c.market || bestMarket();
  return `<div class="vcx-score">Score ${c.score ?? "-"}</div>
    <b>${c.title || "Saran judul belum tersedia"}</b>
    <div><small><b>Caption:</b> ${c.caption || "-"}</small></div>
    <div>${tags.map(t=>`<span class="vcx-tag">${t}</span>`).join("")}</div>
    <div class="vcx-card" style="margin-top:8px"><b>🎯 Target terbaik</b><br><small>${market.market} — ${market.why}</small></div>
    <div class="vcx-card" style="margin-top:8px"><b>🕒 Saran upload</b><br><small>${market.slot || timing()}</small></div>
    <div class="vcx-card" style="margin-top:8px"><b>🛡️ Editing & hak cipta</b><br><small>Tambahkan komentar/analisis/voice-over, subtitle, reframing, B-roll dan konteks baru. Ini meningkatkan transformasi tetapi tidak menjamin bebas Content ID. Prioritaskan konten sendiri, izin, CC sesuai syarat, atau public domain.</small></div>`;
}

function installNicheAnalysis() {
  if (inferTab() !== "strategy") { document.getElementById("vcx-niche")?.remove(); return; }
  if (document.getElementById("vcx-niche")) return;
  const heading = findHeading(/Analisis Niche|Target Pasar|Strategi/i);
  if (!heading) return;
  const box = document.createElement("div"); box.id="vcx-niche"; box.className="vcx";
  box.innerHTML = `<h4>💵 Analisis Potensi Niche</h4><small>Ranking menggabungkan potensi dolar, kemudahan produksi dan potensi viral. Bukan jaminan pendapatan.</small><div class="vcx-grid" style="margin-top:10px">${[...niches].sort((a,b)=>nicheScore(b)-nicheScore(a)).map(n=>`<button class="vcx-card" data-vcn="${n.id}" style="text-align:left"><b>${n.name}</b><br><span class="vcx-score">${nicheScore(n)}/100</span><br><small>Potensi $ ${n.usd}/10 • Mudah ${n.ease}/5 • Viral ${n.viral}/5</small></button>`).join("")}</div>`;
  box.addEventListener("click", e => { const b=e.target.closest("[data-vcn]"); if(!b)return; localStorage.setItem(KEYS.niche,b.dataset.vcn); toast(`Niche aktif: ${niches.find(n=>n.id===b.dataset.vcn)?.name}`); });
  heading.parentElement.appendChild(box);
}

function installSubtitleControls() {
  if (inferTab() !== "clipper") { document.getElementById("vcx-sub")?.remove(); return; }
  if (document.getElementById("vcx-sub")) return;
  const heading = findHeading(/Editor\s*&\s*Export|AI Clipper/i); if(!heading)return;
  const box=document.createElement("div"); box.id="vcx-sub"; box.className="vcx";
  box.innerHTML=`<h4>💬 Subtitle Export</h4><div class="vcx-row">
    <label>Maks kata/frame<select id="sw">${[1,2,3,4,5,6].map(x=>`<option>${x}</option>`).join("")}</select></label>
    <label>Font<select id="sf"><option>DejaVu Sans</option><option>Liberation Sans</option><option>Arial</option></select></label>
    <label>Gaya<select id="ss"><option value="hormozi">Hormozi Kuning</option><option value="minimal">Minimal Putih</option><option value="mrbeast">MrBeast Pop</option></select></label>
    <label>Animasi<select id="sa"><option value="pop">Pop</option><option value="fade">Fade</option><option value="none">Tanpa animasi</option></select></label></div>
    <small>Saat Subtitle aktif, transcript segment otomatis ikut dikirim agar subtitle dibakar ke MP4.</small>`;
  heading.parentElement.appendChild(box);
  [["sw",KEYS.words,"3"],["sf",KEYS.font,"DejaVu Sans"],["ss",KEYS.style,"hormozi"],["sa",KEYS.anim,"pop"]].forEach(([id,key,def])=>{const e=box.querySelector(`#${id}`);e.value=localStorage.getItem(key)||def;e.onchange=()=>localStorage.setItem(key,e.value);});
}

function sourceUrl() { const a=readAnalysis(); return a.video_url || a.url || a.sourceUrl || a.metadata?.url || ""; }
async function manualRender() {
  const s=Number(document.getElementById("trimS")?.value), e=Number(document.getElementById("trimE")?.value), sub=!!document.getElementById("trimSub")?.checked, url=sourceUrl();
  if(!url)return toast("Proses video utama dulu agar URL tersedia.");
  if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s||e-s>60)return toast("Timestamp tidak valid. Maksimal 60 detik per clip.");
  const sug=suggestFromRange(s,e), btn=document.getElementById("trimGo"); btn.disabled=true;btn.textContent="Rendering…";
  try{
    const r=await fetch(`${API}/api/render-selected`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({video_url:url,start:s,end:e,hook:sug.title,segments:sug.segs,subtitles:sub,cleanup_source:false,framing_mode:"auto_face"})});
    const d=await r.json(); if(!r.ok)throw Error(d.detail||d.error||`HTTP ${r.status}`);
    const job=d.job_id||d.render_job_id; document.getElementById("trimOut").innerHTML=`<video controls playsinline src="${API}/api/render/video/${encodeURIComponent(job)}"></video>${metaHTML(sug)}<a href="${API}/api/render/download/${encodeURIComponent(job)}">Unduh MP4</a>`;
    toast("Potongan manual selesai");
  }catch(err){toast(`Render gagal: ${err.message}`)}finally{btn.disabled=false;btn.textContent="Potong & Render"}
}
function installTrim() {
  if (inferTab() !== "clipper") { document.getElementById("vcx-trim")?.remove(); return; }
  if (document.getElementById("vcx-trim")) return;
  const heading=findHeading(/Editor\s*&\s*Export|AI Clipper/i); if(!heading)return;
  const box=document.createElement("div");box.id="vcx-trim";box.className="vcx";
  box.innerHTML=`<h4>✂️ Potong Manual Video Utama</h4><div class="vcx-row"><label>Mulai (detik)<input id="trimS" type="number" step=".1" value="0"></label><label>Selesai (detik)<input id="trimE" type="number" step=".1" value="30"></label><label style="flex:0 0 110px">Subtitle<input id="trimSub" type="checkbox" checked></label><button id="trimGo">Potong & Render</button></div><small>Fitur lama tetap ada. Hasil manual mendapat score, caption, tagar, target pasar dan jam upload otomatis.</small><div id="trimOut"></div>`;
  heading.parentElement.appendChild(box);box.querySelector("#trimGo").onclick=manualRender;
}

function jobId(c){if(c?.render_job_id)return c.render_job_id;const m=String(c?.video_url||c?.download_url||"").match(/\/api\/render\/(?:video|download)\/([^/?#]+)/);return m?decodeURIComponent(m[1]):""}
function enrichClip(c){
  const a=readAnalysis(), list=a.clips||a.analysis?.clips||[];
  const match=list.find(x=>(c?.id!=null&&x.id!=null&&String(c.id)===String(x.id)) || Math.abs(Number(c?.start||0)-Number(x.start||999999))<2);
  return match?{...match,...c,score:c.score??match.score,title:c.title||match.title,caption:c.caption||match.caption,tags:c.tags?.length?c.tags:match.tags}:c||{};
}
rawSetItem("viralclip_history", JSON.stringify(readHistory()));

async function deleteEntry(entry){
  const ids=(entry.clips||[]).map(jobId).filter(Boolean);
  try{if(ids.length)await fetch(`${API}/api/render/cleanup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:ids})});}catch{}
  const next=readHistory().filter(x=>String(x.id)!==String(entry.id));rawSetItem("viralclip_history",JSON.stringify(next));document.getElementById("vcx-history")?.remove();renderHistory();toast("Riwayat dihapus");
}
function renderHistory(){
  if(inferTab()!=="history"){document.getElementById("vcx-history")?.remove();return;}
  if(document.getElementById("vcx-history"))return;
  const heading=findHeading(/^\s*(Riwayat|History)/i); if(!heading)return;
  const list=readHistory().map(e=>({...e,clips:(e.clips||[]).map(enrichClip)}));
  const box=document.createElement("div");box.id="vcx-history";box.className="vcx";
  box.innerHTML=`<h4>🕘 Riwayat Lengkap</h4>${list.length?list.map((entry,i)=>`<div class="vcx-card" style="margin:10px 0"><div class="vcx-row"><b>${entry.title||entry.sourceUrl||`Video ${i+1}`}</b><button class="danger" data-del="${i}">Hapus Riwayat + File</button></div>${(entry.clips||[]).map(c=>{const j=jobId(c);return `<div class="vcx-card" style="margin-top:10px">${j?`<video controls playsinline preload="metadata" src="${API}/api/render/video/${encodeURIComponent(j)}"></video>`:""}${metaHTML(c)}</div>`}).join("")}</div>`).join(""):"<small>Belum ada hasil render.</small>"}`;
  box.addEventListener("click",e=>{const b=e.target.closest("[data-del]");if(b)deleteEntry(list[Number(b.dataset.del)]);});
  heading.parentElement.appendChild(box);
}

function enrichExport(){
  if(inferTab()!=="clipper")return;
  const a=readAnalysis(),clips=a.clips||a.analysis?.clips||[];
  [...document.querySelectorAll('a[href*="/api/render/download/"]')].forEach((link,i)=>{
    const card=link.closest("div.rounded-xl,div.rounded-2xl,div.border")||link.parentElement;if(!card||card.querySelector(".vcx-export-meta"))return;
    const d=document.createElement("div");d.className="vcx vcx-export-meta";d.innerHTML=metaHTML(enrichClip(clips[i]||{}));card.appendChild(d);
  });
}

function tick(){
  try{installNicheAnalysis();installSubtitleControls();installTrim();renderHistory();enrichExport();}
  catch(err){console.warn("[ViralClip] extra tick",err)}
}
setInterval(tick,900);setTimeout(tick,250);
