const VC_GUARD_VERSION = "20261005-guard-v1";
const VC_API = "https://harnet.tail89c9ef.ts.net";
console.info(`[ViralClip] guard ${VC_GUARD_VERSION}`);

const innerFetch = window.fetch.bind(window);
const rawSet = localStorage.setItem.bind(localStorage);
const parseJSON = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };

const NICHE = {
  finance: {
    name: "Keuangan & Bisnis",
    query: "keuangan bisnis investasi entrepreneur financial literacy money business 2026 viral terbaru",
    alt: "finance business investing money podcast 2026 trending",
    relevant: /keuangan|bisnis|uang|invest|finance|financial|money|business|entrepreneur|ekonomi|profit|usaha/i
  },
  ai: {
    name: "AI, Software & Teknologi",
    query: "AI tools software teknologi artificial intelligence 2026 viral terbaru",
    alt: "artificial intelligence software AI tools technology 2026 trending",
    relevant: /\bai\b|artificial intelligence|software|teknologi|technology|tool|chatgpt|gemini|automation|coding|robot/i
  },
  career: {
    name: "Karier & Produktivitas",
    query: "karier produktivitas interview skill kerja career productivity 2026 viral terbaru",
    alt: "career productivity interview professional skills 2026 trending",
    relevant: /karier|career|produktif|productivity|interview|kerja|profesional|skill|leadership|work/i
  },
  property: {
    name: "Properti & Real Estate",
    query: "properti rumah real estate investasi properti renovasi 2026 viral terbaru",
    alt: "real estate property house renovation investment 2026 trending",
    relevant: /properti|property|real estate|rumah|house|renovasi|renovation|mortgage|developer|apartemen/i
  },
  health: {
    name: "Kesehatan & Fitness",
    query: "fitness kesehatan olahraga nutrisi workout health 2026 viral terbaru",
    alt: "fitness health workout nutrition healthy habits 2026 trending",
    relevant: /fitness|kesehatan|health|olahraga|workout|nutrisi|nutrition|gym|healthy|diet|exercise/i
  },
  education: {
    name: "Edukasi & Skill Profesional",
    query: "edukasi belajar tutorial skill profesional education 2026 viral terbaru",
    alt: "education tutorial professional skills learning 2026 trending",
    relevant: /edukasi|education|belajar|learning|tutorial|skill|kursus|course|bahasa|coding|desain/i
  },
  auto: {
    name: "Otomotif",
    query: "otomotif mobil motor review kendaraan automotive 2026 viral terbaru",
    alt: "automotive car motorcycle review 2026 trending",
    relevant: /otomotif|automotive|mobil|motor|car|cars|motorcycle|kendaraan|vehicle|review|mesin/i
  },
  beauty: {
    name: "Beauty, Skincare & Fashion",
    query: "beauty skincare fashion makeup 2026 viral terbaru",
    alt: "beauty skincare makeup fashion 2026 trending",
    relevant: /beauty|skincare|fashion|makeup|kosmetik|cosmetic|outfit|style|serum|skin/i
  },
  travel: {
    name: "Travel, Kuliner & Hospitality",
    query: "travel wisata kuliner hotel itinerary hidden gem 2026 viral terbaru",
    alt: "travel food hotel tourism hidden gem 2026 trending",
    relevant: /travel|wisata|kuliner|food|hotel|itinerary|hidden gem|tourism|restoran|restaurant|vacation/i
  },
  kids: {
    name: "Anak-anak & Edukasi Keluarga",
    query: "edukasi anak belajar anak kartun cerita anak kids learning family 2026 viral terbaru",
    alt: "kids learning children education family cartoon story 2026 trending",
    relevant: /anak|kids|children|kartun|cartoon|belajar|learning|edukasi|education|cerita|story|family|keluarga|parenting|balita|bayi/i,
    banned: /politik|pemilu|presiden|menteri|partai|dpr|gubernur|pilkada|kampanye|prabowo|jokowi|anies|ganjar|parlemen|kabinet|election|politic/i
  },
  motivation: {
    name: "Motivasi & Psikologi",
    query: "motivasi psikologi mindset self improvement 2026 viral terbaru",
    alt: "motivation psychology mindset self improvement 2026 trending",
    relevant: /motivasi|motivation|psikologi|psychology|mindset|self improvement|mental|habit|kebiasaan|percaya diri/i
  }
};

function cleanText(el) {
  return String(el?.textContent || "").replace(/\s+/g, " ").trim();
}

