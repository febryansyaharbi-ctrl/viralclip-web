const VC_RECO_VERSION = "20261006-reco-v4.2";
console.info(`[ViralClip] recommendations ${VC_RECO_VERSION}`);

const downstreamFetch = window.fetch.bind(window);
let recoGeneration = 0;
let sourceRequestSeq = 0;
let latestSourceContext = null;

const CFG = {
  ai: {
    name:"AI, Software & Teknologi",
    id:{queries:["AI Indonesia 2026","tools AI Indonesia 2026"],relevant:/\bai\b|kecerdasan buatan|teknologi|chatgpt|gemini|software|otomasi|automation|coding|tool/i},
    global:{queries:["AI tools 2026","artificial intelligence 2026"],relevant:/\bai\b|artificial intelligence|software|technology|tool|chatgpt|gemini|automation|coding|robot/i}
  },
  finance: {
    name:"Keuangan & Bisnis",
    banned:/tarot|horoscope|zodiac|capricorn|gemini|cancer|libra|aries|taurus|scorpio|sagittarius|aquarius|pisces|leo|virgo|politik|pemilu|presiden/i,
    id:{queries:["investasi keuangan Indonesia 2026","saham investasi Indonesia 2026"],relevant:/keuangan|investasi|uang|saham|pasar|bisnis|financial|finance|invest|stock|market|asset|portfolio/i},
    global:{queries:["finance investing 2026","personal finance 2026"],relevant:/finance|invest|money|financial|stock|market|asset|portfolio|wealth|business/i}
  },
  career: {
    name:"Karier & Produktivitas",
    id:{queries:["karier produktivitas Indonesia 2026","interview kerja Indonesia 2026"],relevant:/karier|produktivitas|interview|kerja|pekerjaan|career|productivity|job|leadership|professional/i},
    global:{queries:["career productivity 2026","job interview career 2026"],relevant:/career|productivity|interview|work|job|leadership|professional/i}
  },
  property: {
    name:"Properti & Real Estate",
    id:{queries:["properti investasi Indonesia 2026","rumah properti Indonesia 2026"],relevant:/properti|rumah|real estate|property|housing|mortgage|apartemen|renovasi/i},
    global:{queries:["real estate 2026","property investing 2026"],relevant:/real estate|property|house|home|housing|mortgage|apartment|renovation/i}
  },
  health: {
    name:"Kesehatan & Fitness",
    id:{queries:["fitness kesehatan Indonesia 2026","diet olahraga Indonesia 2026"],relevant:/fitness|kesehatan|olahraga|nutrisi|workout|gym|diet|exercise|weight loss/i},
    global:{queries:["fitness health 2026","workout nutrition 2026"],relevant:/fitness|health|workout|nutrition|gym|healthy|diet|exercise|weight loss/i}
  },
  education: {
    name:"Edukasi & Skill Profesional",
    banned:/roblox|executor|gaming|gameplay|free fire|mobile legends|character skill|rank match|football skill/i,
    id:{queries:["skill profesional Indonesia 2026","belajar coding Indonesia 2026","kursus online Indonesia 2026"],relevant:/edukasi|belajar|kursus|coding|pelatihan|sertifikat|skill|pendidikan|tutorial|course|learning/i},
    global:{queries:["education skills 2026","learn coding 2026","online course 2026"],relevant:/education|learning|course|study|school|coding|language|teacher|professional|training|certificate|skill/i}
  },
  auto: {
    name:"Otomotif",
    id:{queries:["review mobil Indonesia 2026","otomotif Indonesia 2026"],relevant:/otomotif|mobil|motor|kendaraan|review|mesin|car|motorcycle|vehicle|suv/i},
    global:{queries:["automotive review 2026","cars review 2026"],relevant:/automotive|car|cars|motorcycle|vehicle|review|engine|truck|suv/i}
  },
  beauty: {
    name:"Beauty, Skincare & Fashion",
    id:{queries:["skincare Indonesia 2026","makeup fashion Indonesia 2026"],relevant:/beauty|skincare|makeup|fashion|kosmetik|kulit|serum|style/i},
    global:{queries:["skincare beauty 2026","makeup fashion 2026"],relevant:/beauty|skincare|makeup|fashion|cosmetic|skin|serum|style/i}
  },
  travel: {
    name:"Travel, Kuliner & Hospitality",
    id:{queries:["wisata Indonesia 2026","kuliner Indonesia 2026"],relevant:/wisata|kuliner|hotel|destinasi|liburan|travel|restaurant|restoran|trip/i},
    global:{queries:["travel hidden gems 2026","travel hotel food 2026"],relevant:/travel|tourism|hotel|food|hidden gem|destination|vacation|trip|restaurant/i}
  },
  kids: {
    name:"Anak-anak & Edukasi Keluarga",
    banned:/politik|pemilu|presiden|menteri|partai|dpr|gubernur|pilkada|kampanye|prabowo|jokowi|anies|ganjar|parlemen|kabinet|election|politic|berita|timnas|menkopolkam|kelas sma|fakta mengejutkan|tarot|zodiak|roblox|kemenkes|bosp|jaminan sosial|visa pelajar|sekolah sabat|mazmur|tawuran|buntung|azab/i,
    id:{
      queries:["moonbug kids indonesia 2026","edukasi anak indonesia 2026","belajar anak indonesia 2026","cocomelon indonesia anak","little angel indonesia anak","lagu anak babybus indonesia","kartun anak bahasa indonesia","lagu anak indonesia 2026"],
      relevant:/bahasa indonesia|moonbug kids indonesia|nursery rhymes indonesia|lagu anak|kartun anak|anak indonesia|edukasi[^\n]*anak|anak[^\n]*edukasi|belajar[^\n]*anak|anak[^\n]*belajar|anak-anak|anak anak|anak prasekolah|untuk anak|kids indonesia|babybus bahasa indonesia|spookiz bahasa indonesia|sains seru untuk anak|sajak pendidikan/i
    },
    global:{
      queries:["kids learning 2026","toddler learning 2026","kids educational videos 2026"],
      relevant:/kids|children|toddler|preschool|nursery|learning|cartoon|baby|school|story/i
    }
  },
  motivation: {
    name:"Motivasi & Psikologi",
    id:{queries:["motivasi psikologi Indonesia 2026","pengembangan diri Indonesia 2026"],relevant:/motivasi|psikologi|pengembangan diri|mindset|mental|kebiasaan|disiplin|percaya diri|self improvement/i},
    global:{queries:["self improvement psychology 2026","motivation mindset 2026"],relevant:/self improvement|psychology|motivation|mindset|mental|habit|confidence|discipline/i}
  }
};

