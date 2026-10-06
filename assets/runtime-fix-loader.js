const RUNTIME_FIX_VERSION = "20261006-stable-core-v3-restored-q1";
console.info(`[ViralClip] runtime loader ${RUNTIME_FIX_VERSION}`);

const bundleUrl = `/viralclip-web/assets/index-DK5reAhc.js?v=${RUNTIME_FIX_VERSION}`;

const nativeFetch = window.fetch.bind(window);

// Keep source recommendations fresh without touching React internals.
window.fetch = async (input, init = {}) => {
  let url = typeof input === "string" ? input : input?.url || "";
  let nextInput = input;

  if (url.includes("/api/sources?") && !url.includes("refresh=")) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}refresh=${Date.now()}`;
    if (typeof input === "string") {
      nextInput = url;
    } else {
      nextInput = new Request(url, input);
    }
  }

  return nativeFetch(nextInput, init);
};

const response = await nativeFetch(bundleUrl, { cache: "no-store" });
if (!response.ok) {
  throw new Error(`Gagal memuat bundle ViralClip: HTTP ${response.status}`);
}

let code = await response.text();

const requiredPatches = [
  [
    'kids:{lokal:\`anak edukasi Indonesia\`,internasional:\`kids education\`},finance:{lokal:\`keuangan bisnis Indonesia\`,internasional:\`personal finance business\`},ai_tech:{lokal:\`teknologi AI Indonesia\`,internasional:\`AI technology tools\`},motivation:{lokal:\`motivasi psikologi Indonesia\`,internasional:\`motivation psychology self improvement\`}',
    'kids:{lokal:\`babybus bahasa indonesia lagu anak\`,internasional:\`kids learning 2026\`},finance:{lokal:\`investasi keuangan Indonesia 2026\`,internasional:\`finance investing 2026\`},ai_tech:{lokal:\`AI untuk bisnis Indonesia\`,internasional:\`AI tools 2026\`},motivation:{lokal:\`mindset sukses Indonesia motivasi\`,internasional:\`self improvement psychology 2026\`}'
  ],
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

  if (first === -1) {
    throw new Error(`Runtime patch gagal: pola tidak ditemukan: ${from.slice(0, 80)}`);
  }

  if (first !== last) {
    throw new Error(`Runtime patch dibatalkan: pola tidak unik: ${from.slice(0, 80)}`);
  }

  code = code.replace(from, to);
  applied += 1;
}

// Preserve render job id in History for cleanup support.
const historyFrom = 'video_url:e.video_url,download_url:e.download_url}))}';
const historyTo = 'video_url:e.video_url,download_url:e.download_url,render_job_id:e.render_job_id}))}';
if (code.includes(historyFrom)) {
  code = code.replace(historyFrom, historyTo);
  applied += 1;
}

const malformedClipResult = ']})]})(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`';
if (code.includes(malformedClipResult)) {
  throw new Error("Runtime patch JSX gagal: separator clipper_result masih rusak.");
}

console.info(`[ViralClip] ${applied} patch inti diterapkan`);

const blobUrl = URL.createObjectURL(
  new Blob([code], { type: "text/javascript" })
);

try {
  await import(blobUrl);
  console.info(`[ViralClip] aplikasi berhasil dimuat`);
} finally {
  URL.revokeObjectURL(blobUrl);
}