function nicheFromText(text) {
  const t = String(text || "").toLowerCase();
  if (/anak|kids|keluarga|parenting/.test(t)) return "kids";
  if (/keuangan|finance|bisnis|investasi|uang/.test(t)) return "finance";
  if (/\bai\b|artificial|software|teknologi/.test(t)) return "ai";
  if (/karier|career|produktivitas|produktif/.test(t)) return "career";
  if (/properti|property|real estate/.test(t)) return "property";
  if (/kesehatan|fitness|health|nutrisi/.test(t)) return "health";
  if (/otomotif|automotive|mobil|motor/.test(t)) return "auto";
  if (/beauty|skincare|fashion|makeup/.test(t)) return "beauty";
  if (/travel|wisata|kuliner|hospitality|hotel/.test(t)) return "travel";
  if (/motivasi|psikologi|psychology|self improvement/.test(t)) return "motivation";
  if (/edukasi|education|skill profesional|belajar/.test(t)) return "education";
  return "";
}

function pageFromText(text) {
  const t = String(text || "").toLowerCase();
  if (/riwayat|history/.test(t)) return "history";
  if (/ai clipper|clipper|editor|export/.test(t)) return "clipper";
  if (/cari 10|bahan viral|rekomendasi video|sumber/.test(t)) return "sources";
  if (/analisis niche|target pasar|strategi/.test(t)) return "strategy";
  if (/roadmap/.test(t)) return "roadmap";
  if (/dashboard|home|beranda/.test(t)) return "home";
  return "";
}

function setPage(page) {
  if (!page) return;
  sessionStorage.setItem("viralclip_active_tab", page);
  if (page !== "history") removeHistoryDashboard();
  else {
    setTimeout(renderHistoryDashboard, 80);
    setTimeout(renderHistoryDashboard, 300);
    setTimeout(renderHistoryDashboard, 700);
  }
}

function visible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
}

function visiblePageHeading() {
  const headings = [...document.querySelectorAll("main h1, main h2, main h3")].filter(visible);
  for (const h of headings) {
    const page = pageFromText(cleanText(h));
    if (page) return page;
  }
  return "";
}

document.addEventListener("click", (event) => {
  const control = event.target.closest("button,a,[role='button']");
  if (!control) return;
  const text = cleanText(control);

  const niche = nicheFromText(text);
  if (niche && NICHE[niche]) {
    rawSet("viralclip_custom_niche", niche);
    rawSet("viralclip_custom_niche_name", NICHE[niche].name);
  }

  const page = pageFromText(text);
  const looksLikeNav = !!control.closest("nav,aside,header") || /riwayat|history|clipper|cari 10|bahan viral|analisis niche|target pasar|strategi|roadmap|dashboard|home|beranda/i.test(text);
  if (page && looksLikeNav) setPage(page);
}, false);

