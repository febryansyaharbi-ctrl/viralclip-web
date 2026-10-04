const VC_POLISH_VERSION = "20261005-polish-v2";
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
      const clip={id:`manual-${Date.now()}`,start,end,score:scoreText(text),title:words.slice(0,10).join(" ")||"Clip manual",caption:text?`${text.slice(0,180)}${text.length>180?"…":""}`:"Potongan manual dari video utama.",tags:tags(),target_market:market().name,upload_time:market().slot,render_job_id:data.job_id,video_url:`${API}/api/render/video/${data.job_id}`,download_url:`${API}/api/render/download/${data.job_id}`,manual:true};
      const a=analysis();
      const entry={id:`manual-history-${Date.now()}`,sourceUrl:a.video_url||a.url||a.sourceUrl||"Manual Trim",title:"Manual Trim",clips:[clip],createdAt:new Date().toISOString()};
      rawSet("viralclip_history",JSON.stringify([entry,...history()]));
    }catch(e){console.warn("[ViralClip] manual history save gagal",e)}
  }
  return response;
};

const css=document.createElement("style");
css.textContent=`
#vc-history-dashboard{margin:18px 0;padding:0;color:#e5e7eb;font-family:Inter,system-ui,sans-serif}
#vc-history-dashboard .vh-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
#vc-history-dashboard .vh-title{font-size:20px;font-weight:900;color:#fff}.vh-count{font-size:12px;color:#94a3b8}
#vc-history-dashboard .vh-entry{background:#0f172a;border:1px solid #334155;border-radius:16px;padding:14px;margin:12px 0}
#vc-history-dashboard .vh-entry-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.vh-entry-title{font-weight:800;color:#fff;word-break:break-word}
#vc-history-dashboard .vh-clip{display:grid;grid-template-columns:minmax(220px,360px) 1fr;gap:14px;background:#020617;border:1px solid #1e293b;border-radius:14px;padding:12px;margin-top:10px}
#vc-history-dashboard video{width:100%;aspect-ratio:9/16;max-height:440px;background:#000;border-radius:10px;object-fit:contain}
#vc-history-dashboard .vh-score{display:inline-block;background:#422006;color:#fde68a;border:1px solid #92400e;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:900;margin-bottom:8px}
#vc-history-dashboard .vh-label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:9px}.vh-value{color:#e2e8f0;line-height:1.45}.vh-tags{margin-top:5px}.vh-tag{display:inline-block;background:#1e293b;color:#cbd5e1;border-radius:999px;padding:4px 8px;margin:2px;font-size:11px}
#vc-history-dashboard .vh-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.vh-box{background:#111827;border:1px solid #273449;border-radius:10px;padding:9px;font-size:12px;color:#cbd5e1}
#vc-history-dashboard button{border:0;border-radius:9px;padding:8px 11px;font-weight:800;cursor:pointer}.vh-delete{background:#991b1b;color:#fff}.vh-delete-all{background:#7f1d1d;color:#fff}.vh-empty{background:#0f172a;border:1px dashed #475569;border-radius:14px;padding:24px;text-align:center;color:#94a3b8}
@media(max-width:700px){#vc-history-dashboard .vh-clip{grid-template-columns:1fr}#vc-history-dashboard .vh-info{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

let historyMode=false;
function cleanText(el){return String(el?.textContent||"").replace(/\s+/g," ").trim()}
function visible(el){if(!el)return false;const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden"}
function historyHeading(){return [...document.querySelectorAll("h1,h2,h3,h4")].find(x=>visible(x)&&/^\s*(riwayat|history)(\s|$)/i.test(cleanText(x)))||null}
function isHistoryClick(el){const b=el?.closest?.("button,a,[role='button']");return !!b&&/^\s*(riwayat|history)\s*$/i.test(cleanText(b))}
function isOtherNavClick(el){const b=el?.closest?.("button,a,[role='button']");if(!b)return false;const t=cleanText(b);return /^(dashboard|home|clipper|editor|export|analisis niche|niche|sumber|sources|rekomendasi)$/i.test(t)}

document.addEventListener("click",e=>{
  if(isHistoryClick(e.target)){
    historyMode=true;
    sessionStorage.setItem("viralclip_history_active","1");
    setTimeout(renderHistory,120);
    setTimeout(renderHistory,450);
  }else if(isOtherNavClick(e.target)){
    historyMode=false;
    sessionStorage.removeItem("viralclip_history_active");
    removeHistory();
  }
},false);

function getJob(c){if(c?.render_job_id)return c.render_job_id;const raw=String(c?.video_url||c?.download_url||"");const m=raw.match(/\/api\/render\/(?:video|download)\/([^/?#]+)/);return m?decodeURIComponent(m[1]):""}
function esc(v){return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]))}
function clipHtml(c){const j=getJob(c),tg=Array.isArray(c?.tags)?c.tags:[];const mkt=c?.target_market||market().name;const slot=c?.upload_time||market().slot;return `<div class="vh-clip">${j?`<video controls playsinline preload="metadata" src="${API}/api/render/video/${encodeURIComponent(j)}"></video>`:`<div class="vh-empty">Preview video tidak tersedia</div>`}<div><div class="vh-score">Score ${esc(c?.score??"-")}</div><div class="vh-label">Saran Judul</div><div class="vh-value"><b>${esc(c?.title||"Belum tersedia")}</b></div><div class="vh-label">Caption</div><div class="vh-value">${esc(c?.caption||"Belum tersedia")}</div><div class="vh-label">Saran Tagar</div><div class="vh-tags">${tg.length?tg.map(t=>`<span class="vh-tag">${esc(t)}</span>`).join(""):`<span class="vh-tag">Belum tersedia</span>`}</div><div class="vh-info"><div class="vh-box"><b>🎯 Target pasar</b><br>${esc(mkt)}</div><div class="vh-box"><b>🕒 Saran upload</b><br>${esc(slot)}</div></div>${c?.manual?`<div class="vh-label">Jenis</div><div class="vh-value">✂️ Manual Trim</div>`:""}</div></div>`}

async function deleteEntry(idx){const list=history();const ent=list[idx];if(!ent)return;const ids=(ent.clips||[]).map(getJob).filter(Boolean);try{if(ids.length)await fetch(`${API}/api/render/cleanup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:ids})})}catch{}list.splice(idx,1);rawSet("viralclip_history",JSON.stringify(list));renderHistory(true)}
async function deleteAll(){const list=history(),ids=list.flatMap(e=>(e.clips||[]).map(getJob)).filter(Boolean);try{if(ids.length)await fetch(`${API}/api/render/cleanup`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_ids:ids})})}catch{}rawSet("viralclip_history","[]");renderHistory(true)}

