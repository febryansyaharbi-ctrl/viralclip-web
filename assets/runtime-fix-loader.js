const RUNTIME_FIX_VERSION = "20261006-stable-core-v4";
console.info(`[ViralClip] runtime loader ${RUNTIME_FIX_VERSION}`);

const bundleUrl = `/viralclip-web/assets/index-DK5reAhc.js?v=${RUNTIME_FIX_VERSION}`;

const nativeFetch = window.fetch.bind(window);

let sourceSeq = 0;
let latestSourceContext = null;

const SOURCE_CFG = {
  kids: {
    id: {
      queries: [
        "moonbug kids indonesia 2026",
        "edukasi anak indonesia 2026",
        "belajar anak indonesia 2026",
        "cocomelon indonesia anak",
        "little angel indonesia anak",
        "lagu anak babybus indonesia",
        "kartun anak bahasa indonesia",
        "lagu anak indonesia 2026"
      ],
      relevant: /bahasa indonesia|moonbug kids indonesia|nursery rhymes indonesia|lagu anak|kartun anak|anak indonesia|edukasi[^\n]*anak|anak[^\n]*edukasi|belajar[^\n]*anak|anak[^\n]*belajar|anak-anak|anak anak|anak prasekolah|untuk anak|kids indonesia|babybus bahasa indonesia|spookiz bahasa indonesia|sajak pendidikan/i,
      banned: /politik|pemilu|presiden|menteri|partai|dpr|gubernur|pilkada|kampanye|prabowo|jokowi|anies|ganjar|parlemen|kabinet|election|politic|berita|timnas|menkopolkam|kelas sma|tarot|zodiak|roblox|kemenkes|bosp|jaminan sosial|visa pelajar|sekolah sabat|mazmur|tawuran|azab/i
    },
    global: {
      queries: ["kids learning 2026","toddler learning 2026","kids educational videos 2026"],
      relevant: /kids|children|toddler|preschool|nursery|learning|cartoon|baby|school|story/i,
      banned: /politic|election|president|senate|congress|war news/i
    }
  },
  finance: {
    id: {
      queries: ["investasi keuangan Indonesia 2026","saham investasi Indonesia 2026"],
      relevant: /keuangan|investasi|uang|saham|pasar modal|bisnis|financial|finance|invest|stock|market|asset|portfolio/i,
      banned: /tarot|horoscope|zodiac|capricorn|gemini|cancer|libra|aries|taurus|scorpio|sagittarius|aquarius|pisces|leo|virgo|politik|pemilu|presiden/i
    },
    global: {
      queries: ["finance investing 2026","personal finance 2026"],
      relevant: /finance|invest|money|financial|stock|market|asset|portfolio|wealth|business/i,
      banned: /tarot|horoscope|zodiac|politic|election/i
    }
  },
  ai: {
    id: {
      queries: ["AI Indonesia 2026","tools AI Indonesia 2026"],
      relevant: /\bai\b|kecerdasan buatan|teknologi|chatgpt|gemini|software|otomasi|automation|coding|tool/i
    },
    global: {
      queries: ["AI tools 2026","artificial intelligence 2026"],
      relevant: /\bai\b|artificial intelligence|software|technology|tool|chatgpt|gemini|automation|coding|robot/i
    }
  },
  motivation: {
    id: {
      queries: ["motivasi psikologi Indonesia 2026","pengembangan diri Indonesia 2026"],
      relevant: /motivasi|psikologi|pengembangan diri|mindset|mental|kebiasaan|disiplin|percaya diri|self improvement/i
    },
    global: {
      queries: ["self improvement psychology 2026","motivation mindset 2026"],
      relevant: /self improvement|psychology|motivation|mindset|mental|habit|confidence|discipline/i
    }
  },
  career: {
    id: { queries:["karier produktivitas Indonesia 2026","interview kerja Indonesia 2026"], relevant:/karier|produktivitas|interview|kerja|pekerjaan|career|productivity|job|leadership|professional/i },
    global: { queries:["career productivity 2026","job interview career 2026"], relevant:/career|productivity|interview|work|job|leadership|professional/i }
  },
  property: {
    id: { queries:["properti investasi Indonesia 2026","rumah properti Indonesia 2026"], relevant:/properti|rumah|real estate|property|housing|mortgage|apartemen|renovasi/i },
    global: { queries:["real estate 2026","property investing 2026"], relevant:/real estate|property|house|home|housing|mortgage|apartment|renovation/i }
  },
  health: {
    id: { queries:["fitness kesehatan Indonesia 2026","diet olahraga Indonesia 2026"], relevant:/fitness|kesehatan|olahraga|nutrisi|workout|gym|diet|exercise|weight loss/i },
    global: { queries:["fitness health 2026","workout nutrition 2026"], relevant:/fitness|health|workout|nutrition|gym|healthy|diet|exercise|weight loss/i }
  },
  education: {
    id: { queries:["skill profesional Indonesia 2026","belajar coding Indonesia 2026","kursus online Indonesia 2026"], relevant:/edukasi|belajar|kursus|coding|pelatihan|sertifikat|skill|pendidikan|tutorial|course|learning/i, banned:/roblox|gaming|gameplay|free fire|mobile legends/i },
    global: { queries:["education skills 2026","learn coding 2026","online course 2026"], relevant:/education|learning|course|study|school|coding|language|teacher|professional|training|certificate|skill/i, banned:/roblox|gaming|gameplay/i }
  },
  auto: {
    id: { queries:["review mobil Indonesia 2026","otomotif Indonesia 2026"], relevant:/otomotif|mobil|motor|kendaraan|review|mesin|car|motorcycle|vehicle|suv/i },
    global: { queries:["automotive review 2026","cars review 2026"], relevant:/automotive|car|cars|motorcycle|vehicle|review|engine|truck|suv/i }
  },
  beauty: {
    id: { queries:["skincare Indonesia 2026","makeup fashion Indonesia 2026"], relevant:/beauty|skincare|makeup|fashion|kosmetik|kulit|serum|style/i },
    global: { queries:["skincare beauty 2026","makeup fashion 2026"], relevant:/beauty|skincare|makeup|fashion|cosmetic|skin|serum|style/i }
  },
  travel: {
    id: { queries:["wisata Indonesia 2026","kuliner Indonesia 2026"], relevant:/wisata|kuliner|hotel|destinasi|liburan|travel|restaurant|restoran|trip/i },
    global: { queries:["travel hidden gems 2026","travel hotel food 2026"], relevant:/travel|tourism|hotel|food|hidden gem|destination|vacation|trip|restaurant/i }
  }
};

