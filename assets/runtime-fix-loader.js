const RUNTIME_FIX_VERSION = "20261004-feature-v4";
console.info(`[ViralClip] runtime loader ${RUNTIME_FIX_VERSION}`);

const API_BASE = "https://harnet.tail89c9ef.ts.net";
const bundleUrl = `/viralclip-web/assets/index-DK5reAhc.js?v=${RUNTIME_FIX_VERSION}`;

const getSetting = (key, fallback) => localStorage.getItem(`viralclip_${key}`) || fallback;
const setSetting = (key, value) => localStorage.setItem(`viralclip_${key}`, String(value));

/* Inject render settings into the existing production request without changing React internals. */
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  let url = typeof input === "string" ? input : input?.url || "";
  let nextInput = input;
  let nextInit = { ...init };

  if (url.includes("/api/render-selected") && typeof nextInit.body === "string") {
    try {
      const body = JSON.parse(nextInit.body);
      body.subtitle_max_words = Number(getSetting("subtitle_max_words", "3"));
      body.subtitle_font = getSetting("subtitle_font", "DejaVu Sans");
      body.subtitle_style = getSetting("subtitle_style", "hormozi");
      body.subtitle_animation = getSetting("subtitle_animation", "pop");
      nextInit.body = JSON.stringify(body);
    } catch (error) {
      console.warn("[ViralClip] gagal menambahkan setting subtitle:", error);
    }
  }

  if (url.includes("/api/sources?") && !url.includes("refresh=")) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}refresh=${Date.now()}`;
    if (typeof input === "string") nextInput = url;
    else nextInput = new Request(url, input);
  }

  return nativeFetch(nextInput, nextInit);
};

const response = await nativeFetch(bundleUrl, { cache: "no-store" });
if (!response.ok) {
  throw new Error(`Gagal memuat bundle ViralClip: HTTP ${response.status}`);
}

let code = await response.text();

const requiredPatches = [
  [
    'let t=await fetch("https://harnet.tail89c9ef.ts.net/api/process",',
    'let response=await fetch("https://harnet.tail89c9ef.ts.net/api/process",'
  ],
  [
    'if(!t.ok){let e=await t.text();throw Error("HTTP "+t.status+": "+e.slice(0,500))}d(2);let n=await t.json();',
    'if(!response.ok){let e=await response.text();throw Error("HTTP "+response.status+": "+e.slice(0,500))}d(2);let n=await response.json();'
  ],
  [
    'let t=f.filter(e=>m.includes(e.id)),r=[];for(let n=0;n<t.length;n++){let a=t[n],',
    'let selected=f.filter(e=>m.includes(e.id)),r=[];for(let n=0;n<selected.length;n++){let a=selected[n],'
  ],
  [
    'cleanup_source:n===t.length-1',
    'cleanup_source:n===selected.length-1'
  ],
  [
    '`Render `,m.length,` Clip`]})})]})]})(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`,children:[`Estimasi render: `',
    '`Render `,m.length,` Clip`]})})]})]}),(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`,children:[`Estimasi render: `'
  ]
];

let applied = 0;
for (const [from, to] of requiredPatches) {
  const first = code.indexOf(from);
  const last = code.lastIndexOf(from);
  if (first === -1) throw new Error(`Runtime patch gagal: pola tidak ditemukan: ${from.slice(0, 80)}`);
  if (first !== last) throw new Error(`Runtime patch dibatalkan: pola tidak unik: ${from.slice(0, 80)}`);
  code = code.replace(from, to);
  applied += 1;
}

/* Keep render_job_id in History so server files can be cleaned up later. */
const historyFrom = 'video_url:e.video_url,download_url:e.download_url}))}';
const historyTo = 'video_url:e.video_url,download_url:e.download_url,render_job_id:e.render_job_id}))}';
if (code.includes(historyFrom)) {
  code = code.replace(historyFrom, historyTo);
  applied += 1;
}

/* Force a fresh source query on every visit/search. */
const sourceFrom = '`https://harnet.tail89c9ef.ts.net/api/sources?query=${encodeURIComponent(e)}`';
const sourceTo = '`https://harnet.tail89c9ef.ts.net/api/sources?query=${encodeURIComponent(e)}&refresh=${Date.now()}`';
if (code.includes(sourceFrom)) {
  code = code.replace(sourceFrom, sourceTo);
  applied += 1;
}