function nativeHistoryRoot(h){if(!h)return null;let p=h.parentElement;for(let i=0;i<4&&p;i++,p=p.parentElement){const txt=cleanText(p);if(txt.length>20&&(/riwayat|history/i.test(txt)))return p}return h.parentElement}
function hideNative(root,panel){if(!root)return;[...root.children].forEach(ch=>{if(ch===panel||ch.contains(panel)||/^H[1-4]$/.test(ch.tagName))return;if(!ch.dataset.vhOld){ch.dataset.vhOld=ch.style.display||""}ch.dataset.vhHidden="1";ch.style.display="none"})}
function restoreNative(){document.querySelectorAll('[data-vh-hidden="1"]').forEach(ch=>{ch.style.display=ch.dataset.vhOld||"";delete ch.dataset.vhHidden;delete ch.dataset.vhOld})}
function removeHistory(){document.getElementById("vc-history-dashboard")?.remove();restoreNative()}

function renderHistory(force=false){
  const h=historyHeading();
  const active=historyMode||sessionStorage.getItem("viralclip_history_active")==="1"||!!h;
  if(!active){removeHistory();return}
  historyMode=true;
  let panel=document.getElementById("vc-history-dashboard");
  const mount=h?.parentElement||document.querySelector("main")||document.body;
  if(!panel){panel=document.createElement("section");panel.id="vc-history-dashboard";if(h&&h.parentElement)h.insertAdjacentElement("afterend",panel);else mount.prepend(panel)}
  const list=history();
  panel.innerHTML=`<div class="vh-head"><div><div class="vh-title">Riwayat Lengkap</div><div class="vh-count">${list.length} hasil video tersimpan</div></div>${list.length?`<button class="vh-delete-all" data-vh-all>Hapus Semua</button>`:""}</div>${list.length?list.map((e,i)=>`<article class="vh-entry"><div class="vh-entry-top"><div><div class="vh-entry-title">${esc(e.title||e.sourceUrl||`Video ${i+1}`)}</div><div class="vh-count">${esc(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):"")}</div></div><button class="vh-delete" data-vh-del="${i}">Hapus</button></div>${(e.clips||[]).map(clipHtml).join("")||`<div class="vh-empty">Belum ada clip tersimpan.</div>`}</article>`).join(""):`<div class="vh-empty">Belum ada hasil render di riwayat.</div>`}`;
  panel.onclick=e=>{const d=e.target.closest("[data-vh-del]");if(d)deleteEntry(Number(d.dataset.vhDel));if(e.target.closest("[data-vh-all]"))deleteAll()};
  const root=nativeHistoryRoot(h);
  hideNative(root,panel);
  document.getElementById("vcx-history")?.remove();
}

setInterval(()=>{
  if(historyHeading())historyMode=true;
  if(historyMode||sessionStorage.getItem("viralclip_history_active")==="1")renderHistory();
},800);
setTimeout(()=>{if(historyHeading())renderHistory()},700);
