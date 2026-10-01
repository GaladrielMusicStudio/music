let APP={canales:[],packs:[]};


const SHOW_AUDIO=true;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const enc=s=>new URLSearchParams({q:String(s)}).toString().slice(2);
const qs=obj=>new URLSearchParams(obj).toString();
const cleanRemoteUrl=url=>String(url||"").replace(/\\u0026/g,"&").replace(/\\u003d/g,"=").replace(/\\\//g,"/").replace(/&amp;/g,"&");
const pad=n=>String(n+1).padStart(2,"0");
const fmt=n=>{n=Math.max(0,Number(n)||0);if(n<1000)return String(Math.floor(n));const unit=n>=999950?1e6:1e3;return new Intl.NumberFormat("es-ES",{maximumFractionDigits:1}).format(n/unit)+(unit===1e6?"M":"K")};
function popularChannels(){return [...CH].sort((a,b)=>(Number(b.metricsTrusted)-Number(a.metricsTrusted))||(a.metricsTrusted&&b.metricsTrusted?b.totalViews-a.totalViews:0)||CH.indexOf(a)-CH.indexOf(b))}
// The Escuchar carousel has its own stable editorial order. Its opening
// neighbours must always be Heavenly ← Galadriel Symphony → The Velvet Atlas,
// regardless of the changing popularity metrics used on the Canales page.
function listenCarouselOrder(){
  const featured=["@Heavenly_Echoes_Sounds","@Galadriel_Symphony","@TheVelvetAtlasMusic"]
    .map(handle=>CH.find(c=>c.handle===handle)).filter(Boolean);
  return [...featured,...CH.filter(c=>!featured.includes(c))];
}
const fecha=iso=>{if(!iso)return"";const d=(Date.now()-new Date(iso))/864e5;if(d<1)return"Hoy";if(d<2)return"Ayer";if(d<7)return`Hace ${Math.floor(d)} días`;if(d<35)return`Hace ${Math.floor(d/7)} semanas`;return new Date(iso).toLocaleDateString("es-PE",{day:"numeric",month:"long"})};
const dur=iso=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso||"");if(!m)return"";const h=+m[1]||0,mi=+m[2]||0,sg=+m[3]||0;return h?`${h}:${String(mi).padStart(2,"0")}:${String(sg).padStart(2,"0")}`:`${mi}:${String(sg).padStart(2,"0")}`};
function getText(url){
  if(typeof fetch==="function") return fetch(url).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.text()});
  if(typeof XMLHttpRequest==="function") return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open("GET",url,true);x.onload=()=>x.status>=200&&x.status<300?resolve(x.responseText):reject(new Error("HTTP "+x.status));x.onerror=()=>reject(new Error("Network error"));x.send()});
  return Promise.reject(new Error("No network API available"));
}
// Safari iPhone older than 16.4 has no AbortSignal.timeout().
// AbortController + setTimeout works on considerably more mobile browsers.
function fetchWithTimeout(url,options={},milliseconds=15000){
  const controller=typeof AbortController==="function"?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),milliseconds):null;
  return fetch(url,{...options,...(controller?{signal:controller.signal}:{})}).finally(()=>{if(timer!==null)clearTimeout(timer)});
}
const getJson=async url=>{
  if(typeof fetch==="function"){
    const response=await fetchWithTimeout(url,{},15000);
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      const error=new Error(data?.error?.message||`HTTP ${response.status}`);
      error.status=response.status;
      throw error;
    }
    return data;
  }
  return getText(url).then(JSON.parse);
};
let CH=[];
let active=1,listenActive=1,view="canales",panelOpen=false,railOffset=0,railSettleTimer=0;
function buildChannels(){
  CH=APP.canales.map(c=>({...c,avatar:"",videos:[],subs:0,totalViews:0,nVideos:0,loaded:false,metricsTrusted:false}));
  const galadriel=CH.findIndex(c=>c.handle==="@Galadriel_Symphony");
  listenActive=galadriel>=0?galadriel:Math.min(1,Math.max(0,CH.length-1));
}