/* Add more niche choices without rebuilding the old local source tree. */
const nicheAnchor = 'ideas:`Cara berhenti malas dalam 1 menit, aturan 5 detik, dark psychology.`}],Ke=';
if (code.includes(nicheAnchor)) {
  const extraNiches = `ideas:\`Cara berhenti malas dalam 1 menit, aturan 5 detik, dark psychology.\`},
{id:\`health_fitness\`,name:\`Kesehatan & Fitness\`,cpm:\`Rp 25rb - Rp 80rb (Lokal) | $8 - $22 (Intl)\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Fitness, nutrisi umum, kebiasaan sehat, dan edukasi kebugaran. Hindari klaim medis yang tidak terverifikasi.\`,domesticExample:\`Fitness Indonesia, edukasi nutrisi\`,intlExample:\`Jeff Nippard, Renaissance Periodization\`,ideas:\`Kesalahan latihan pemula, kebiasaan sehat, tips konsistensi olahraga.\`},
{id:\`career\`,name:\`Karier, Produktivitas & Profesional\`,cpm:\`Rp 30rb - Rp 90rb (Lokal) | $10 - $28 (Intl)\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Karier, skill kerja, produktivitas, interview, dan pengembangan profesional.\`,domesticExample:\`Konten karier Indonesia\`,intlExample:\`Ali Abdaal, career creators\`,ideas:\`Tips interview, skill bernilai tinggi, cara kerja lebih fokus.\`},
{id:\`property\`,name:\`Properti & Real Estate\`,cpm:\`Rp 45rb - Rp 140rb (Lokal) | $12 - $35 (Intl)\`,difficulty:\`Sulit\`,viralPotential:\`Menengah-Tinggi\`,description:\`Rumah, investasi properti, desain, renovasi, dan edukasi pembelian properti.\`,domesticExample:\`Review properti Indonesia\`,intlExample:\`Real estate creators\`,ideas:\`Kesalahan beli rumah, makeover, hitung biaya properti.\`},
{id:\`automotive\`,name:\`Otomotif\`,cpm:\`Rp 25rb - Rp 80rb (Lokal) | $7 - $20 (Intl)\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Review mobil/motor, teknologi kendaraan, perawatan, dan perbandingan produk.\`,domesticExample:\`Otomotif Indonesia\`,intlExample:\`Carwow, Doug DeMuro\`,ideas:\`Fitur tersembunyi mobil, perbandingan, tips perawatan.\`},
{id:\`beauty\`,name:\`Beauty, Skincare & Fashion\`,cpm:\`Rp 20rb - Rp 70rb (Lokal) | $6 - $18 (Intl)\`,difficulty:\`Menengah\`,viralPotential:\`Sangat Tinggi\`,description:\`Skincare, makeup, fashion, transformasi, review dan tips penggunaan produk.\`,domesticExample:\`Beauty creator Indonesia\`,intlExample:\`Beauty & fashion creators\`,ideas:\`Before-after, kesalahan skincare, styling cepat.\`},
{id:\`travel\`,name:\`Travel, Kuliner & Hospitality\`,cpm:\`Rp 15rb - Rp 55rb (Lokal) | $5 - $16 (Intl)\`,difficulty:\`Menengah\`,viralPotential:\`Sangat Tinggi\`,description:\`Destinasi, hotel, kuliner, itinerary, hidden gem, dan pengalaman perjalanan.\`,domesticExample:\`Travel creator Indonesia\`,intlExample:\`Travel creators\`,ideas:\`Hidden gem, hotel unik, makanan lokal, itinerary singkat.\`},
{id:\`education_pro\`,name:\`Edukasi & Skill Profesional\`,cpm:\`Rp 25rb - Rp 85rb (Lokal) | $8 - $25 (Intl)\`,difficulty:\`Menengah\`,viralPotential:\`Tinggi\`,description:\`Bahasa, coding, desain, komunikasi, dan keterampilan praktis bernilai tinggi.\`,domesticExample:\`Creator edukasi Indonesia\`,intlExample:\`Educational creators\`,ideas:\`Belajar skill dalam 60 detik, kesalahan umum, shortcut praktis.\`}],Ke=`;
  code = code.replace(nicheAnchor, extraNiches);
  applied += 1;
}

