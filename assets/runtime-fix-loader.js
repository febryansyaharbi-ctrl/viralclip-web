const RUNTIME_FIX_VERSION = "20261003-jsx-fix-v3";
console.info(`[ViralClip] runtime loader ${RUNTIME_FIX_VERSION}`);

const bundleUrl = `/viralclip-web/assets/index-DK5reAhc.js?v=${RUNTIME_FIX_VERSION}`;

const response = await fetch(bundleUrl, { cache: "no-store" });
if (!response.ok) {
  throw new Error(`Gagal memuat bundle ViralClip: HTTP ${response.status}`);
}

let code = await response.text();

const patches = [
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
for (const [from, to] of patches) {
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

const malformedClipResult = ']})]})(0,k.jsxs)(`p`,{className:`text-xs text-slate-400 mb-2`';
if (code.includes(malformedClipResult)) {
  throw new Error("Runtime patch JSX gagal: separator clipper_result masih rusak.");
}

console.info(`[ViralClip] ${RUNTIME_FIX_VERSION}: ${applied} patch diterapkan, JSX clipper_result OK`);

const blobUrl = URL.createObjectURL(
  new Blob([code], { type: "text/javascript" })
);

try {
  await import(blobUrl);
} finally {
  URL.revokeObjectURL(blobUrl);
}