function iconPlay(){return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>`}
function audioWave(){return `<span class="audio-wave" aria-hidden="true">${Array.from({length:18},()=>"<i></i>").join("")}</span>`}
function audioBlock(label,src,c={}){
  if(!SHOW_AUDIO||!src) return "";
  return `<div class="audio-card audio-orb" data-audio-player><audio preload="none" controlslist="nodownload noplaybackrate" src="${esc(src)}"></audio><button class="player-btn" type="button" data-audio-play aria-label="Reproducir ${esc(c.nombre||label)}">${iconPlay()}</button></div>`;
}
function homeAudioBlock(c){
  const available=SHOW_AUDIO&&!!c.audio;
  return `<div class="tt-console ${available?'':'is-unavailable'}" data-audio-player>${available?`<audio preload="metadata" controlslist="nodownload noplaybackrate" src="${esc(c.audio)}"></audio>`:''}<button class="tt-play" type="button" data-audio-play aria-label="Reproducir ${esc(c.nombre)}" ${available?'':'disabled'}>${iconPlay()}</button><div class="tt-timeline"><span data-audio-current>0:00</span><input type="range" data-audio-seek min="0" max="100" value="0" step="0.1" aria-label="Posición de la canción" disabled><span data-audio-duration>--:--</span></div><label class="tt-volume"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm12-1c3 2 3 6 0 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><input type="range" data-audio-volume min="0" max="1" step="0.01" value="0.9" aria-label="Volumen" ${available?'':'disabled'}></label><span class="tt-status" data-audio-status role="status">${available?'':''}</span></div>`;
}
function timeAudio(s){s=Number.isFinite(s)?Math.max(0,s):0;return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`}
function paintRange(input,val,max=100){const pct=max?Math.min(100,Math.max(0,val/max*100)):0;input.style.setProperty("--fill",pct+"%")}
function syncDiscProgress(card,pct,playing=false){
  if(card.classList.contains("listen-player")){
    const hero=document.querySelector("#view-escuchar .listen-hero");
    hero?.classList.toggle("is-audio-playing",playing);
    // The actual, accessible [data-audio-play] button now lives directly on the
    // small waveform vinyl; initPlayers() synchronizes its play/pause state.
    return;
  }
  const target=card.closest("#homeAudio")?document.querySelector(".record-zone"):card.closest(".listen-disc");
  if(!target)return;
  target.style.setProperty("--disc-progress",pct+"%");
  const ring=target.querySelector?.(".progress-ring circle");
  if(ring)ring.style.strokeDashoffset=String(100-pct);
  target.classList.toggle("is-audio-playing",playing);
  if(card.closest("#homeAudio"))window.galadrielTurntable?.setPlaying(playing);
}
function initPlayers(root=document){
  root.querySelectorAll("[data-audio-player]").forEach(card=>{
    if(card.dataset.ready)return;
    card.dataset.ready="1";
    const audio=card.querySelector("audio"),play=card.querySelector("[data-audio-play]"),seek=card.querySelector("[data-audio-seek]"),vol=card.querySelector("[data-audio-volume]"),now=card.querySelector("[data-audio-current]"),end=card.querySelector("[data-audio-duration]"),audioLabel=card.querySelector("[data-audio-label]");
    if(!audio)return;
    if(card.classList.contains("listen-player"))drawListenWaveRest(card.querySelector("[data-audio-wave]"));
    audio.addEventListener('error',()=>{play.disabled=true;play.setAttribute('aria-label','Muestra no disponible');if(seek)seek.disabled=true;if(vol)vol.disabled=true;const caption=card.closest('.record-zone')?.querySelector('.sample-caption');if(caption)caption.textContent='Muestra de audio aún no disponible';},{once:true});
    audio.volume=vol?+vol.value:.9;
    if(seek)paintRange(seek,0); if(vol)paintRange(vol,+vol.value,1);
    const update=()=>{play.setAttribute("aria-label",audio.paused?"Reproducir muestra":"Pausar muestra");play.setAttribute("aria-pressed",String(!audio.paused));if(audioLabel)audioLabel.textContent=audio.paused?"Escuchar muestra":"Pausar muestra";const d=Number.isFinite(audio.duration)?audio.duration:0,pct=d?Math.min(100,Math.max(0,audio.currentTime/d*100)):0;card.style.setProperty("--audio-progress",pct+"%");syncDiscProgress(card,pct,!audio.paused&&!audio.ended);if(seek){seek.disabled=!d;seek.max=d||100;seek.value=audio.currentTime||0;paintRange(seek,+seek.value,+seek.max)}if(now)now.textContent=timeAudio(audio.currentTime);if(end)end.textContent=d?timeAudio(d):"--:--"};
    const status=card.querySelector('[data-audio-status]');
    const fail=()=>{card.classList.remove('is-loading','is-playing');card.classList.add('is-error');syncDiscProgress(card,0,false);if(status)status.textContent='No se pudo reproducir esta muestra. Inténtalo de nuevo más tarde.';};
    play.addEventListener("click",()=>{
      card.classList.remove('is-error');if(status)status.textContent='';
      if(audio.paused){
        document.querySelectorAll("audio").forEach(a=>{if(a!==audio)a.pause()});
        document.querySelectorAll("[data-audio-player]").forEach(p=>{if(p!==card)p.classList.remove("is-open","is-playing")});
        card.classList.add("is-open","is-loading");
        if(card.classList.contains("listen-player")){const waveState=ensureListenAnalyser(card,audio);waveState?.ctx?.resume?.().catch(()=>{})}
        audio.play().catch(fail);
      }else{audio.pause();card.classList.remove("is-open");update()}
    });
    seek?.addEventListener("input",()=>{audio.currentTime=+seek.value||0;update()});
    vol?.addEventListener("input",()=>{audio.volume=+vol.value;paintRange(vol,+vol.value,1)});
    audio.addEventListener("loadedmetadata",update);
    audio.addEventListener("timeupdate",update);
    audio.addEventListener("waiting",()=>{card.classList.add("is-loading");syncDiscProgress(card,0,false)});
    audio.addEventListener("playing",()=>{card.classList.remove("is-loading");if(card.classList.contains("listen-player"))startListenWave(card,audio);update()});
    audio.addEventListener("canplay",()=>card.classList.remove("is-loading"));
    audio.addEventListener("play",()=>{card.classList.remove("is-loading");card.classList.add("is-playing");if(card.classList.contains("listen-player"))startListenWave(card,audio);update()});
    audio.addEventListener("pause",()=>{card.classList.remove("is-playing","is-loading");if(card.classList.contains("listen-player"))stopListenWave(audio);update()});
    audio.addEventListener("ended",()=>{card.classList.remove("is-playing","is-open");if(card.classList.contains("listen-player"))stopListenWave(audio);card.style.setProperty("--audio-progress","100%");syncDiscProgress(card,100,false);update()});
    audio.addEventListener("error",fail);
  });
}
function links(c){
  const entries=Object.entries(c.enlaces||{});
  const you=c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`;
  return `<div class="platforms"><a class="primary" href="${esc(you)}?sub_confirmation=1" target="_blank" rel="noopener noreferrer">YouTube</a>${entries.filter(([n])=>n!=="YouTube").map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`).join("")}</div>`;
}
function seal(c){
  return `<span class="channel-seal" style="--seal:${esc(c.accent||"#b89146")}"><b>${esc((c.mono||"GS").replace(/\s+/g,""))}</b></span>`;
}
function videoCard(v,c={}){
  // On an iPhone or an in-app browser (e.g. WhatsApp), a new tab may be blocked.
  // Use the normal, non-embedded YouTube watch URL in the same tab on touch devices.
  const href=v.id?`https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`:(c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`);
  const target=matchMedia("(pointer:coarse), (max-width:820px)").matches?"_self":"_blank";
  const media=v.thumbnail?`<img src="${esc(v.thumbnail||"")}" alt="" loading="lazy" onerror="this.closest('.video-card')?.classList.add('is-fallback');this.closest('.thumb').innerHTML='<span class=&quot;fallback-title&quot;>${esc(v.tag||v.title).replace(/'/g,"&#39;")}</span>'">`:`<span class="fallback-title">${esc(v.tag||v.title)}</span>`;
  const cls=v.id?"video-card":"video-card is-fallback";
  const views=c.metricsTrusted?fmt(v.vistas)+" vistas · ":"";
  const label=v.badge||(!c.metricsTrusted&&v.featured?"Selección destacada":fecha(v.date)||"Selección destacada");
  return `<a class="${cls}" style="--thumb-a:${esc(c.accent||"#b89146")};--thumb-b:#111" href="${esc(href)}" target="${target}" rel="noopener noreferrer" aria-label="Abrir en YouTube: ${esc(v.title)}"><span class="thumb" data-mark="${esc((c.mono||"GS").replace(/\s+/g,""))}">${media}${v.dur?`<span class="video-duration">${esc(v.dur)}</span>`:""}</span><b>${esc(v.title)}</b><small>${views}${esc(label)}</small></a>`;
}
function railVisibleCount(){return innerWidth<=560?1:innerWidth<=900?2:3}
function ensureRailWindow(order){
  const visible=railVisibleCount(),max=Math.max(0,order.length-visible),activePos=Math.max(0,order.indexOf(CH[active]));
  if(activePos<railOffset)railOffset=activePos;
  if(activePos>=railOffset+visible)railOffset=activePos-visible+1;
  railOffset=Math.max(0,Math.min(max,railOffset));
}
function updateRailControls(){
  const order=popularChannels(),max=Math.max(0,order.length-railVisibleCount());
  const prev=$("#channelPrev"),next=$("#channelNext");
  if(prev){prev.disabled=railOffset<=0;prev.setAttribute("aria-disabled",String(railOffset<=0))}
  if(next){next.disabled=railOffset>=max;next.setAttribute("aria-disabled",String(railOffset>=max))}
}
function applyRailPosition(animate=true){
  const rail=$("#channelRail"),viewport=$("#channelViewport");
  if(!rail||!viewport)return;
  viewport.dataset.visible=String(railVisibleCount());
  const first=rail.querySelector("li");
  if(!first){rail.style.transform="translate3d(0,0,0)";return}
  const gap=parseFloat(getComputedStyle(rail).columnGap||getComputedStyle(rail).gap)||0;
  const step=first.getBoundingClientRect().width+gap;
  if(!animate)rail.classList.add("no-transition");
  rail.style.transform=`translate3d(${-railOffset*step}px,0,0)`;
  rail.dataset.offset=String(railOffset);
  updateRailControls();
  if(!animate)requestAnimationFrame(()=>requestAnimationFrame(()=>rail.classList.remove("no-transition")));
}
function renderRail(){
  const order=popularChannels();
  ensureRailWindow(order);
  const rail=$("#channelRail");
  rail.innerHTML=order.map(c=>{
    const i=CH.indexOf(c);
    const avatar=c.avatar?`<img src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer">`:seal(c);
    return `<li><button data-i="${i}" aria-current="${i===active?"true":"false"}" aria-label="Ver ${esc(c.nombre)}"><span class="rail-avatar">${avatar}</span><span class="rail-copy"><span class="label">${esc(c.nombre)}</span></span></button></li>`;
  }).join("");
  requestAnimationFrame(()=>applyRailPosition(false));
}
function nudgeArrow(button,direction){
  if(!button?.animate||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  button.animate([{transform:"translateX(0)"},{transform:`translateX(${direction*3}px)`},{transform:"translateX(0)"}],{duration:190,easing:"ease-out"});
}
function moveRail(delta){
  const order=popularChannels(),visible=railVisibleCount(),max=Math.max(0,order.length-visible);
  const next=Math.max(0,Math.min(max,railOffset+delta));
  if(next===railOffset){nudgeArrow(delta<0?$("#channelPrev"):$("#channelNext"),delta);return}
  railOffset=next;
  applyRailPosition(true);
  clearTimeout(railSettleTimer);
  const activePos=Math.max(0,order.indexOf(CH[active]));
  let targetPos=-1;
  if(activePos<next)targetPos=next;
  else if(activePos>=next+visible)targetPos=next+visible-1;
  if(targetPos>=0){
    railSettleTimer=setTimeout(()=>setActive(CH.indexOf(order[targetPos])),420);
  }
}
function animateChannelInfo(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const info=document.querySelector("#canales .channel-info-wrap");
  const selected=document.querySelector("#channelRail button[aria-current=true]");
  info?.animate([{opacity:.35,transform:"translateY(10px)"},{opacity:1,transform:"translateY(0)"}],{duration:360,easing:"cubic-bezier(.22,1,.36,1)"});
  selected?.animate([{transform:"translateY(4px)",opacity:.6},{transform:"translateY(0)",opacity:1}],{duration:320,easing:"cubic-bezier(.22,1,.36,1)"});
}
function renderHero(){
  const c=CH[active];
  const home=$("#homeAudio");
  const audioKey=c.handle+'|'+(c.audio||'');
  if(home.dataset.channelAudio!==audioKey){
    home.querySelector('audio')?.pause();
    window.galadrielTurntable?.setPlaying(false);
    document.querySelector('.record-zone')?.classList.remove('is-audio-playing');
    home.dataset.channelAudio=audioKey;
    home.innerHTML=homeAudioBlock(c);
  }
  const order=popularChannels(),position=Math.max(0,order.indexOf(c));
  const views=c.metricsTrusted?fmt(c.totalViews):"—";
  const subs=c.metricsTrusted?(c.subsHidden?"Ocultos":fmt(c.subs)):"—";
  $("#currentMeta").innerHTML=`<div class="meta-index"><span>${pad(position)} / ${String(order.length).padStart(2,"0")}</span><i aria-hidden="true"></i></div><p class="name">${esc(c.nombre)}</p><p class="cat">${esc(c.hook||c.cat)}</p><p class="meta-description">${esc(c.line||"")}</p><div class="current-stats"><span><b>${esc(views)}</b><small>Vistas</small></span><i aria-hidden="true"></i><span><b>${esc(subs)}</b><small>Suscriptores</small></span></div>`;
  const directLink=$("#currentChannelLink");
  if(directLink){directLink.href=c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`;directLink.setAttribute("aria-label",`Ver canal ${c.nombre}`)}
  const avatar=document.querySelector('.tt-avatar');
  const avatarRing=document.querySelector('.tt-avatar-ring');
  if(avatar){
    const iconUrl=c.avatar||"";
    avatar.onerror=()=>{avatar.setAttribute('visibility','hidden');avatarRing?.setAttribute('visibility','hidden')};
    avatar.setAttribute('visibility',iconUrl?'visible':'hidden');
    avatar.setAttribute('aria-label',`Icono del canal ${c.nombre}`);
    avatarRing?.setAttribute('visibility',iconUrl?'visible':'hidden');
    if(iconUrl){
      avatar.setAttribute('href',iconUrl);
      avatar.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',iconUrl);
    }else{
      avatar.removeAttribute('href');
      avatar.removeAttributeNS('http://www.w3.org/1999/xlink','href');
    }
  }
  document.querySelectorAll('.current-identity img').forEach(img=>{img.onerror=()=>{img.hidden=true}});
  const caption=document.querySelector('.sample-caption');if(caption)caption.textContent=c.audio?'':'Muestra de audio aún no disponible';
  $("#touchDisc").setAttribute('aria-label','Ver '+c.nombre);
  const stats=c.metricsTrusted?fmt(c.totalViews)+" vistas"+(c.subsHidden?"":" · "+fmt(c.subs)+" suscriptores"):"";
  const topVideos=c.videos.slice(0,3);
  $("#channelPanel").innerHTML=`<div class="panel-actions"><button class="ghost" id="closePanel">Cerrar</button></div><div class="panel-top"><div class="panel-copy"><strong class="ghost">${esc(c.handle)}</strong><p>${esc(c.line)}</p>${stats?`<p>${esc(stats)}</p>`:""}${links(c)}</div></div>${topVideos.length?`<div class="panel-videos"><div class="videos">${topVideos.map(v=>videoCard(v,c)).join("")}</div></div>`:""}`;
  document.body.classList.toggle("disc-open",panelOpen);
  $("#openDisc")?.setAttribute("aria-expanded",String(panelOpen));
  $("#touchDisc").setAttribute("aria-expanded",String(panelOpen));
  renderRail();
  initPlayers($("#channelPanel"));
  initPlayers($("#homeAudio"));
}
function placeholderVideos(c){
  return `<p class="empty">${c.loaded?(c.videoError?'No se pudieron cargar los videos de YouTube.':'Este canal no tiene videos públicos disponibles.'):"Cargando videos de YouTube…"} <a href="${esc(c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`)}" target="_blank" rel="noopener noreferrer">Abrir canal en YouTube →</a></p>`;
}
function listenVideos(c,count=8){
  return [...(c.videos||[])].sort((a,b)=>c.metricsTrusted?(+b.vistas||0)-(+a.vistas||0):(new Date(b.date||0)-new Date(a.date||0))).slice(0,count);
}
function listenAvatar(c,cls=""){
  return c.avatar
    ?`<span class="listen-avatar ${cls}"><img src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer"></span>`
    :`<span class="listen-avatar ${cls}">${seal(c)}</span>`;
}
function listenCover(c){return listenVideos(c,1)[0]?.thumbnail||""}
// Opens YouTube's own subscription confirmation; never subscribes the visitor silently.
function listenSubscribeHref(c){
  if(/^UC[A-Za-z0-9_-]{22}$/.test(c.channelId||""))
    return `https://www.youtube.com/channel/${encodeURIComponent(c.channelId)}?sub_confirmation=1`;
  const url=new URL(c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`);
  url.searchParams.set("sub_confirmation","1");
  return url.href;
}
const listenWaveStates=new WeakMap();
let listenAudioContext=null;
function listenWave(available=false,name=""){
  return `<div class="listen-wave-art"><span class="listen-wave-vinyl" aria-hidden="true"><i></i></span>${available?`<button class="listen-wave-play" type="button" data-audio-play aria-label="Reproducir muestra de ${esc(name)}" aria-pressed="false" title="Reproducir o pausar muestra de audio">${iconPlay()}</button>`:""}<canvas class="listen-wave-canvas" aria-hidden="true" data-audio-wave width="760" height="120"></canvas><svg class="listen-headphones" aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 26v-4a15 15 0 0 1 30 0v4"/><rect x="6" y="24" width="8" height="16" rx="3"/><rect x="34" y="24" width="8" height="16" rx="3"/></svg></div>`;
}
function sizeListenWaveCanvas(canvas){
  if(!canvas)return null;
  const cssW=Math.max(1,Math.round(canvas.clientWidth||380));
  const cssH=Math.max(1,Math.round(canvas.clientHeight||88));
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(cssW*dpr)),h=Math.max(1,Math.round(cssH*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,w:cssW,h:cssH};
}
function drawListenWaveRest(canvas){
  const sized=sizeListenWaveCanvas(canvas);if(!sized)return;
  const {ctx,w,h}=sized,mid=h/2;ctx.clearRect(0,0,w,h);
  const grad=ctx.createLinearGradient(0,0,w,0);grad.addColorStop(0,"rgba(187,132,55,.35)");grad.addColorStop(.16,"rgba(239,185,91,.88)");grad.addColorStop(.5,"rgba(255,211,128,.95)");grad.addColorStop(.84,"rgba(239,185,91,.88)");grad.addColorStop(1,"rgba(187,132,55,.35)");
  ctx.strokeStyle=grad;ctx.lineWidth=1.7;ctx.lineCap="round";ctx.lineJoin="round";ctx.shadowColor="rgba(230,167,72,.28)";ctx.shadowBlur=7;
  ctx.beginPath();
  const points=72;
  for(let i=0;i<points;i++){const x=i/(points-1)*w;const envelope=Math.sin(Math.PI*i/(points-1));const y=mid+Math.sin(i*.83)*Math.sin(i*.19)*h*.055*envelope;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
  ctx.stroke();ctx.shadowBlur=0;
}
function ensureListenAnalyser(card,audio){
  const canvas=card?.querySelector?.("[data-audio-wave]");
  if(!canvas)return null;
  let state=listenWaveStates.get(audio);
  if(state){state.canvas=canvas;return state}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){drawListenWaveRest(canvas);return null}
  try{
    if(!listenAudioContext)listenAudioContext=new AC();
    const source=listenAudioContext.createMediaElementSource(audio);
    const analyser=listenAudioContext.createAnalyser();
    analyser.fftSize=1024;
    analyser.minDecibels=-88;
    analyser.maxDecibels=-18;
    analyser.smoothingTimeConstant=.80;
    source.connect(analyser);analyser.connect(listenAudioContext.destination);
    state={ctx:listenAudioContext,source,analyser,data:new Uint8Array(analyser.frequencyBinCount),canvas,raf:0,smoothed:[]};
    listenWaveStates.set(audio,state);
    drawListenWaveRest(canvas);
    return state;
  }catch(_){drawListenWaveRest(canvas);return null}
}
function drawListenWaveLive(state){
  const {analyser,data,canvas}=state;
  const sized=sizeListenWaveCanvas(canvas);if(!sized)return;
  analyser.getByteFrequencyData(data);
  const {ctx,w,h}=sized,mid=h/2,points=62,maxBin=Math.max(8,Math.min(data.length-1,190));
  ctx.clearRect(0,0,w,h);
  const amps=[];
  for(let i=0;i<points;i++){
    const t=i/(points-1);
    const idx=Math.min(maxBin,Math.floor(Math.pow(t,.72)*maxBin));
    const raw=Math.min(1,(data[idx]||0)/235);
    const previous=state.smoothed[i]??raw;
    const smooth=previous*.68+raw*.32;state.smoothed[i]=smooth;
    const edge=.62+.38*Math.sin(Math.PI*t);
    amps.push(Math.max(.018,smooth*edge));
  }
  const grad=ctx.createLinearGradient(0,0,w,0);grad.addColorStop(0,"rgba(180,121,45,.34)");grad.addColorStop(.12,"#dba84f");grad.addColorStop(.5,"#ffd784");grad.addColorStop(.88,"#dba84f");grad.addColorStop(1,"rgba(180,121,45,.34)");
  const fill=ctx.createLinearGradient(0,0,0,h);fill.addColorStop(0,"rgba(245,190,89,.05)");fill.addColorStop(.5,"rgba(255,211,128,.16)");fill.addColorStop(1,"rgba(245,190,89,.05)");
  const top=amps.map((a,i)=>[i/(points-1)*w,mid-a*h*.40]);
  const bottom=amps.map((a,i)=>[i/(points-1)*w,mid+a*h*.40]);
  ctx.beginPath();ctx.moveTo(top[0][0],top[0][1]);
  for(let i=1;i<top.length;i++){const [x0,y0]=top[i-1],[x1,y1]=top[i];ctx.quadraticCurveTo(x0,y0,(x0+x1)/2,(y0+y1)/2)}
  ctx.lineTo(top[top.length-1][0],top[top.length-1][1]);
  for(let i=bottom.length-1;i>0;i--){const [x0,y0]=bottom[i],[x1,y1]=bottom[i-1];ctx.quadraticCurveTo(x0,y0,(x0+x1)/2,(y0+y1)/2)}
  ctx.lineTo(bottom[0][0],bottom[0][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  ctx.strokeStyle=grad;ctx.lineWidth=1.75;ctx.lineCap="round";ctx.lineJoin="round";ctx.shadowColor="rgba(238,174,75,.42)";ctx.shadowBlur=8;
  const drawEdge=pts=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];ctx.quadraticCurveTo(x0,y0,(x0+x1)/2,(y0+y1)/2)}ctx.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);ctx.stroke()};
  drawEdge(top);drawEdge(bottom);
  ctx.shadowBlur=0;ctx.strokeStyle="rgba(237,184,91,.32)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(w,mid);ctx.stroke();
}
function startListenWave(card,audio){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){drawListenWaveRest(card?.querySelector?.("[data-audio-wave]"));return}
  const state=ensureListenAnalyser(card,audio);if(!state)return;
  state.ctx.resume?.().catch(()=>{});
  cancelAnimationFrame(state.raf);
  const tick=()=>{if(audio.paused||audio.ended){state.raf=0;return}drawListenWaveLive(state);state.raf=requestAnimationFrame(tick)};
  state.raf=requestAnimationFrame(tick);
}
function stopListenWave(audio){
  const state=listenWaveStates.get(audio);if(!state)return;cancelAnimationFrame(state.raf);state.raf=0;drawListenWaveRest(state.canvas);
}
function listenSleeve(c,index,side){
  return `<button class="listen-side-sleeve listen-side-sleeve--${side}" type="button" data-listen-i="${index}" aria-label="Seleccionar ${esc(c.nombre)}"><span class="listen-side-logo">${listenAvatar(c,"listen-avatar--side")}</span><span class="listen-side-name">${esc(c.nombre)}</span></button>`;
}
function renderListen(){
  const host=$("#listenList");
  if(!host||!CH.length)return;
  // Keep the ambient animation alive between channel changes; only the covers
  // and channel-specific information need to be replaced.
  const retainedAmbient=host.querySelector("video.listen-ambient");
  const retained=new Map([...host.querySelectorAll("[data-audio-player]")].map(card=>[card.querySelector("audio")?.getAttribute("src"),card]));
  const ordered=listenCarouselOrder();
  const c=CH[listenActive]||ordered[0]||CH[0];
  if(!c)return;
  listenActive=CH.indexOf(c);
  const pos=Math.max(0,ordered.indexOf(c));
  const prev=ordered[(pos-1+ordered.length)%ordered.length];
  const next=ordered[(pos+1)%ordered.length];
  const prevIndex=CH.indexOf(prev),nextIndex=CH.indexOf(next);
  const videos=listenVideos(c,8);
  const views=c.metricsTrusted?fmt(c.totalViews):"—";
  const subs=c.metricsTrusted?(c.subsHidden?"Ocultos":fmt(c.subs)):"—";
  const youtube=c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`;
  const subscribe=listenSubscribeHref(c);
  const avatar=listenAvatar(c,"listen-avatar--active");
  const sleeveIdentity=listenAvatar(c,"listen-avatar--cover");
  const vinylLabel=c.avatar?`<img class="listen-vinyl-avatar" src="${esc(c.avatar)}" alt="Foto de perfil de ${esc(c.nombre)}" referrerpolicy="no-referrer">`:`<b>${esc((c.mono||"GS").replace(/\s+/g,""))}</b>`;
  // The waveform's small vinyl contains the one real audio control: no proxy
  // click handler and no duplicate play button on the decorative large vinyl.
  const audioPlayer=c.audio?`<div class="listen-player" data-audio-player><audio preload="metadata" controlslist="nodownload noplaybackrate" src="${esc(c.audio)}"></audio>${listenWave(true,c.nombre)}<div class="listen-wave-timeline"><span data-audio-current>0:00</span><input type="range" data-audio-seek min="0" max="100" value="0" step="0.1" aria-label="Posición de la muestra" disabled><span data-audio-duration>--:--</span></div><span class="listen-player-status" data-audio-status role="status"></span></div>`:`<div class="listen-player listen-player--unavailable">${listenWave()}<div class="listen-wave-timeline"><span>0:00</span><span class="listen-static-line"></span><span>—</span></div><p class="listen-unavailable-note">Muestra de audio no disponible</p></div>`;
  const intro=$("#listenIntro");
  const allLoaded=CH.length>0&&CH.every(ch=>ch.loaded);
  const metricsReady=CH.some(ch=>ch.metricsTrusted);
  if(intro)intro.textContent=metricsReady?"Lo más escuchado de nuestros universos musicales.":allLoaded?"No se pudieron cargar las estadísticas de YouTube.":"Cargando canales…";
  host.innerHTML=`
    <section class="listen-hero" aria-label="Canal seleccionado: ${esc(c.nombre)}">
      <div class="listen-showcase">
        <video class="listen-ambient" autoplay muted loop playsinline webkit-playsinline preload="metadata" poster="img/galadriel-left-ambient-poster.webp" aria-hidden="true"><source src="media/galadriel-left-ambient.mp4" type="video/mp4"></video>
        <div class="listen-carousel" aria-label="Selector de canales">
          <button class="listen-arrow listen-arrow--prev" type="button" data-listen-step="-1" aria-label="Canal anterior">‹</button>
          ${listenSleeve(prev,prevIndex,"prev")}
          <div class="listen-feature" aria-live="polite">
            <div class="listen-vinyl" aria-hidden="true"><span>${vinylLabel}</span></div>
            <div class="listen-cover" aria-label="Carátula del canal ${esc(c.nombre)}"><div class="listen-cover-mark">${sleeveIdentity}</div></div>
          </div>
          ${listenSleeve(next,nextIndex,"next")}
          <button class="listen-arrow listen-arrow--next" type="button" data-listen-step="1" aria-label="Canal siguiente">›</button>
        </div>
      </div>
      <aside class="listen-detail">
        <div class="listen-detail-label"><span>Canal activo</span><i></i></div>
        <div class="listen-detail-title"><a class="listen-channel-identity" href="${esc(subscribe)}" target="_blank" rel="noopener noreferrer" aria-label="Visitar ${esc(c.nombre)} y confirmar suscripción en YouTube">${avatar}<div><h3>${esc(c.nombre)}</h3><p>${esc(c.hook||c.cat)}</p></div></a></div>
        ${audioPlayer}
        <div class="listen-stats"><span><b>${esc(views)}</b><small>Vistas</small></span><i></i><span><b>${esc(subs)}</b><small>Suscriptores</small></span></div>
        <a class="listen-subscribe" href="${esc(subscribe)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir la confirmación de suscripción de ${esc(c.nombre)} en YouTube">Suscribirse en YouTube <span aria-hidden="true">↗</span></a>
      </aside>
    </section>
    <section class="listen-popular" aria-labelledby="listen-popular-title">
      <div class="listen-popular-head"><div><p>${esc(c.nombre)}</p><h3 id="listen-popular-title">Los 8 más escuchados</h3></div><i></i><a href="${esc(subscribe)}" target="_blank" rel="noopener noreferrer" title="YouTube mostrará su confirmación de suscripción">Visitar canal y suscribirse →</a></div>
      <div class="listen-video-grid">${videos.length?videos.map(v=>videoCard(v,c)).join(""):placeholderVideos(c)}</div>
    </section>`;
  if(retainedAmbient){
    host.querySelector("video.listen-ambient")?.replaceWith(retainedAmbient);
    // Resume through the shared Safari-compatible handler after reinserting. 
  }
  initAmbientVideo(host.querySelector('video.listen-ambient'));
  host.querySelectorAll('.listen-avatar img,.listen-vinyl img').forEach(img=>{img.onerror=()=>{img.hidden=true}});
  host.querySelectorAll("[data-audio-player]").forEach(card=>{
    const src=card.querySelector("audio")?.getAttribute("src");
    const old=src&&retained.get(src);
    if(old)card.replaceWith(old);
  });
  initPlayers(host);
  // A previous audio element may have been retained while YouTube stats refreshed.
  // Restore the hero playback state; the real button is retained with its audio.
  const currentPlayer=host.querySelector('.listen-player[data-audio-player]');
  const currentAudio=currentPlayer?.querySelector('audio');
  if(currentAudio)syncDiscProgress(currentPlayer,0,!currentAudio.paused&&!currentAudio.ended);
}
let listenSwitchTimer=0,listenEnterTimer=0;
function setListenActive(i,direction=1){
  if(!CH.length)return;
  const next=(i+CH.length)%CH.length;
  if(next===listenActive&&!listenSwitchTimer)return;
  document.querySelectorAll('#view-escuchar audio').forEach(a=>a.pause());
  listenActive=next;
  const host=$("#listenList");
  clearTimeout(listenSwitchTimer);
  clearTimeout(listenEnterTimer);
  if(!host||view!=="escuchar"||matchMedia("(prefers-reduced-motion: reduce)").matches){
    host?.classList.remove("listen-is-leaving","listen-is-entering");
    listenSwitchTimer=0;
    renderListen();
    return;
  }
  host.style.setProperty("--listen-exit-x",(direction>0?"-18px":"18px"));
  host.style.setProperty("--listen-enter-x",(direction>0?"22px":"-22px"));
  host.classList.remove("listen-is-entering");
  host.classList.add("listen-is-leaving");
  listenSwitchTimer=setTimeout(()=>{
    listenSwitchTimer=0;
    host.classList.remove("listen-is-leaving");
    renderListen();
    host.classList.add("listen-is-entering");
    listenEnterTimer=setTimeout(()=>{host.classList.remove("listen-is-entering");listenEnterTimer=0},480);
  },175);
}
function stepListen(delta){
  const order=listenCarouselOrder();
  const current=CH[listenActive]||order[0];
  const pos=Math.max(0,order.indexOf(current));
  setListenActive(CH.indexOf(order[(pos+delta+order.length)%order.length]),delta);
}

function shopHref(pack,format){
 const mobile=format==="mobile";
 const body=`Hola, me interesa la colección ${pack.t}.\nFormato: ${mobile?"Celular · 1440 × 3200 px · US$2":"Monitor · 3840 × 2160 px · US$5"}.\nPor favor, confirmen el contenido, disponibilidad, condiciones de uso, método de pago y plazo de entrega antes de realizar la compra.`;
 return `mailto:${APP.correo}?subject=${enc("Consulta: "+pack.t)}&body=${enc(body)}`;
}
function renderShop(){
 $("#shopGrid").innerHTML=APP.packs.map((p,i)=>`<article class="shop-card"><button class="shop-art ${p.previewEnabled===false?'no-preview':''}" ${p.previewEnabled===false?'disabled':''} data-preview="${i}" aria-label="Ampliar vista previa de ${esc(p.t)}">${p.previewEnabled===false?'':`<img src="img/shop/${esc(p.slug)}-mobile.jpg" alt="Vista previa de ${esc(p.t)}" loading="lazy">`}</button><div class="shop-body"><h3>${esc(p.t)}</h3><p>${esc(p.canal)} · ${esc(p.n)}</p><label class="shop-format-label" for="format-${i}">Formato de la colección</label><select class="shop-format" id="format-${i}" data-pack="${i}"><option value="mobile">Celular · US$2 · 1440 × 3200</option><option value="monitor">Monitor · US$5 · 3840 × 2160</option></select><a class="shop-request" href="${esc(shopHref(p,"mobile"))}">Consultar colección →</a><p class="shop-note">Solicitud por correo. Confirma disponibilidad antes de pagar.</p></div></article>`).join("");
 $("#shopGrid").querySelectorAll('.shop-art img').forEach(img=>img.onerror=()=>{img.parentElement.classList.add('no-preview');img.parentElement.disabled=true;img.parentElement.setAttribute('aria-label','Vista previa aún no disponible')});
 $("#shopGrid").querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>{const p=APP.packs[+select.dataset.pack];const card=select.closest('.shop-card');card.querySelector('.shop-request').href=shopHref(p,select.value);const button=card.querySelector('.shop-art');if(p.previewEnabled===false)return;button.classList.remove('no-preview');button.disabled=false;button.setAttribute('aria-label','Ampliar vista previa de '+p.t);button.querySelector('img').src='img/shop/'+p.slug+'-'+select.value+'.jpg'}));
}
function setActive(i){const next=(i+CH.length)%CH.length;if(next===active)return;active=next;panelOpen=false;renderHero();animateChannelInfo()}
function stepChannel(delta){const order=popularChannels();setActive(CH.indexOf(order[(order.indexOf(CH[active])+delta+order.length)%order.length]))}
function setView(next,fromHistory=false){
 if(!["canales","escuchar","estudio","tienda"].includes(next))next="canales";
 const changed=view!==next;
 if(changed)document.querySelectorAll('audio').forEach(a=>a.pause());
 const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
 view=next;
 if(view!=="canales"&&panelOpen){panelOpen=false;renderHero()}
 document.body.classList.toggle("view-open",view!=="canales");
 document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id===`view-${view}`));
 document.querySelectorAll(".nav [data-view]").forEach(b=>b.setAttribute("aria-current",b.dataset.view===view?"true":"false"));
 requestAnimationFrame(()=>initAmbientVideo(next==="canales"?document.querySelector("#canales .home-left-bg-video"):next==="escuchar"?document.querySelector("#view-escuchar .listen-ambient"):null));
 if(!fromHistory&&location.hash!==`#${next}`)history.pushState(null,"",`#${next}`);
 if(changed){
  window.scrollTo({top:0,behavior:'auto'});
  const heading=next==='canales'?$('#titulo'):document.querySelector(`#view-${next} h2`);
  heading?.setAttribute('tabindex','-1');
  heading?.focus({preventScroll:true});
  if(!reduced){
   const incoming=next==="canales"?$("#canales"):document.querySelector(`#view-${next}`);
   if(incoming){
    incoming.classList.remove("view-enter");
    void incoming.offsetWidth;
    incoming.classList.add("view-enter");
    setTimeout(()=>incoming.classList.remove("view-enter"),380);
   }
  }
 }
}
addEventListener('popstate',()=>setView(location.hash.slice(1)||'canales',true));
function togglePanel(force){
  panelOpen=typeof force==="boolean"?force:!panelOpen;
  renderHero();
  if(panelOpen&&innerWidth<=820)requestAnimationFrame(()=>$("#channelPanel")?.scrollIntoView({block:"start",behavior:"smooth"}));
}
async function fetchViaApi(c){
  const k=APP.apiKey;
  if(!k)throw new Error("api key");
  const handle=String(c.handle||"").trim();
  const cleanHandle=handle.replace(/^@/,"");
  const requests=[
    c.channelId?{part:"snippet,statistics,contentDetails",id:c.channelId,key:k}:null,
    handle?{part:"snippet,statistics,contentDetails",forHandle:handle,key:k}:null,
    cleanHandle&&cleanHandle!==handle?{part:"snippet,statistics,contentDetails",forHandle:cleanHandle,key:k}:null
  ].filter(Boolean);
  let cj,lastError;
  for(const params of requests){
    try{
      const data=await getJson(`https://www.googleapis.com/youtube/v3/channels?${qs(params)}`);
      if(data.error)throw new Error(data.error.message||"youtube api");
      if(data.items?.[0]){cj=data;break}
    }catch(error){if(error.status===400||error.status===403)throw error;lastError=error}
  }
  if(!cj?.items?.[0])throw lastError||new Error("channel");
  const it=cj.items[0];
  const thumbs=it.snippet?.thumbnails||{};
  const largest=Object.values(thumbs).sort((a,b)=>(b.width||0)*(b.height||0)-(a.width||0)*(a.height||0))[0];
  // Keep channel identity and verified totals even if a later video request fails.
  Object.assign(c,{channelId:it.id||c.channelId,nombre:it.snippet.title||c.nombre,avatar:cleanRemoteUrl(largest?.url||""),subs:+it.statistics.subscriberCount||0,subsHidden:!!it.statistics.hiddenSubscriberCount,totalViews:+it.statistics.viewCount||0,nVideos:+it.statistics.videoCount||0,metricsTrusted:true});
  renderHero();
  const uploads=it.contentDetails?.relatedPlaylists?.uploads;
  const playlistItems=[];
  let pageToken="";
  if(uploads){
    do{
      const params={part:"snippet",maxResults:"50",playlistId:uploads,key:k};
      if(pageToken)params.pageToken=pageToken;
      const page=await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?${qs(params)}`);
      playlistItems.push(...(page.items||[]));
      pageToken=page.nextPageToken||"";
    }while(pageToken);
  }
  const ids=playlistItems.map(x=>x.snippet.resourceId.videoId).filter(Boolean);
  const det={};
  for(let start=0;start<ids.length;start+=50){
    const vd=await getJson(`https://www.googleapis.com/youtube/v3/videos?${qs({part:"contentDetails,statistics",id:ids.slice(start,start+50).join(","),key:k})}`);
    (vd.items||[]).forEach(v=>det[v.id]={dur:dur(v.contentDetails.duration),vistas:+v.statistics.viewCount||0});
  }
  const videos=playlistItems.map(x=>{const id=x.snippet.resourceId.videoId;return{id,thumbnail:cleanRemoteUrl(x.snippet.thumbnails?.high?.url||x.snippet.thumbnails?.medium?.url||x.snippet.thumbnails?.default?.url||""),title:x.snippet.title,date:x.snippet.publishedAt,dur:det[id]?.dur||"",vistas:det[id]?.vistas||0}}).filter(v=>v.id&&det[v.id]).sort((a,b)=>b.vistas-a.vistas);
  return{channelId:it.id||c.channelId||"",nombre:it.snippet.title||c.nombre,avatar:cleanRemoteUrl(largest?.url||""),subs:+it.statistics.subscriberCount||0,subsHidden:!!it.statistics.hiddenSubscriberCount,totalViews:+it.statistics.viewCount||0,nVideos:+it.statistics.videoCount||0,videos,metricsTrusted:true};
}
async function loadChannel(c){
  try{
    const api=await fetchViaApi(c);
    Object.assign(c,api,{loaded:true,videoError:false});
  }catch(error){
    console.warn("No se pudo cargar YouTube API para",c.handle,error.message);
    c.loaded=true;
    c.videoError=true;
  }
  renderHero();
  renderListen();
}
document.addEventListener("click",ev=>{
  const listenStep=ev.target.closest("[data-listen-step]");if(listenStep){stepListen(+listenStep.dataset.listenStep||1);return}
  const listenChannel=ev.target.closest("[data-listen-i]");if(listenChannel){setListenActive(+listenChannel.dataset.listenI,listenChannel.classList.contains("listen-side-sleeve--prev")?-1:1);return}
  if(ev.target.closest("#channelPrev")){moveRail(-1);return}
  if(ev.target.closest("#channelNext")){moveRail(1);return}
  const channel=ev.target.closest("[data-i]");if(channel){setActive(+channel.dataset.i);return}
  const nav=ev.target.closest("[data-view]");if(nav){ev.preventDefault();setView(nav.dataset.view);return}
  if(ev.target.closest("#openDisc")||ev.target.closest("#touchDisc")){togglePanel();return}
  if(ev.target.closest("#closePanel"))togglePanel(false);
});
document.addEventListener("keydown",ev=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;if(view==="canales"&&ev.key==="ArrowLeft")stepChannel(-1);if(view==="canales"&&ev.key==="ArrowRight")stepChannel(1);if(view==="escuchar"&&ev.key==="ArrowLeft")stepListen(-1);if(view==="escuchar"&&ev.key==="ArrowRight")stepListen(1);if(ev.key==="Escape"){if(panelOpen)togglePanel(false);else setView("canales")}});
let railResizeFrame=0;
addEventListener("resize",()=>{cancelAnimationFrame(railResizeFrame);railResizeFrame=requestAnimationFrame(()=>applyRailPosition(false))},{passive:true});
function initStaticBindings(){
  const notify=$("#notifyMail");if(notify)notify.href=`mailto:${APP.correo}?subject=${enc("Quiero recibir nuevos lanzamientos")}`;
  const preview=$('#productPreview');
  document.addEventListener('click',e=>{const button=e.target.closest('[data-preview]');if(button&&!button.disabled){const p=APP.packs[+button.dataset.preview];preview.querySelector('img').src=button.querySelector('img').src;preview.querySelector('img').alt='Vista previa de '+p.t;preview.querySelector('p').textContent=p.t;preview.showModal()}});
  preview.querySelector('button').addEventListener('click',()=>preview.close());
  preview.addEventListener('click',e=>{if(e.target===preview)preview.close()});
  const mail=$("#mail");
  if(mail){mail.href=`mailto:${APP.correo}?subject=Contacto%20Galadriel%20Music%20Studio`;mail.textContent=APP.correo}
  const studioMail=$("#studioMail");
  if(studioMail)studioMail.href=`mailto:${APP.correo}?subject=Conocer%20Galadriel%20Music%20Studio`;
  const studioLower=document.querySelector(".studio-lower");
  if(studioLower&&APP.studioAudio&&!studioLower.dataset.audioReady){
    studioLower.dataset.audioReady="1";
    studioLower.insertAdjacentHTML("beforeend",`<div class="contact-card studio-card studio-audio-card"><h3>Audio del estudio</h3>${audioBlock("Audio del estudio",APP.studioAudio,{nombre:"Galadriel Music Studio"})}</div>`);
    initPlayers(studioLower);
  }
}
// Safari on iPhone can block even silent autoplay (e.g. Low Power Mode).
// Keep the original poster visible and never cover the content with extra UI.
function initAmbientVideo(video){
  if(!video||!video.isConnected)return;
  video.muted=true;
  video.defaultMuted=true;
  video.playsInline=true;
  video.setAttribute('muted','');
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  if(!video.dataset.ambientBound){
    video.dataset.ambientBound='1';
    video.addEventListener('error',()=>{
      // The parent already has a matching static background; make it visible.
      video.style.opacity='0';
    });
    video.addEventListener('playing',()=>{video.style.opacity='';});
  }
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){video.pause();video.style.opacity='0';return;}
  // Best effort only. A rejected play promise is not an error state for the page.
  try{
    const result=video.play();
    if(result?.catch)result.catch(()=>{video.style.opacity='0';});
  }catch{video.style.opacity='0';}
}
function closeIntro(){
  const intro=$('#intro');
  if(!intro||intro.classList.contains('off'))return;
  intro.classList.add('off');
  const video=$('#introVideo');
  if(video)video.pause();
  setTimeout(()=>intro.remove(),950);
}
function initIntro(){
  const intro=$('#intro'),video=$('#introVideo');
  if(!intro||!video)return;
  const skip=document.createElement('button');
  skip.type='button';skip.className='intro-skip';skip.textContent='Entrar al estudio →';
  skip.addEventListener('click',closeIntro);
  intro.appendChild(skip);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){closeIntro();return;}
  video.muted=true;video.defaultMuted=true;video.playsInline=true;
  video.setAttribute('muted','');
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  let started=false;
  video.addEventListener('playing',()=>{started=true;},{once:true});
  video.addEventListener('ended',closeIntro,{once:true});
  video.addEventListener('error',closeIntro,{once:true});
  // If iOS refuses autoplay, do not trap the visitor on a static black intro.
  const attempt=()=>{
    if(!intro.isConnected||intro.classList.contains('off'))return;
    try{
      const result=video.play();
      if(result?.catch)result.catch(()=>{
        // Allow a short, quiet fallback to the poster, then enter automatically.
        setTimeout(()=>{if(!started)closeIntro();},350);
      });
    }catch{closeIntro();}
  };
  video.addEventListener('canplay',attempt,{once:true});
  requestAnimationFrame(attempt);
  // Network and power-saving fallback; successful 4 s intros still finish normally.
  setTimeout(()=>{if(!started||video.paused)closeIntro();},2300);
  setTimeout(closeIntro,7500);
}
initIntro();
async function loadSiteData(){
  const response=await fetch("data/channels.json",{cache:"no-store"});
  if(!response.ok)throw new Error("No se pudo cargar data/channels.json");
  const data=await response.json();
  APP=data.app||APP;

}
async function boot(){
  try{
    await loadSiteData();
    const audioSources=[...new Set([...APP.canales.map(c=>c.audio),APP.studioAudio].filter(Boolean))];
    await Promise.allSettled(audioSources.map(async src=>{try{const r=await fetchWithTimeout(src,{method:'HEAD'},4000);if(!r.ok){APP.canales.forEach(c=>{if(c.audio===src)c.audio=''});if(APP.studioAudio===src)APP.studioAudio=''}}catch{}}));
    buildChannels();
    initStaticBindings();renderShop();renderHero();renderListen();setView(location.hash.slice(1)||"canales",true);
    await Promise.allSettled(CH.map(loadChannel));renderListen();
  }catch(error){
    document.body.insertAdjacentHTML("beforeend",'<p style="position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:99999;padding:1rem;background:#0b0a08;color:#fff;border-radius:8px">No se pudo cargar el sitio. Actualiza la página para intentarlo de nuevo.</p>');
    console.error(error);
  }
}
boot();
