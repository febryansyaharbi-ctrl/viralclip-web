const VC_RECO_VERSION = "20261005-reco-v3";
console.info(`[ViralClip] recommendations ${VC_RECO_VERSION}`);

const downstreamFetch = window.fetch.bind(window);

const CFG = {
  ai: {name:"AI, Software & Teknologi",queries:["AI tools 2026","artificial intelligence 2026"],relevant:/\bai\b|artificial intelligence|software|technology|tool|chatgpt|gemini|automation|coding|robot/i},
  finance: {name:"Keuangan & Bisnis",queries:["finance investing 2026","personal finance 2026"],relevant:/finance|invest|money|financial|stock|market|asset|portfolio|wealth|business/i,banned:/tarot|horoscope|zodiac|capricorn|gemini|cancer|libra|aries|taurus|scorpio|sagittarius|aquarius|pisces|leo|virgo|politik|pemilu|presiden/i},
  career: {name:"Karier & Produktivitas",queries:["career productivity 2026","job interview career 2026"],relevant:/career|productivity|interview|work|job|skill|leadership|professional/i},
  property: {name:"Properti & Real Estate",queries:["real estate 2026","property investing 2026"],relevant:/real estate|property|house|home|housing|mortgage|apartment|renovation/i},
  health: {name:"Kesehatan & Fitness",queries:["fitness health 2026","workout nutrition 2026"],relevant:/fitness|health|workout|nutrition|gym|healthy|diet|exercise|weight loss/i},
  education: {name:"Edukasi & Skill Profesional",queries:["education skills 2026","learn coding 2026","online course 2026"],relevant:/education|learning|course|study|school|coding|language|teacher|professional|training|certificate|skill/i,banned:/roblox|executor|gaming|gameplay|free fire|mobile legends|character skill|rank match|football skill/i},
  auto: {name:"Otomotif",queries:["automotive review 2026","cars review 2026"],relevant:/automotive|car|cars|motorcycle|vehicle|review|engine|truck|suv/i},
  beauty: {name:"Beauty, Skincare & Fashion",queries:["skincare beauty 2026","makeup fashion 2026"],relevant:/beauty|skincare|makeup|fashion|cosmetic|skin|serum|style/i},
  travel: {name:"Travel, Kuliner & Hospitality",queries:["travel hidden gems 2026","travel hotel food 2026"],relevant:/travel|tourism|hotel|food|hidden gem|destination|vacation|trip|restaurant/i},
  kids: {name:"Anak-anak & Edukasi Keluarga",queries:["kids learning 2026","edukasi anak viral 2026"],relevant:/kids|children|cartoon|learning|education|story|family|toddler|baby|school|anak|kartun|belajar|edukasi|cerita|keluarga|balita|bayi/i,banned:/politik|pemilu|presiden|menteri|partai|dpr|gubernur|pilkada|kampanye|prabowo|jokowi|anies|ganjar|parlemen|kabinet|election|politic/i},
  motivation: {name:"Motivasi & Psikologi",queries:["self improvement psychology 2026","motivation mindset 2026"],relevant:/self improvement|psychology|motivation|mindset|mental|habit|confidence|discipline/i}
};

function cleanText(el){return String(el?.textContent||"").replace(/\s+/g," ").trim()}
function nicheFromText(value){
  const t=String(value||"").toLowerCase();
  if(/anak|kids|keluarga|parenting/.test(t))return"kids";
  if(/keuangan|finance|bisnis|investasi|uang/.test(t))return"finance";
  if(/\bai\b|artificial|software|teknologi/.test(t))return"ai";
  if(/karier|career|produktivitas|produktif/.test(t))return"career";
  if(/properti|property|real estate/.test(t))return"property";
  if(/kesehatan|fitness|health|nutrisi/.test(t))return"health";
  if(/otomotif|automotive|mobil|motor/.test(t))return"auto";
  if(/beauty|skincare|fashion|makeup/.test(t))return"beauty";
  if(/travel|wisata|kuliner|hospitality|hotel/.test(t))return"travel";
  if(/motivasi|psikologi|psychology|self improvement/.test(t))return"motivation";
  if(/edukasi|education|skill profesional|belajar/.test(t))return"education";
  return"";
}

document.addEventListener("click",event=>{
  const control=event.target.closest("button,a,[role='button']");
  if(!control)return;
  const niche=nicheFromText(cleanText(control));
  if(niche&&CFG[niche]){
    localStorage.setItem("viralclip_custom_niche",niche);
    localStorage.setItem("viralclip_custom_niche_name",CFG[niche].name);
  }
},false);

function uniqueRank(items,cfg){
  const seen=new Set();
  return (items||[])
    .filter(Boolean)
    .filter(item=>{
      const title=String(item.title||"");
      const all=`${title} ${item.channel||""}`;
      if(cfg.banned&&cfg.banned.test(all))return false;
      return cfg.relevant.test(title);
    })
    .sort((a,b)=>Number(b.views||0)-Number(a.views||0))
    .filter(item=>{
      const key=String(item.id||item.url||`${item.title}|${item.channel}`).toLowerCase();
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
}

async function oneRequest(url,init,query,stamp){
  const u=new URL(url,location.href);
  u.searchParams.set("query",query);
  u.searchParams.set("refresh",String(stamp));
  const response=await downstreamFetch(u.toString(),init);
  if(!response.ok)return {response,data:null};
  try{return {response,data:await response.clone().json()}}catch{return {response,data:null}}
}

window.fetch=async(input,init={})=>{
  const url=typeof input==="string"?input:input?.url||"";
  if(!url.includes("/api/sources?"))return downstreamFetch(input,init);

  let original="",mode=localStorage.getItem("viralclip_custom_niche")||"";
  try{const u=new URL(url,location.href);original=u.searchParams.get("query")||""}catch{}
  if(!mode)mode=nicheFromText(original);
  const cfg=CFG[mode];
  if(!cfg)return downstreamFetch(input,init);

  const stamp=Date.now();
  const results=[];
  for(let i=0;i<cfg.queries.length;i++){
    const result=await oneRequest(url,init,cfg.queries[i],stamp+i);
    results.push(result);
  }
  const primary=results[0];
  if(!primary?.response?.ok||!primary.data)return primary?.response||downstreamFetch(input,init);

  const pool=[];
  for(const result of results){if(Array.isArray(result.data?.items))pool.push(...result.data.items)}
  const items=uniqueRank(pool,cfg).slice(0,10);
  const out={...primary.data,items,query:cfg.queries[0],niche_filter:mode,niche_name:cfg.name,original_query:original,viral_sort:"views_desc",deduplicated:true,query_count:cfg.queries.length};
  return new Response(JSON.stringify(out),{status:primary.response.status,statusText:primary.response.statusText,headers:{"Content-Type":"application/json"}});
};
