const VC_SEARCH_VERSION="20261005-search-v1";
console.info(`[ViralClip] search filter ${VC_SEARCH_VERSION}`);
const innerFetch=window.fetch.bind(window);
const nicheTerms={
  finance:"keuangan bisnis investasi financial literacy entrepreneur",
  ai:"AI tools artificial intelligence software teknologi tutorial",
  career:"karier produktivitas interview skill profesional career",
  property:"properti rumah real estate investasi properti renovasi",
  health:"fitness kesehatan olahraga nutrisi workout healthy habits",
  education:"edukasi skill belajar tutorial profesional education",
  auto:"otomotif mobil motor kendaraan review automotive",
  beauty:"beauty skincare fashion makeup tutorial",
  travel:"travel wisata kuliner hotel itinerary hidden gem",
  kids:"edukasi anak belajar anak kartun anak cerita anak lagu anak kids learning family"
};
const kidsBad=/politik|pemilu|presiden|menteri|partai|dpr|gubernur|pilkada|kampanye|prabowo|jokowi|anies|ganjar|parlemen|kabinet/i;
const kidsGood=/anak|kids|kartun|belajar|edukasi|cerita|lagu|family|keluarga|parenting|sekolah|balita|bayi/i;
function infer(q){q=String(q||"").toLowerCase();if(/anak|kids|keluarga|parenting|family/.test(q))return"kids";if(/keuangan|finance|bisnis|uang|investasi/.test(q))return"finance";if(/teknologi|\bai\b|artificial|software/.test(q))return"ai";if(/fitness|kesehatan|health|nutrisi/.test(q))return"health";if(/karier|career|produktif|profesional/.test(q))return"career";if(/properti|property|real estate|rumah/.test(q))return"property";if(/otomotif|mobil|motor|automotive/.test(q))return"auto";if(/beauty|skincare|fashion|makeup/.test(q))return"beauty";if(/travel|kuliner|hotel|wisata/.test(q))return"travel";if(/edukasi|education|skill|belajar/.test(q))return"education";return""}
window.fetch=async(input,init={})=>{
  let url=typeof input==="string"?input:input?.url||"";let nextInput=input;let mode="";
  if(url.includes("/api/sources?")){
    try{const u=new URL(url,location.href);const q=u.searchParams.get("query")||"";mode=localStorage.getItem("viralclip_custom_niche")||infer(q);const extra=nicheTerms[mode]||"";if(extra)u.searchParams.set("query",`${q} ${extra}`.trim());u.searchParams.set("refresh",Date.now());url=u.toString();nextInput=typeof input==="string"?url:new Request(url,input)}catch{}
  }
  const r=await innerFetch(nextInput,init);
  if(!url.includes("/api/sources?")||!r.ok)return r;
  try{const d=await r.clone().json();if(!Array.isArray(d.items))return r;let items=d.items.filter(Boolean);if(mode==="kids"){items=items.filter(x=>!kidsBad.test(`${x.title||""} ${x.channel||""}`));const good=items.filter(x=>kidsGood.test(`${x.title||""} ${x.channel||""}`));items=[...good,...items.filter(x=>!good.includes(x))]}d.items=items.slice(0,10);d.niche_filter=mode||"original";return new Response(JSON.stringify(d),{status:r.status,headers:{"Content-Type":"application/json"}})}catch{return r}
};
