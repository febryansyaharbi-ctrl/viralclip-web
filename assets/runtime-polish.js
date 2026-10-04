const VC_POLISH_VERSION = "20261005-polish-v1";
const API = "https://harnet.tail89c9ef.ts.net";
console.info(`[ViralClip] polish ${VC_POLISH_VERSION}`);

const nativeFetch = window.fetch.bind(window);
const parse = (s,f=null)=>{try{return JSON.parse(s)}catch{return f}};
const rawSet = localStorage.setItem.bind(localStorage);

function analysis(){return parse(localStorage.getItem("viralclip_last_analysis"),{})||{}}
function history(){return parse(localStorage.getItem("viralclip_history"),[])||[]}
function segs(start,end){const a=analysis();const list=a.segments||a.transcription?.segments||[];return list.filter(s=>Number(s.end??s.start)>=Number(start)&&Number(s.start??0)<=Number(end))}
function textFor(start,end){return segs(start,end).map(s=>s.text||"").join(" ").replace(/\s+/g," ").trim()}
function scoreText(text){let s=72;if(/\?/.test(text))s+=4;if(/\b\d+(?:[.,]\d+)?\b/.test(text))s+=4;if(/rahasia|ternyata|jangan|penting|kesalahan|cara|tips|fakta|kunci|gagal|berhasil/i.test(text))s+=8;return Math.min(96,s)}
function niche(){return localStorage.getItem("viralclip_custom_niche")||"ai"}
function target(){return localStorage.getItem("viralclip_target_market")||"id"}
function tags(){const m={ai:["#AI","#AITools","#Tech"],finance:["#Finance","#MoneyTips","#Business"],career:["#Career","#Productivity","#Success"],property:["#RealEstate","#Property","#Investment"],health:["#Fitness","#Health","#HealthyLife"],kids:["#KidsLearning","#Parenting","#Education"],travel:["#Travel","#Food","#HiddenGem"],beauty:["#Beauty","#Skincare","#Fashion"],auto:["#Automotive","#Cars","#Motor"],education:["#Education","#Skills","#Learning"]};return [...(m[niche()]||["#Viral","#Shorts","#Reels"]),target()==="global"?"#Shorts":"#FYP","#Reels"]}
function market(){if(["finance","ai","career","property"].includes(niche()))return {name:"US/Canada + UK",slot:"US/Canada 05:00–10:00 WIB • UK 00:00–05:00 WIB"};return target()==="global"?{name:"Global",slot:"Australia 14:00–19:00 WIB • US/Canada 05:00–10:00 WIB"}:{name:"Indonesia",slot:"11:30–13:30 & 19:00–21:30 WIB"}}

window.fetch = async (input, init={}) => {
  const url = typeof input === "string" ? input : input?.url || "";
  let body = null;
  if(url.includes("/api/render-selected") && typeof init.body === "string"){
    try{body=JSON.parse(init.body)}catch{}
  }
  const response = await nativeFetch(input, init);
  if(response.ok && body?.framing_mode === "auto_face"){
    try{
      const data = await response.clone().json();
      const start=Number(body.start||0), end=Number(body.end||0), text=textFor(start,end), words=text.split(/\s+/).filter(Boolean);
      const clip={
        id:`manual-${Date.now()}`,
        start,end,
        score:scoreText(text),
        title:words.slice(0,10).join(" ")||"Clip manual",
        caption:text?`${text.slice(0,180)}${text.length>180?"…":""}`:"Potongan manual dari video utama.",
        tags:tags(),
        target_market:market().name,
        upload_time:market().slot,
        render_job_id:data.job_id,
        video_url:`${API}/api/render/video/${data.job_id}`,
        download_url:`${API}/api/render/download/${data.job_id}`,
        manual:true
      };
      const a=analysis();
      const entry={id:`manual-history-${Date.now()}`,sourceUrl:a.video_url||a.url||a.sourceUrl||"Manual Trim",title:"Manual Trim",clips:[clip],createdAt:new Date().toISOString()};
      rawSet("viralclip_history",JSON.stringify([entry,...history()]));
    }catch(e){console.warn("[ViralClip] manual history save gagal",e)}
  }
  return response;
};

function hideNativeHistory(){
  const panel=document.getElementById("vcx-history");
  if(!panel){document.querySelectorAll("[data-vcx-native-history]").forEach(el=>{el.style.display=el.dataset.vcxOldDisplay||"";delete el.dataset.vcxNativeHistory;delete el.dataset.vcxOldDisplay});return}
  const parent=panel.parentElement;if(!parent)return;
  [...parent.children].forEach(el=>{
    if(el===panel)return;
    if(/^H[1-4]$/.test(el.tagName))return;
    if(!el.dataset.vcxNativeHistory){el.dataset.vcxNativeHistory="1";el.dataset.vcxOldDisplay=el.style.display||""}
    el.style.display="none";
  });
}
setInterval(hideNativeHistory,700);
