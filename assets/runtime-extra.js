const VC_EXTRA_VERSION = "20261004-extra-v1";
console.info(`[ViralClip] extra ${VC_EXTRA_VERSION}`);

const VC_API = "https://harnet.tail89c9ef.ts.net";

function vcHistory() {
  try { return JSON.parse(localStorage.getItem("viralclip_history") || "[]"); }
  catch { return []; }
}

function vcJobIds(entries) {
  const ids = [];
  for (const entry of entries) {
    for (const clip of entry.clips || []) {
      let id = clip.render_job_id || "";
      if (!id && clip.download_url) {
        const m = String(clip.download_url).match(/\/api\/render\/download\/([^/?#]+)/);
        if (m) id = decodeURIComponent(m[1]);
      }
      if (id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

async function vcCleanup(entries) {
  const job_ids = vcJobIds(entries);
  if (!job_ids.length) return;
  try {
    const r = await fetch(`${VC_API}/api/render/cleanup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_ids })
    });
    if (!r.ok) console.warn("[ViralClip] cleanup sebagian gagal", await r.text());
  } catch (e) {
    console.warn("[ViralClip] cleanup server gagal", e);
  }
}

function vcParseJobId(href) {
  const m = String(href || "").match(/\/api\/render\/(?:download|video)\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function installExportPreviews() {
  const links = [...document.querySelectorAll('a[href*="/api/render/download/"],a[href*="/api/render/video/"]')];
  for (const link of links) {
    const jobId = vcParseJobId(link.getAttribute("href") || link.href);
    if (!jobId) continue;
    const key = `vc-preview-${jobId}`;
    if (document.getElementById(key)) continue;

    const wrap = document.createElement("div");
    wrap.id = key;
    wrap.style.cssText = "margin:10px 0 12px;background:#020617;border:1px solid #334155;border-radius:14px;padding:8px";
    const label = document.createElement("div");
    label.textContent = "Preview hasil export";
    label.style.cssText = "font-size:11px;font-weight:800;color:#a5b4fc;margin:0 0 7px";
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = `${VC_API}/api/render/video/${encodeURIComponent(jobId)}`;
    video.style.cssText = "display:block;width:100%;max-height:520px;background:#000;border-radius:10px";
    wrap.append(label, video);

    const parent = link.parentElement;
    if (parent?.parentElement) parent.parentElement.insertBefore(wrap, parent);
    else link.insertAdjacentElement("beforebegin", wrap);
  }
}

function installHistoryBulk() {
  const entries = vcHistory();
  if (!entries.length) return;
  const titles = [...document.querySelectorAll("h3")];
  const cards = [];

  for (const entry of entries) {
    const h = titles.find(x => x.textContent?.trim() === entry.sourceUrl);
    const card = h?.parentElement;
    if (!card) continue;
    cards.push({ entry, card });
    if (!card.querySelector(`[data-vc-select="${entry.id}"]`)) {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:7px;margin:8px 0;color:#cbd5e1;font-size:12px;font-weight:700";
      label.innerHTML = `<input type="checkbox" data-vc-select="${entry.id}" style="width:16px;height:16px"> Pilih riwayat ini`;
      card.insertBefore(label, card.firstChild);
    }
  }

  if (!cards.length || document.getElementById("vc-bulk-history")) return;
  const bar = document.createElement("div");
  bar.id = "vc-bulk-history";
  bar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:12px";
  const selectAll = document.createElement("button");
  selectAll.textContent = "Pilih Semua";
  selectAll.style.cssText = "border:1px solid #475569;background:#1e293b;color:white;border-radius:9px;padding:8px 11px;font-weight:700;font-size:12px";
  selectAll.onclick = () => {
    const boxes = [...document.querySelectorAll("input[data-vc-select]")];
    const allOn = boxes.length && boxes.every(b => b.checked);
    boxes.forEach(b => b.checked = !allOn);
    selectAll.textContent = allOn ? "Pilih Semua" : "Batal Pilih Semua";
  };

  const remove = document.createElement("button");
  remove.textContent = "Hapus Pilihan";
  remove.style.cssText = "border:0;background:#b91c1c;color:white;border-radius:9px;padding:8px 11px;font-weight:800;font-size:12px";
  remove.onclick = async () => {
    const selected = new Set([...document.querySelectorAll("input[data-vc-select]:checked")].map(x => x.dataset.vcSelect));
    if (!selected.size) return alert("Pilih riwayat yang ingin dihapus.");
    if (!confirm(`Hapus ${selected.size} riwayat terpilih beserta file render di VPS?`)) return;
    remove.disabled = true;
    const chosen = entries.filter(e => selected.has(String(e.id)));
    await vcCleanup(chosen);
    localStorage.setItem("viralclip_history", JSON.stringify(entries.filter(e => !selected.has(String(e.id)))));
    location.reload();
  };

  bar.append(selectAll, remove);
  cards[0].card.parentElement?.insertBefore(bar, cards[0].card);
}

function installMobileArrows() {
  if (document.getElementById("vc-mobile-arrows")) return;
  const box = document.createElement("div");
  box.id = "vc-mobile-arrows";
  box.style.cssText = "display:none";
  box.innerHTML = '<button data-dir="-1">← Slide</button><button data-dir="1">Slide →</button>';
  document.body.appendChild(box);

  const css = document.createElement("style");
  css.textContent = `@media(max-width:767px){#vc-mobile-arrows{display:flex;position:fixed;right:12px;bottom:84px;z-index:99998;gap:8px}#vc-mobile-arrows button{border:1px solid #475569;background:rgba(15,23,42,.96);color:#fff;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:800;box-shadow:0 8px 24px rgba(0,0,0,.35)}}`;
  document.head.appendChild(css);

  const labels = ["Strategi","Cari 10 Bahan","AI Clipper","Riwayat","Roadmap Cuan"];
  box.querySelectorAll("button").forEach(btn => btn.onclick = () => {
    const nav = [...document.querySelectorAll("header button")].filter(b => labels.some(l => (b.textContent || "").includes(l)));
    if (!nav.length) return;
    let idx = nav.findIndex(b => String(b.className).includes("bg-indigo-600"));
    if (idx < 0) idx = 0;
    idx = (idx + Number(btn.dataset.dir) + nav.length) % nav.length;
    nav[idx].click();
  });
}

function vcInstallExtra() {
  installExportPreviews();
  installHistoryBulk();
  installMobileArrows();
}

vcInstallExtra();
new MutationObserver(vcInstallExtra).observe(document.body, { childList: true, subtree: true });