function cleanText(el){return String(el?.textContent||"").replace(/\s+/g," ").trim()}
function visible(el){if(!el)return false;const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0}
function currentTarget(){return localStorage.getItem("viralclip_target_market")==="global"?"global":"id"}

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

function targetFromText(value){
  const t=String(value||"").trim();
  if(/global|international|luar negeri|\(\s*en\s*\)/i.test(t))return"global";
  if(/indonesia|lokal|local|\(\s*id\s*\)/i.test(t))return"id";
  return"";
}

function triggerRecommendationRefresh(){
  const buttons=[...document.querySelectorAll("button,[role='button']")].filter(visible);
  const button=buttons.find(el=>/cari\s*10\s*bahan|cari.*video|perbarui.*rekomendasi|refresh.*rekomendasi/i.test(cleanText(el)));
  if(button)setTimeout(()=>button.click(),180);
}

document.addEventListener("click",event=>{
  const control=event.target.closest("button,a,[role='button']");
  if(!control)return;
  const text=cleanText(control);

  const target=targetFromText(text);
  if(target){
    const previous=currentTarget();
    localStorage.setItem("viralclip_target_market",target);
    localStorage.setItem("viralclip_reco_target_changed_at",String(Date.now()));
    recoGeneration++;
    window.dispatchEvent(new CustomEvent("viralclip:target-change",{detail:{target}}));
    if(previous!==target)triggerRecommendationRefresh();
  }

  const niche=nicheFromText(text);
  if(niche&&CFG[niche]){
    const previous=localStorage.getItem("viralclip_custom_niche")||"";
    localStorage.setItem("viralclip_custom_niche",niche);
    localStorage.setItem("viralclip_custom_niche_name",CFG[niche].name);
    if(previous!==niche){recoGeneration++;triggerRecommendationRefresh()}
  }
},true);