const malformedClipResult = ']})]})(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`';
if (code.includes(malformedClipResult)) {
  throw new Error("Runtime patch JSX gagal: separator clipper_result masih rusak.");
}

console.info(`[ViralClip] ${RUNTIME_FIX_VERSION}: ${applied} patch bundle diterapkan`);

const blobUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
try {
  await import(blobUrl);
} finally {
  URL.revokeObjectURL(blobUrl);
}

/* ---------- DOM enhancements for the production bundle ---------- */
const style = document.createElement("style");
style.textContent = `
  .vc-mobile-nav{display:none}
  .vc-enhance-card{background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;color:#cbd5e1}
  .vc-enhance-title{font-size:12px;font-weight:800;color:#a5b4fc;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em}
  .vc-controls{display:flex;gap:8px;flex-wrap:wrap;align-items:end}
  .vc-controls label{font-size:11px;color:#94a3b8;display:flex;flex-direction:column;gap:4px}
  .vc-controls select{background:#020617;border:1px solid #475569;color:#fff;border-radius:8px;padding:7px 9px;font-size:12px}
  .vc-danger{background:#b91c1c;color:#fff;border:0;border-radius:9px;padding:8px 11px;font-weight:700;font-size:12px}
  .vc-preview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px}
  .vc-history-preview{width:100%;max-height:250px;background:#000;border-radius:10px}
  @media(max-width:767px){
    body{padding-bottom:78px}
    .vc-mobile-nav{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:rgba(2,6,23,.96);border:1px solid #334155;border-radius:16px;overflow:hidden;box-shadow:0 10px 35px rgba(0,0,0,.5);backdrop-filter:blur(12px)}
    .vc-mobile-nav button{border:0;background:transparent;color:#cbd5e1;padding:10px 4px;font-size:10px;font-weight:700;line-height:1.15}
    .vc-mobile-nav button:active{background:#4f46e5;color:#fff}
  }
`;
document.head.appendChild(style);

function clickDesktopNav(label) {
  const buttons = [...document.querySelectorAll("header button")];
  const target = buttons.find(btn => (btn.textContent || "").includes(label));
  if (target) target.click();
}
function installMobileNav() {
  if (document.querySelector(".vc-mobile-nav")) return;
  const nav = document.createElement("div");
  nav.className = "vc-mobile-nav";
  [
    ["🎯","Strategi","Strategi"],
    ["🔥","Bahan","Cari 10 Bahan"],
    ["✂️","Clipper","AI Clipper"],
    ["🕘","Riwayat","Riwayat"],
    ["💰","Roadmap","Roadmap Cuan"]
  ].forEach(([icon, text, label]) => {
    const btn = document.createElement("button");
    btn.innerHTML = `<div style="font-size:17px">${icon}</div>${text}`;
    btn.onclick = () => clickDesktopNav(label);
    nav.appendChild(btn);
  });
  document.body.appendChild(nav);
}