/* Hanya niche bawaan yang ditampilkan. Panel tambahan lama selalu disembunyikan. */
const style = document.createElement("style");
style.textContent = `
#vcx-niche,#vcx-history{display:none!important}
#vc-history-dashboard{margin:16px 0;color:#e5e7eb;font-family:Inter,system-ui,sans-serif}
#vc-history-dashboard .vh-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
#vc-history-dashboard .vh-title{font-size:20px;font-weight:900;color:#fff}.vh-muted{font-size:12px;color:#94a3b8}
#vc-history-dashboard .vh-entry{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;margin:12px 0}
#vc-history-dashboard .vh-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.vh-name{font-weight:800;color:#fff;word-break:break-word}
#vc-history-dashboard .vh-clip{background:#020617;border:1px solid #1e293b;border-radius:12px;padding:12px;margin-top:10px}
#vc-history-dashboard .vh-score{display:inline-block;background:#422006;color:#fde68a;border:1px solid #92400e;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900}
#vc-history-dashboard .vh-label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-top:9px}.vh-value{color:#e2e8f0;line-height:1.45}
#vc-history-dashboard .vh-tag{display:inline-block;background:#1e293b;color:#cbd5e1;border-radius:999px;padding:4px 8px;margin:2px;font-size:11px}
#vc-history-dashboard .vh-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.vh-box{background:#111827;border:1px solid #273449;border-radius:10px;padding:9px;font-size:12px;color:#cbd5e1}
#vc-history-dashboard button,#vc-history-dashboard a{border:0;border-radius:9px;padding:8px 11px;font-weight:800;text-decoration:none;display:inline-block;cursor:pointer}.vh-delete,.vh-delete-all{background:#991b1b;color:#fff}.vh-download{background:#4f46e5;color:#fff;margin-top:10px}.vh-empty{background:#0f172a;border:1px dashed #475569;border-radius:14px;padding:22px;text-align:center;color:#94a3b8}
@media(max-width:700px){#vc-history-dashboard .vh-info{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

function historyData() {
  return parseJSON(localStorage.getItem("viralclip_history"), []) || [];
}

function jobId(clip) {
  if (clip?.render_job_id) return clip.render_job_id;
  const raw = String(clip?.video_url || clip?.download_url || "");
  const match = raw.match(/\/api\/render\/(?:video|download)\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]));
}

function defaultMarket() {
  const niche = localStorage.getItem("viralclip_custom_niche") || "ai";
  const target = localStorage.getItem("viralclip_target_market") || "id";
  if (["finance","ai","career","property"].includes(niche)) {
    return { market:"US/Canada + UK", slot:"US/Canada 05:00–10:00 WIB • UK 00:00–05:00 WIB" };
  }
  if (target === "global") return { market:"Global", slot:"Australia 14:00–19:00 WIB • US/Canada 05:00–10:00 WIB" };
  return { market:"Indonesia", slot:"11:30–13:30 & 19:00–21:30 WIB" };
}

function clipHTML(clip) {
  const tags = Array.isArray(clip?.tags) ? clip.tags : [];
  const market = clip?.target_market || defaultMarket().market;
  const slot = clip?.upload_time || defaultMarket().slot;
  const id = jobId(clip);
  const download = id ? `${VC_API}/api/render/download/${encodeURIComponent(id)}` : String(clip?.download_url || "");
  return `<div class="vh-clip">
    <div class="vh-score">Score ${esc(clip?.score ?? "-")}</div>
    <div class="vh-label">Saran Judul</div><div class="vh-value"><b>${esc(clip?.title || "Belum tersedia")}</b></div>
    <div class="vh-label">Caption</div><div class="vh-value">${esc(clip?.caption || "Belum tersedia")}</div>
    <div class="vh-label">Saran Tagar</div><div>${tags.length ? tags.map(t=>`<span class="vh-tag">${esc(t)}</span>`).join("") : `<span class="vh-tag">Belum tersedia</span>`}</div>
    <div class="vh-info"><div class="vh-box"><b>🎯 Target pasar</b><br>${esc(market)}</div><div class="vh-box"><b>🕒 Saran upload</b><br>${esc(slot)}</div></div>
    ${clip?.manual ? `<div class="vh-label">Jenis</div><div class="vh-value">✂️ Manual Trim</div>` : ""}
    ${download ? `<a class="vh-download" href="${esc(download)}">Unduh MP4</a>` : ""}
  </div>`;
}

function historyHeading() {
  return [...document.querySelectorAll("main h1,main h2,main h3,main h4")].find(el => visible(el) && /^\s*(riwayat|history)(\s|$)/i.test(cleanText(el))) || null;
}

function restoreNativeHistory() {
  document.querySelectorAll('[data-vh-hidden="1"]').forEach(el => {
    el.style.display = el.dataset.vhOldDisplay || "";
    delete el.dataset.vhHidden;
    delete el.dataset.vhOldDisplay;
  });
}

function removeHistoryDashboard() {
  document.getElementById("vc-history-dashboard")?.remove();
  restoreNativeHistory();
}

function hideNativeHistory(panel, heading) {
  if (!heading?.parentElement) return;
  const parent = heading.parentElement;
  [...parent.children].forEach(child => {
    if (child === panel || child === heading || child.contains(panel)) return;
    if (!child.dataset.vhHidden) child.dataset.vhOldDisplay = child.style.display || "";
    child.dataset.vhHidden = "1";
    child.style.display = "none";
  });
}

async function cleanupJobs(ids) {
  if (!ids.length) return;
  try {
    await innerFetch(`${VC_API}/api/render/cleanup`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({job_ids:ids})
    });
  } catch {}
}

async function deleteHistoryIndex(index) {
  const list = historyData();
  const entry = list[index];
  if (!entry) return;
  await cleanupJobs((entry.clips || []).map(jobId).filter(Boolean));
  list.splice(index,1);
  rawSet("viralclip_history", JSON.stringify(list));
  renderHistoryDashboard();
}

async function deleteAllHistory() {
  const list = historyData();
  await cleanupJobs(list.flatMap(entry => (entry.clips || []).map(jobId)).filter(Boolean));
  rawSet("viralclip_history", "[]");
  renderHistoryDashboard();
}

function renderHistoryDashboard() {
  if (sessionStorage.getItem("viralclip_active_tab") !== "history") {
    removeHistoryDashboard();
    return;
  }
  const heading = historyHeading();
  const mount = heading?.parentElement || document.querySelector("main") || document.body;
  let panel = document.getElementById("vc-history-dashboard");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "vc-history-dashboard";
    if (heading) heading.insertAdjacentElement("afterend", panel);
    else mount.prepend(panel);
  }
  const list = historyData();
  panel.innerHTML = `<div class="vh-head"><div><div class="vh-title">Riwayat Lengkap</div><div class="vh-muted">${list.length} hasil video tersimpan</div></div>${list.length ? `<button class="vh-delete-all" data-vh-all>Hapus Semua</button>` : ""}</div>
    ${list.length ? list.map((entry,index)=>`<article class="vh-entry"><div class="vh-top"><div><div class="vh-name">${esc(entry.title || entry.sourceUrl || `Video ${index+1}`)}</div><div class="vh-muted">${esc(entry.createdAt ? new Date(entry.createdAt).toLocaleString("id-ID") : "")}</div></div><button class="vh-delete" data-vh-del="${index}">Hapus</button></div>${(entry.clips || []).map(clipHTML).join("") || `<div class="vh-empty">Belum ada clip tersimpan.</div>`}</article>`).join("") : `<div class="vh-empty">Belum ada hasil render di riwayat.</div>`}`;
  panel.onclick = event => {
    const one = event.target.closest("[data-vh-del]");
    if (one) deleteHistoryIndex(Number(one.dataset.vhDel));
    if (event.target.closest("[data-vh-all]")) deleteAllHistory();
  };
  hideNativeHistory(panel, heading);
}

/* Sinkronkan state tab dengan halaman React yang benar-benar terlihat. */
setInterval(() => {
  const visiblePage = visiblePageHeading();
  const active = sessionStorage.getItem("viralclip_active_tab") || "";
  if (visiblePage && visiblePage !== active) {
    sessionStorage.setItem("viralclip_active_tab", visiblePage);
  }
  const now = sessionStorage.getItem("viralclip_active_tab") || "";
  if (now === "history") renderHistoryDashboard();
  else removeHistoryDashboard();
  document.getElementById("vcx-niche")?.remove();
  document.getElementById("vcx-history")?.remove();
}, 600);

/* Rekomendasi 10 video selalu mengikuti niche yang dipilih. */
function relevanceScore(item, mode) {
  const cfg = NICHE[mode];
  if (!cfg) return 0;
  const title = String(item?.title || "");
  const channel = String(item?.channel || "");
  const all = `${title} ${channel}`;
  if (cfg.banned && cfg.banned.test(all)) return -100;
  let score = 0;
  if (cfg.relevant.test(title)) score += 4;
  if (cfg.relevant.test(channel)) score += 1;
  return score;
}

function dedupeAndRank(items, mode) {
  const seen = new Set();
  return (items || [])
    .filter(Boolean)
    .map(item => ({item, rel:relevanceScore(item,mode)}))
    .filter(x => x.rel >= 2)
    .sort((a,b) => (b.rel-a.rel) || (Number(b.item.views||0)-Number(a.item.views||0)))
    .map(x => x.item)
    .filter(item => {
      const key = String(item.id || item.url || `${item.title}|${item.channel}`).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function fetchSources(url, input, init) {
  let mode = localStorage.getItem("viralclip_custom_niche") || "";
  let originalQuery = "";
  let firstUrl = url;
  try {
    const parsed = new URL(url, location.href);
    originalQuery = parsed.searchParams.get("query") || "";
    if (!mode) mode = nicheFromText(originalQuery);
    if (mode && NICHE[mode]) parsed.searchParams.set("query", NICHE[mode].query);
    parsed.searchParams.set("refresh", String(Date.now()));
    firstUrl = parsed.toString();
  } catch {}

  const firstInput = typeof input === "string" ? firstUrl : new Request(firstUrl, input);
  const first = await innerFetch(firstInput, init);
  if (!first.ok || !mode || !NICHE[mode]) return first;

  let firstData;
  try { firstData = await first.clone().json(); } catch { return first; }
  let pool = Array.isArray(firstData?.items) ? [...firstData.items] : [];
  let ranked = dedupeAndRank(pool, mode);

  if (ranked.length < 10) {
    try {
      const secondUrl = new URL(firstUrl, location.href);
      secondUrl.searchParams.set("query", NICHE[mode].alt);
      secondUrl.searchParams.set("refresh", String(Date.now()+1));
      const second = await innerFetch(secondUrl.toString(), init);
      if (second.ok) {
        const data2 = await second.json();
        if (Array.isArray(data2?.items)) pool.push(...data2.items);
        ranked = dedupeAndRank(pool, mode);
      }
    } catch {}
  }

  firstData.items = ranked.slice(0,10);
  firstData.query = NICHE[mode].query;
  firstData.niche_filter = mode;
  firstData.niche_name = NICHE[mode].name;
  firstData.original_query = originalQuery;
  return new Response(JSON.stringify(firstData), {
    status:first.status,
    statusText:first.statusText,
    headers:{"Content-Type":"application/json"}
  });
}

window.fetch = async (input, init={}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (url.includes("/api/sources?")) return fetchSources(url,input,init);
  return innerFetch(input,init);
};

/* Bersihkan state riwayat lama saat boot jika halaman lain sedang terlihat. */
setTimeout(() => {
  const page = visiblePageHeading();
  if (page) sessionStorage.setItem("viralclip_active_tab", page);
  if (page !== "history") removeHistoryDashboard();
}, 300);