function sourceContext(query) {
  const q = String(query || "").toLowerCase();
  let niche = "";
  if (/anak|kids|keluarga|parenting/.test(q)) niche = "kids";
  else if (/keuangan|finance|bisnis|investasi|uang|saham/.test(q)) niche = "finance";
  else if (/\bai\b|artificial|software|teknologi/.test(q)) niche = "ai";
  else if (/motivasi|psikologi|psychology|self improvement|pengembangan diri/.test(q)) niche = "motivation";
  else if (/karier|career|produktivitas|interview kerja/.test(q)) niche = "career";
  else if (/properti|property|real estate|rumah/.test(q)) niche = "property";
  else if (/kesehatan|fitness|health|nutrisi|olahraga/.test(q)) niche = "health";
  else if (/edukasi|education|skill profesional|belajar coding|kursus/.test(q)) niche = "education";
  else if (/otomotif|automotive|mobil|motor/.test(q)) niche = "auto";
  else if (/beauty|skincare|fashion|makeup/.test(q)) niche = "beauty";
  else if (/travel|wisata|kuliner|hospitality|hotel/.test(q)) niche = "travel";

  if (!niche) return null;
  const target = q.includes("indonesia") ? "id" : "global";
  return { niche, target, original: String(query || "") };
}

function rankSourceItems(items, profile) {
  const seen = new Set();
  return (items || [])
    .filter(Boolean)
    .filter(item => {
      const title = String(item.title || "");
      const all = `${title} ${item.channel || ""}`;
      if (profile.banned && profile.banned.test(all)) return false;
      return profile.relevant.test(title);
    })
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .filter(item => {
      const key = String(item.id || item.url || `${item.title}|${item.channel}`).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

async function sourceRequest(url, init, query, stamp, target) {
  const u = new URL(url, location.href);
  u.searchParams.set("query", query);
  u.searchParams.set("refresh", String(stamp));
  u.searchParams.set("target", target);
  const response = await nativeFetch(u.toString(), init);
  if (!response.ok) return { response, data: null };
  try {
    return { response, data: await response.clone().json() };
  } catch {
    return { response, data: null };
  }
}

async function buildSources(url, init, context, seq) {
  const profile = SOURCE_CFG[context.niche]?.[context.target];
  if (!profile) return nativeFetch(url, init);

  const stamp = Date.now();
  const results = [];
  for (let i = 0; i < profile.queries.length; i++) {
    results.push(await sourceRequest(url, init, profile.queries[i], stamp + i, context.target));
  }

  if (seq !== sourceSeq && latestSourceContext) {
    return buildSources(url, init, latestSourceContext, sourceSeq);
  }

  const primary = results[0];
  if (!primary?.response?.ok || !primary.data) return primary?.response || nativeFetch(url, init);

  const pool = [];
  for (const result of results) {
    if (Array.isArray(result.data?.items)) pool.push(...result.data.items);
  }

  const items = rankSourceItems(pool, profile);
  const payload = {
    ...primary.data,
    items,
    original_query: context.original,
    niche_filter: context.niche,
    target_market: context.target,
    locale_filter: context.target === "id" ? "Indonesia" : "Global",
    viral_sort: "views_desc",
    deduplicated: true
  };

  return new Response(JSON.stringify(payload), {
    status: primary.response.status,
    statusText: primary.response.statusText,
    headers: { "Content-Type": "application/json" }
  });
}

// Sumber rekomendasi hanya mengikuti query React aktif.
// Tidak membaca localStorage sehingga niche/target lama tidak bisa menimpa pilihan UI.
window.fetch = async (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (!url.includes("/api/sources?")) return nativeFetch(input, init);

  let query = "";
  try {
    query = new URL(url, location.href).searchParams.get("query") || "";
  } catch {}

  const context = sourceContext(query);
  if (!context) {
    const u = new URL(url, location.href);
    u.searchParams.set("refresh", String(Date.now()));
    return nativeFetch(u.toString(), init);
  }

  const seq = ++sourceSeq;
  latestSourceContext = context;
  return buildSources(url, init, context, seq);
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