function installSubtitleControls() {
  if (document.querySelector("#vc-subtitle-controls")) return;
  const subtitleLabel = [...document.querySelectorAll("span")].find(el => el.textContent?.trim() === "Subtitle:");
  if (!subtitleLabel) return;
  const host = subtitleLabel.parentElement?.parentElement;
  if (!host) return;

  const box = document.createElement("div");
  box.id = "vc-subtitle-controls";
  box.className = "vc-enhance-card";
  box.innerHTML = `
    <div class="vc-enhance-title">Tampilan Subtitle saat Render</div>
    <div class="vc-controls">
      <label>Maks kata/frame
        <select data-vc="subtitle_max_words">
          ${[1,2,3,4,5,6].map(v => `<option value="${v}">${v} kata</option>`).join("")}
        </select>
      </label>
      <label>Font
        <select data-vc="subtitle_font">
          <option>DejaVu Sans</option><option>Liberation Sans</option><option>Arial</option>
        </select>
      </label>
      <label>Gaya
        <select data-vc="subtitle_style">
          <option value="hormozi">Hormozi Kuning</option>
          <option value="minimal">Minimal Putih</option>
          <option value="mrbeast">MrBeast Pop</option>
        </select>
      </label>
      <label>Animasi
        <select data-vc="subtitle_animation">
          <option value="pop">Pop</option><option value="fade">Fade</option><option value="none">Tanpa animasi</option>
        </select>
      </label>
    </div>
    <div style="font-size:11px;color:#64748b;margin-top:8px">Default 3 kata/frame. Pengaturan ini diterapkan ke MP4 saat tombol Render ditekan.</div>
  `;
  host.insertAdjacentElement("afterend", box);
  for (const select of box.querySelectorAll("select[data-vc]")) {
    const key = select.dataset.vc;
    select.value = getSetting(key, key === "subtitle_max_words" ? "3" : key === "subtitle_font" ? "DejaVu Sans" : key === "subtitle_style" ? "hormozi" : "pop");
    select.onchange = () => setSetting(key, select.value);
  }
}

