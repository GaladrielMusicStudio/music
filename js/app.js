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
const fecha=iso=>{if(!iso)return"";const d=(Date.now()-new Date(iso))/864e5;if(d<1)return"Hoy";if(d<2)return"Ayer";if(d<7)return`Hace ${Math.floor(d)} días`;if(d<35)return`Hace ${Math.floor(d/7)} semanas`;return new Date(iso).toLocaleDateString("es-PE",{day:"numeric",month:"long"})};
const dur=iso=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso||"");if(!m)return"";const h=+m[1]||0,mi=+m[2]||0,sg=+m[3]||0;return h?`${h}:${String(mi).padStart(2,"0")}:${String(sg).padStart(2,"0")}`:`${mi}:${String(sg).padStart(2,"0")}`};
function getText(url){
  if(typeof fetch==="function") return fetch(url).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.text()});
  if(typeof XMLHttpRequest==="function") return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open("GET",url,true);x.onload=()=>x.status>=200&&x.status<300?resolve(x.responseText):reject(new Error("HTTP "+x.status));x.onerror=()=>reject(new Error("Network error"));x.send()});
  return Promise.reject(new Error("No network API available"));
}
const getJson=async url=>{
  if(typeof fetch==="function"){
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
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
let active=1,view="canales",panelOpen=false,railOffset=0,railSettleTimer=0;
function buildChannels(){
  CH=APP.canales.map(c=>({...c,avatar:"",videos:[],subs:0,totalViews:0,nVideos:0,loaded:false,metricsTrusted:false}));
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
    const audio=card.querySelector("audio"),play=card.querySelector("[data-audio-play]"),seek=card.querySelector("[data-audio-seek]"),vol=card.querySelector("[data-audio-volume]"),now=card.querySelector("[data-audio-current]"),end=card.querySelector("[data-audio-duration]");
    if(!audio)return;
    audio.addEventListener('error',()=>{play.disabled=true;play.setAttribute('aria-label','Muestra no disponible');if(seek)seek.disabled=true;if(vol)vol.disabled=true;const caption=card.closest('.record-zone')?.querySelector('.sample-caption');if(caption)caption.textContent='Muestra de audio aún no disponible';},{once:true});
    audio.volume=vol?+vol.value:.9;
    if(seek)paintRange(seek,0); if(vol)paintRange(vol,+vol.value,1);
    const update=()=>{play.setAttribute("aria-label",audio.paused?"Reproducir muestra":"Pausar muestra");play.setAttribute("aria-pressed",String(!audio.paused));const d=Number.isFinite(audio.duration)?audio.duration:0,pct=d?Math.min(100,Math.max(0,audio.currentTime/d*100)):0;card.style.setProperty("--audio-progress",pct+"%");syncDiscProgress(card,pct,!audio.paused&&!audio.ended);if(seek){seek.disabled=!d;seek.max=d||100;seek.value=audio.currentTime||0;paintRange(seek,+seek.value,+seek.max)}if(now)now.textContent=timeAudio(audio.currentTime);if(end)end.textContent=d?timeAudio(d):"--:--"};
    const status=card.querySelector('[data-audio-status]');
    const fail=()=>{card.classList.remove('is-loading','is-playing');card.classList.add('is-error');syncDiscProgress(card,0,false);if(status)status.textContent='No se pudo reproducir esta muestra. Inténtalo de nuevo más tarde.';};
    play.addEventListener("click",()=>{
      card.classList.remove('is-error');if(status)status.textContent='';
      if(audio.paused){
        document.querySelectorAll("audio").forEach(a=>{if(a!==audio)a.pause()});
        document.querySelectorAll("[data-audio-player]").forEach(p=>{if(p!==card)p.classList.remove("is-open","is-playing")});
        card.classList.add("is-open","is-loading");
        audio.play().catch(fail);
      }else{audio.pause();card.classList.remove("is-open")}
    });
    seek?.addEventListener("input",()=>{audio.currentTime=+seek.value||0;update()});
    vol?.addEventListener("input",()=>{audio.volume=+vol.value;paintRange(vol,+vol.value,1)});
    audio.addEventListener("loadedmetadata",update);
    audio.addEventListener("timeupdate",update);
    audio.addEventListener("waiting",()=>{card.classList.add("is-loading");syncDiscProgress(card,0,false)});
    audio.addEventListener("playing",()=>{card.classList.remove("is-loading");update()});
    audio.addEventListener("canplay",()=>card.classList.remove("is-loading"));
    audio.addEventListener("play",()=>{card.classList.remove("is-loading");card.classList.add("is-playing");update()});
    audio.addEventListener("pause",()=>{card.classList.remove("is-playing","is-loading");update()});
    audio.addEventListener("ended",()=>{card.classList.remove("is-playing","is-open");card.style.setProperty("--audio-progress","100%");syncDiscProgress(card,100,false)});
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
  const href=v.id?`https://youtu.be/${esc(v.id)}`:(c.enlaces?.YouTube||`https://www.youtube.com/${c.handle}`);
  const media=v.thumbnail?`<img src="${esc(v.thumbnail||"")}" alt="" loading="lazy" onerror="this.closest('.video-card')?.classList.add('is-fallback');this.closest('.thumb').innerHTML='<span class=&quot;fallback-title&quot;>${esc(v.tag||v.title).replace(/'/g,"&#39;")}</span>'">`:`<span class="fallback-title">${esc(v.tag||v.title)}</span>`;
  const cls=v.id?"video-card":"video-card is-fallback";
  const views=c.metricsTrusted?fmt(v.vistas)+" vistas · ":"";
  const label=v.badge||(!c.metricsTrusted&&v.featured?"Selección destacada":fecha(v.date)||"Selección destacada");
  return `<a class="${cls}" style="--thumb-a:${esc(c.accent||"#b89146")};--thumb-b:#111" href="${href}" target="_blank" rel="noopener noreferrer"><span class="thumb" data-mark="${esc((c.mono||"GS").replace(/\s+/g,""))}">${media}${v.dur?`<span class="video-duration">${esc(v.dur)}</span>`:""}</span><b>${esc(v.title)}</b><small>${views}${esc(label)}</small></a>`;
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
function renderListen(){
  const retained=new Map([...document.querySelectorAll("#listenList .audio-card")].map(card=>[card.querySelector("audio")?.getAttribute("src"),card]));
  const ordered=popularChannels();
  const intro=$("#listenIntro");
  const allLoaded=CH.length>0&&CH.every(c=>c.loaded);
  const metricsReady=CH.some(c=>c.metricsTrusted);
  if(intro){
    intro.textContent=metricsReady
      ?"Lo más escuchado de nuestros universos musicales."
      :allLoaded
        ?"No se pudieron cargar las estadísticas de YouTube. Puedes abrir los canales directamente en YouTube."
        :"Cargando canales…";
  }
  $("#listenList").innerHTML=ordered.map(c=>{
    const vids=[...c.videos].sort((a,b)=>c.metricsTrusted?(+b.vistas||0)-(+a.vistas||0):(new Date(b.date||0)-new Date(a.date||0))).slice(0,4);
    const stats=c.metricsTrusted
      ?`<span>${fmt(c.totalViews)} vistas</span><span>${c.subsHidden?"Suscriptores ocultos":fmt(c.subs)+" suscriptores"}</span>`
      :`<span>${c.loaded?"Estadísticas no disponibles temporalmente":"Cargando canal"}</span>`;
    const videoHeading=c.videos.length?"Videos con más vistas":"Videos del canal";
    const videoNote="";
    return `<article class="listen-row"><div class="listen-channel"><div class="row-id"><span class="listen-disc"><span class="mini-disc" aria-hidden="true">${c.avatar?`<img src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:seal(c)}</span>${audioBlock("Audio del canal",c.audio,c)}${c.audio?audioWave():""}</span><span><h3>${esc(c.nombre)}</h3><small class="channel-stats">${stats}</small></span></div></div><div class="listen-videos"><div class="listen-videos-heading"><span>${videoHeading}</span><small>${videoNote}</small></div><div class="videos">${vids.length?vids.map(v=>videoCard(v,c)).join(""):placeholderVideos(c)}</div></div></article>`;
  }).join("");
  document.querySelectorAll("#listenList .audio-card").forEach(card=>{const old=retained.get(card.querySelector("audio")?.getAttribute("src"));if(old)card.replaceWith(old)});
  document.querySelectorAll('#listenList .row-id img').forEach(img=>{img.onerror=()=>{img.hidden=true}});
  initPlayers($("#listenList"));
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
 document.querySelectorAll(".nav [data-view]").forEach(b=>b.setAttribute("aria-current",b.dataset.view===view?"page":"false"));
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
  if(ev.target.closest("#channelPrev")){moveRail(-1);return}
  if(ev.target.closest("#channelNext")){moveRail(1);return}
  const channel=ev.target.closest("[data-i]");if(channel){setActive(+channel.dataset.i);return}
  const nav=ev.target.closest("[data-view]");if(nav){ev.preventDefault();setView(nav.dataset.view);return}
  if(ev.target.closest("#openDisc")||ev.target.closest("#touchDisc")){togglePanel();return}
  if(ev.target.closest("#closePanel"))togglePanel(false);
});
document.addEventListener("keydown",ev=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;if(view==="canales"&&ev.key==="ArrowLeft")stepChannel(-1);if(view==="canales"&&ev.key==="ArrowRight")stepChannel(1);if(ev.key==="Escape"){if(panelOpen)togglePanel(false);else setView("canales")}});
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
function closeIntro(){const intro=$("#intro");if(!intro||intro.classList.contains("off"))return;intro.classList.add("off");setTimeout(()=>intro.remove(),950)}
function initIntro(){
  const intro=$("#intro"),video=$("#introVideo");
  if(!intro)return;
  // The intro is a real opening sequence: show it once on every fresh page load.
  // SPA tab changes do not reload the document, so it will not replay while navigating the site.
  intro.insertAdjacentHTML('beforeend','<button class="intro-skip">Entrar al estudio →</button>');
  intro.addEventListener("click",closeIntro,{once:true});
  addEventListener("keydown",closeIntro,{once:true});
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){setTimeout(closeIntro,500);return}
  const mobile=matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  let started=false;
  let fallback=setTimeout(closeIntro,7000);
  if(video){
    video.muted=true;
    video.defaultMuted=true;
    video.playsInline=true;
    try{video.currentTime=0}catch{}
    const markStarted=()=>{started=true};
    video.addEventListener("playing",markStarted,{once:true});
    video.addEventListener("timeupdate",markStarted,{once:true});
    setTimeout(()=>{if(mobile&&!started)closeIntro()},2200);
    video.addEventListener("ended",()=>{clearTimeout(fallback);closeIntro()},{once:true});
    video.addEventListener("error",()=>{clearTimeout(fallback);setTimeout(closeIntro,1200)},{once:true});
    const tryPlay=()=>{
      const result=video.play?.();
      if(result&&typeof result.catch==="function")result.catch(()=>{
        // Some browsers need a second autoplay attempt after metadata is available.
        video.addEventListener("canplay",()=>video.play?.().catch(()=>{if(mobile)closeIntro()}),{once:true});
      });
    };
    if(video.readyState>=2)requestAnimationFrame(tryPlay);
    else video.addEventListener("loadeddata",tryPlay,{once:true});
  }
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
    await Promise.allSettled(audioSources.map(async src=>{try{const r=await fetch(src,{method:'HEAD',signal:AbortSignal.timeout(4000)});if(!r.ok){APP.canales.forEach(c=>{if(c.audio===src)c.audio=''});if(APP.studioAudio===src)APP.studioAudio=''}}catch{}}));
    buildChannels();
    initStaticBindings();renderShop();renderHero();renderListen();setView(location.hash.slice(1)||"canales",true);
    await Promise.allSettled(CH.map(loadChannel));renderListen();
  }catch(error){
    document.body.insertAdjacentHTML("beforeend",'<p style="position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:99999;padding:1rem;background:#0b0a08;color:#fff;border-radius:8px">No se pudo cargar el sitio. Actualiza la página para intentarlo de nuevo.</p>');
    console.error(error);
  }
}
boot();