function uniqueRank(items,cfg,profile){
  const seen=new Set();
  return (items||[])
    .filter(Boolean)
    .filter(item=>{
      const title=String(item.title||"");
      const all=`${title} ${item.channel||""}`;
      if(cfg.banned&&cfg.banned.test(all))return false;
      if(profile.banned&&profile.banned.test(all))return false;
      return profile.relevant.test(title);
    })
    .sort((a,b)=>Number(b.views||0)-Number(a.views||0))
    .filter(item=>{
      const key=String(item.id||item.url||`${item.title}|${item.channel}`).toLowerCase();
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
}

async function oneRequest(url,init,query,stamp,target){
  const u=new URL(url,location.href);
  u.searchParams.set("query",query);
  u.searchParams.set("refresh",String(stamp));
  u.searchParams.set("target",target);
  const response=await downstreamFetch(u.toString(),init);
  if(!response.ok)return {response,data:null};
  try{return {response,data:await response.clone().json()}}catch{return {response,data:null}}
}

async function buildRecommendation(url,init,mode,target,requestSeq,original){
  const cfg=CFG[mode];
  const profile=cfg?.[target];
  if(!cfg||!profile)return downstreamFetch(url,init);

  const stamp=Date.now();
  const results=[];
  for(let i=0;i<profile.queries.length;i++){
    const result=await oneRequest(url,init,profile.queries[i],stamp+i,target);
    results.push(result);
  }

  // Jika request lama selesai belakangan, jangan biarkan hasil niche/target lama
  // menimpa daftar terbaru milik React.
  if(requestSeq!==sourceRequestSeq && latestSourceContext){
    const ctx=latestSourceContext;
    return buildRecommendation(url,init,ctx.mode,ctx.target,sourceRequestSeq,ctx.original);
  }

  const primary=results[0];
  if(!primary?.response?.ok||!primary.data)return primary?.response||downstreamFetch(url,init);

  const pool=[];
  for(const result of results){if(Array.isArray(result.data?.items))pool.push(...result.data.items)}
  const items=uniqueRank(pool,cfg,profile).slice(0,10);
  const out={
    ...primary.data,
    items,
    query:profile.queries[0],
    niche_filter:mode,
    niche_name:cfg.name,
    target_market:target,
    locale_filter:target==="id"?"Indonesia":"Global",
    original_query:original,
    viral_sort:"views_desc",
    deduplicated:true,
    query_count:profile.queries.length
  };
  return new Response(JSON.stringify(out),{status:primary.response.status,statusText:primary.response.statusText,headers:{"Content-Type":"application/json"}});
}

window.fetch=async(input,init={})=>{
  const url=typeof input==="string"?input:input?.url||"";
  if(!url.includes("/api/sources?"))return downstreamFetch(input,init);

  let original="";
  try{const u=new URL(url,location.href);original=u.searchParams.get("query")||""}catch{}

  // Query yang dibuat React adalah sumber kebenaran utama.
  // LocalStorage hanya fallback agar state lama tidak bisa mengalahkan pilihan UI terbaru.
  const queryMode=nicheFromText(original);
  const storedMode=localStorage.getItem("viralclip_custom_niche")||"";
  const mode=CFG[queryMode]?queryMode:storedMode;
  if(!CFG[mode])return downstreamFetch(input,init);

  // Semua query lokal bawaan React mengandung kata "Indonesia".
  // Query internasional tidak mengandungnya.
  const queryTarget=/\bindonesia\b/i.test(original)?"id":(queryMode?"global":currentTarget());

  // Sinkronkan metadata lain ke state React aktual.
  localStorage.setItem("viralclip_custom_niche",mode);
  localStorage.setItem("viralclip_custom_niche_name",CFG[mode].name);
  localStorage.setItem("viralclip_target_market",queryTarget);

  const requestSeq=++sourceRequestSeq;
  latestSourceContext={mode,target:queryTarget,original};
  return buildRecommendation(url,init,mode,queryTarget,requestSeq,original);
};
