const VC_TAB_FIX_VERSION = "20261005-tabfix-v1";
console.info(`[ViralClip] tab fix ${VC_TAB_FIX_VERSION}`);

// Prevent the older extra layer from installing its blocking capture handler.
if (document.body) document.body.dataset.vcxGuard = "compat";
else document.addEventListener("DOMContentLoaded", () => {
  document.body.dataset.vcxGuard = "compat";
}, { once: true });

const API = "https://harnet.tail89c9ef.ts.net";
const safeJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const getHistory = () => safeJson(localStorage.getItem("viralclip_history") || "[]", []);
const getAnalysis = () => safeJson(localStorage.getItem("viralclip_last_analysis") || "{}", {});

function activeTabFromButton(btn) {
  const t = (btn?.textContent || "").toLowerCase();
  if (t.includes("riwayat") || t.includes("history")) return "history";
  if (t.includes("strategi")) return "strategy";
  if (t.includes("cari 10 bahan") || t.includes("bahan viral")) return "sources";
  if (t.includes("ai clipper") || t.includes("clipper")) return "clipper";
  if (t.includes("roadmap")) return "roadmap";
  return "";
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const text = (btn.textContent || "").trim();

  // Do NOT cancel the React click. Only mirror the selected market.
  if (/Global \(EN\)/i.test(text)) {
    localStorage.setItem("viralclip_target_market", "global");
    setTimeout(() => window.dispatchEvent(new Event("vc-target-changed")), 0);
  } else if (/^Indonesia/i.test(text)) {
    localStorage.setItem("viralclip_target_market", "id");
    setTimeout(() => window.dispatchEvent(new Event("vc-target-changed")), 0);
  }

  const tab = activeTabFromButton(btn);
  if (tab) {
    localStorage.setItem("viralclip_active_tab", tab);
    setTimeout(syncHistoryPanel, 80);
  }
}, false);

function timingAdvice() {
  const target = localStorage.getItem("viralclip_target_market") || "id";
  const niche = localStorage.getItem("viralclip_custom_niche") || "";
  if (target === "global") return "Global: fokus uji US/Canada 05:00–10:00 WIB, UK 00:00–05:00 WIB, Australia timur 14:00–19:00 WIB. Pilih slot akhir dari Analytics channel.";
  if (niche === "kids") return "Indonesia: 15:00–19:00 WIB; akhir pekan 08:00–11:00 WIB.";
  if (niche === "health") return "Indonesia: 05:30–08:00 atau 18:00–21:00 WIB.";
  if (niche === "finance" || niche === "career") return "Indonesia: 07:00–09:00 atau 19:00–21:00 WIB.";
  return "Indonesia: uji 11:30–13:30 dan 19:00–21:30 WIB.";
}

function renderJobId(clip) {
  if (clip?.render_job_id) return clip.render_job_id;
  const m = String(clip?.video_url || clip?.download_url || "").match(/\/api\/render\/(?:video|download)\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

function clipMeta(clip) {
  const tags = Array.isArray(clip?.tags) ? clip.tags : [];
  return `
    <div style="font-weight:900;color:#facc15;margin-bottom:6px">Score ${clip?.score ?? "-"}</div>
    <div style="font-weight:800;margin-bottom:6px">${clip?.title || "Saran judul belum tersedia"}</div>
    <div style="font-size:12px;color:#cbd5e1;margin-bottom:6px"><b>Caption:</b> ${clip?.caption || "-"}</div>
    <div style="margin-bottom:8px">${tags.map(t => `<span style="display:inline-block;background:#1e293b;border-radius:999px;padding:4px 8px;margin:2px;font-size:11px">${t}</span>`).join("")}</div>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:9px;font-size:12px;color:#cbd5e1"><b>🕒 Saran upload:</b><br>${timingAdvice()}</div>`;
}

async function deleteHistoryEntry(entry) {
  const ids = (entry.clips || []).map(renderJobId).filter(Boolean);
  try {
    if (ids.length) {
      await fetch(`${API}/api/render/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_ids: ids })
      });
    }
  } catch (e) {
    console.warn("[ViralClip] cleanup history", e);
  }
  const next = getHistory().filter(x => String(x.id) !== String(entry.id));
  localStorage.setItem("viralclip_history", JSON.stringify(next));
  document.getElementById("vcx-history-compat")?.remove();
  syncHistoryPanel();
}

function historyHost() {
  const candidates = [...document.querySelectorAll("main,section,div")];
  return candidates.find(el => {
    const own = [...el.children].find(c => /^H[1-4]$/.test(c.tagName) && /^(Riwayat|History)$/i.test((c.textContent || "").trim()));
    return !!own;
  }) || document.querySelector("main");
}

function syncHistoryPanel() {
  const tab = localStorage.getItem("viralclip_active_tab") || "";
  const existingLegacy = document.getElementById("vcx-history");
  const existingCompat = document.getElementById("vcx-history-compat");

  if (tab !== "history") {
    existingLegacy?.remove();
    existingCompat?.remove();
    return;
  }

  if (existingLegacy || existingCompat) return;
  const host = historyHost();
  if (!host) return;

  const list = getHistory();
  const wrap = document.createElement("div");
  wrap.id = "vcx-history-compat";
  wrap.style.cssText = "background:#0f172a;border:1px solid #334155;border-radius:14px;padding:14px;margin:12px 0;color:#e2e8f0";
  wrap.innerHTML = `
    <div style="font-weight:900;color:#a5b4fc;margin-bottom:10px">🕘 Riwayat Lengkap</div>
    ${list.length ? list.map((entry, i) => `
      <div style="background:#020617;border:1px solid #334155;border-radius:12px;padding:12px;margin:10px 0">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
          <b>${entry.sourceUrl || entry.title || `Video ${i + 1}`}</b>
          <button data-vc-history-delete="${i}" style="background:#b91c1c;color:#fff;border:0;border-radius:9px;padding:8px 11px;font-weight:700">Hapus</button>
        </div>
        ${(entry.clips || []).map(clip => {
          const job = renderJobId(clip);
          return `<div style="background:#07101f;border:1px solid #334155;border-radius:10px;padding:10px;margin-top:8px">
            ${job ? `<video controls playsinline preload="metadata" style="width:100%;max-height:360px;background:#000;border-radius:8px" src="${API}/api/render/video/${encodeURIComponent(job)}"></video>` : ""}
            ${clipMeta(clip)}
          </div>`;
        }).join("")}
      </div>`).join("") : `<div style="font-size:12px;color:#94a3b8">Belum ada hasil render.</div>`}
  `;
  wrap.addEventListener("click", e => {
    const btn = e.target.closest("[data-vc-history-delete]");
    if (!btn) return;
    deleteHistoryEntry(list[Number(btn.dataset.vcHistoryDelete)]);
  });
  host.prepend(wrap);
}

setInterval(syncHistoryPanel, 900);
setTimeout(syncHistoryPanel, 300);
console.info(`[ViralClip] tab fix aktif`);