function jobIdsFromEntries(entries) {
  const ids = [];
  for (const entry of entries) {
    for (const clip of entry.clips || []) {
      let id = clip.render_job_id || "";
      if (!id && clip.download_url) {
        const match = String(clip.download_url).match(/\/api\/render\/download\/([^/?#]+)/);
        if (match) id = decodeURIComponent(match[1]);
      }
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}
async function cleanupHistoryEntries(entries) {
  const job_ids = jobIdsFromEntries(entries);
  if (job_ids.length) {
    const res = await nativeFetch(`${API_BASE}/api/render/cleanup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_ids })
    });
    if (!res.ok) console.warn("[ViralClip] cleanup server tidak sempurna:", await res.text());
  }
}
function historyData() {
  try { return JSON.parse(localStorage.getItem("viralclip_history") || "[]"); }
  catch { return []; }
}
function installHistoryActions() {
  const entries = historyData();
  if (!entries.length) return;
  const h3s = [...document.querySelectorAll("h3")];

  for (const entry of entries) {
    const title = h3s.find(el => el.textContent?.trim() === entry.sourceUrl);
    if (!title) continue;
    const card = title.parentElement;
    if (!card || card.querySelector(`[data-vc-delete="${entry.id}"]`)) continue;

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px";
    const del = document.createElement("button");
    del.dataset.vcDelete = entry.id;
    del.className = "vc-danger";
    del.textContent = "Hapus Riwayat + File";
    del.onclick = async () => {
      if (!confirm("Hapus riwayat ini dan file video hasil render di VPS?")) return;
      del.disabled = true;
      await cleanupHistoryEntries([entry]);
      const next = historyData().filter(item => item.id !== entry.id);
      localStorage.setItem("viralclip_history", JSON.stringify(next));
      location.reload();
    };
    actions.appendChild(del);
    card.appendChild(actions);

    const clips = (entry.clips || []).filter(c => c.video_url);
    if (clips.length && !card.querySelector(".vc-preview-grid")) {
      const grid = document.createElement("div");
      grid.className = "vc-preview-grid";
      clips.forEach(c => {
        const wrap = document.createElement("div");
        const v = document.createElement("video");
        v.className = "vc-history-preview";
        v.controls = true;
        v.playsInline = true;
        v.preload = "metadata";
        v.src = c.video_url;
        wrap.appendChild(v);
        grid.appendChild(wrap);
      });
      card.appendChild(grid);
    }
  }

  if (!document.querySelector("#vc-delete-all") && entries.some(e => h3s.some(h => h.textContent?.trim() === e.sourceUrl))) {
    const firstTitle = h3s.find(h => entries.some(e => e.sourceUrl === h.textContent?.trim()));
    const firstCard = firstTitle?.parentElement;
    if (firstCard?.parentElement) {
      const all = document.createElement("button");
      all.id = "vc-delete-all";
      all.className = "vc-danger";
      all.style.marginBottom = "10px";
      all.textContent = `Hapus Semua Riwayat (${entries.length})`;
      all.onclick = async () => {
        if (!confirm("Hapus SEMUA riwayat dan semua file hasil render di VPS?")) return;
        all.disabled = true;
        await cleanupHistoryEntries(entries);
        localStorage.setItem("viralclip_history", "[]");
        location.reload();
      };
      firstCard.parentElement.insertBefore(all, firstCard);
    }
  }
}

function selectedNicheName() {
  const badge = [...document.querySelectorAll("*")].find(el => el.textContent?.trim() === "Niche Aktif");
  const card = badge?.closest(".cursor-pointer");
  const heading = card?.querySelector("h3");
  return heading?.textContent?.replace("⭐","").trim() || "";
}
function targetIsGlobal() {
  const btn = [...document.querySelectorAll("button")].find(b => b.textContent?.includes("Global (EN)"));
  return !!btn?.className?.includes("bg-indigo-600");
}
function installMarketTiming() {
  const heading = [...document.querySelectorAll("h3")].find(h => h.textContent?.includes("Jam Upload Terbaik 2026"));
  if (!heading) return;
  const card = heading.parentElement;
  if (!card) return;
  let panel = card.querySelector("#vc-market-timing");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "vc-market-timing";
    panel.className = "vc-enhance-card";
    panel.style.marginTop = "14px";
    card.appendChild(panel);
  }
  const niche = selectedNicheName() || "niche aktif";
  const global = targetIsGlobal();
  const localTips = {
    "Anak-anak & Edukasi Keluarga":"15:00–19:00 WIB; akhir pekan 08:00–11:00",
    "Keuangan Pribadi & Bisnis":"11:30–13:30 & 19:00–21:30 WIB",
    "Teknologi & Tools AI":"12:00–14:00 & 19:00–22:00 WIB",
    "Motivasi & Psikologi":"05:30–07:30 & 20:00–22:00 WIB",
    "Kesehatan & Fitness":"05:30–08:00 & 18:00–21:00 WIB",
    "Karier, Produktivitas & Profesional":"07:00–09:00 & 19:00–21:00 WIB",
    "Properti & Real Estate":"12:00–14:00 & 19:00–21:30 WIB",
    "Otomotif":"12:00–14:00 & 19:00–22:00 WIB",
    "Beauty, Skincare & Fashion":"11:00–13:00 & 19:00–22:00 WIB",
    "Travel, Kuliner & Hospitality":"11:00–14:00 & 19:00–21:30 WIB",
    "Edukasi & Skill Profesional":"15:00–18:00 & 19:00–21:00 WIB"
  };
  panel.innerHTML = global
    ? `<div class="vc-enhance-title">Target luar negeri • ${niche}</div>
       <div style="font-size:12px;line-height:1.55">
       🇺🇸/🇨🇦 Uji <b>05:00–10:00 WIB</b> untuk prime time malam Amerika (bergeser ±1 jam saat DST).<br>
       🇬🇧 Uji <b>00:00–05:00 WIB</b> untuk malam UK.<br>
       🇦🇺 Uji <b>14:00–19:00 WIB</b> untuk malam Australia timur.<br>
       <span style="color:#94a3b8">Niche finance, AI, career, properti biasanya lebih cocok diuji ke pasar CPM tinggi; ukur retention/RPM kanal Anda untuk menentukan slot final.</span>
       </div>`
    : `<div class="vc-enhance-title">Waktu lokal • ${niche}</div>
       <div style="font-size:12px;line-height:1.55">Slot awal yang disarankan: <b>${localTips[niche] || "11:30–13:30 & 19:00–21:30 WIB"}</b>.<br>
       <span style="color:#94a3b8">Gunakan sebagai titik uji; pertahankan jam yang memberi retention dan view awal terbaik untuk kanal Anda.</span></div>`;
}

installMobileNav();
const observer = new MutationObserver(() => {
  installMobileNav();
  installSubtitleControls();
  installHistoryActions();
  installMarketTiming();
});
observer.observe(document.body, { childList: true, subtree: true });
installSubtitleControls();
installHistoryActions();
installMarketTiming();

console.info(`[ViralClip] ${RUNTIME_FIX_VERSION}: enhancement UI aktif`);
