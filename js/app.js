let APP={canales:[],packs:[]};
let FALLBACK={};

const SHOW_AUDIO=true;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const enc=s=>new URLSearchParams({q:String(s)}).toString().slice(2);
const qs=obj=>new URLSearchParams(obj).toString();
const cleanRemoteUrl=url=>String(url||"").replace(/\\u0026/g,"&").replace(/\\u003d/g,"=").replace(/\\\//g,"/").replace(/&amp;/g,"&");
const pad=n=>String(n+1).padStart(2,"0");
const fmt=n=>{n=+n||0;if(n>=1e6)return(n/1e6).toFixed(1).replace(".",",")+" M";if(n>=1e3)return Math.round(n/1e3)+" K";return String(n)};
const fecha=iso=>{if(!iso)return"";const d=(Date.now()-new Date(iso))/864e5;if(d<1)return"Hoy";if(d<2)return"Ayer";if(d<7)return`Hace ${Math.floor(d)} dias`;if(d<35)return`Hace ${Math.floor(d/7)} semanas`;return new Date(iso).toLocaleDateString("es-PE",{day:"numeric",month:"long"})};
const dur=iso=>{const m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso||"");if(!m)return"";const h=+m[1]||0,mi=+m[2]||0,sg=+m[3]||0;return h?`${h}:${String(mi).padStart(2,"0")}:${String(sg).padStart(2,"0")}`:`${mi}:${String(sg).padStart(2,"0")}`};
function getText(url){
  if(typeof fetch==="function") return fetch(url).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.text()});
  if(typeof XMLHttpRequest==="function") return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open("GET",url,true);x.onload=()=>x.status>=200&&x.status<300?resolve(x.responseText):reject(new Error("HTTP "+x.status));x.onerror=()=>reject(new Error("Network error"));x.send()});
  return Promise.reject(new Error("No network API available"));
}
const getJson=url=>getText(url).then(JSON.parse);
let CH=[];
let active=1,view="canales",panelOpen=false;
function buildChannels(){
  CH=APP.canales.map(c=>{
    const f=FALLBACK[c.handle]||{};
    return {...c,channelId:f.channelId||c.channelId||"",avatar:f.avatar||c.avatar||"",videos:[...(f.videos||[])],subs:0,totalViews:0,nVideos:0,accent:f.accent||"#b89146",loaded:false,metricsTrusted:false};
  });
}

function iconPlay(){return `<svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><svg class="pause-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>`}
function audioWave(){return `<span class="audio-wave" aria-hidden="true">${Array.from({length:18},()=>"<i></i>").join("")}</span>`}
function audioBlock(label,src,c={}){
  if(!SHOW_AUDIO||!src) return "";
  return `<div class="audio-card audio-orb" data-audio-player><audio preload="none" controlslist="nodownload noplaybackrate" src="${esc(src)}"></audio><button class="player-btn" type="button" data-audio-play aria-label="Reproducir ${esc(c.nombre||label)}">${iconPlay()}</button></div>`;
}
function homeAudioBlock(c){
  const available=SHOW_AUDIO&&!!c.audio;
  return `<div class="tt-console ${available?'':'is-unavailable'}" data-audio-player>${available?`<audio preload="metadata" controlslist="nodownload noplaybackrate" src="${esc(c.audio)}"></audio>`:''}<button class="tt-play" type="button" data-audio-play aria-label="Reproducir ${esc(c.nombre)}" ${available?'':'disabled'}>${iconPlay()}</button><div class="tt-timeline"><span data-audio-current>0:00</span><input type="range" data-audio-seek min="0" max="100" value="0" step="0.1" aria-label="Posición de la canción" disabled><span data-audio-duration>--:--</span></div><label class="tt-volume"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm12-1c3 2 3 6 0 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><input type="range" data-audio-volume min="0" max="1" step="0.01" value="0.9" aria-label="Volumen" ${available?'':'disabled'}></label><span class="tt-status" data-audio-status role="status">${available?'':'Este canal todavía no tiene audio.'}</span></div>`;
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
    audio.volume=vol?+vol.value:.9;
    if(seek)paintRange(seek,0); if(vol)paintRange(vol,+vol.value,1);
    const update=()=>{const d=Number.isFinite(audio.duration)?audio.duration:0,pct=d?Math.min(100,Math.max(0,audio.currentTime/d*100)):0;card.style.setProperty("--audio-progress",pct+"%");syncDiscProgress(card,pct,!audio.paused&&!audio.ended);if(seek){seek.disabled=!d;seek.max=d||100;seek.value=audio.currentTime||0;paintRange(seek,+seek.value,+seek.max)}if(now)now.textContent=timeAudio(audio.currentTime);if(end)end.textContent=d?timeAudio(d):"--:--"};
    const status=card.querySelector('[data-audio-status]');
    const fail=()=>{card.classList.remove('is-loading','is-playing');card.classList.add('is-error');syncDiscProgress(card,0,false);if(status)status.textContent='Audio no disponible. Comprueba el archivo MP3 de este canal.';};
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
  const media=v.id?`<img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" loading="lazy" onerror="this.closest('.video-card')?.classList.add('is-fallback');this.closest('.thumb').innerHTML='<span class=&quot;fallback-title&quot;>${esc(v.tag||v.title).replace(/'/g,"&#39;")}</span>'">`:`<span class="fallback-title">${esc(v.tag||v.title)}</span>`;
  const cls=v.id?"video-card":"video-card is-fallback";
  const views=c.metricsTrusted&&v.vistas?fmt(v.vistas)+" vistas · ":"";
  const label=v.badge||(!c.metricsTrusted&&v.featured?"Seleccion destacada":fecha(v.date)||"Seleccion destacada");
  return `<a class="${cls}" style="--thumb-a:${esc(c.accent||"#b89146")};--thumb-b:#111" href="${href}" target="_blank" rel="noopener noreferrer"><span class="thumb" data-mark="${esc((c.mono||"GS").replace(/\s+/g,""))}">${media}</span><b>${esc(v.title)}</b><small>${views}${esc(label)}</small></a>`;
}
function renderRail(){
  $("#channelRail").innerHTML=CH.map((c,i)=>`<li><button data-i="${i}" aria-current="${i===active?"true":"false"}" aria-label="Ver ${esc(c.nombre)}"><span class="num">${pad(i)}</span><span class="label">${esc(c.hook||c.cat)}</span></button></li>`).join("");
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
  $("#currentMeta").innerHTML=`<p class="cat">${esc(c.hook||c.cat)}</p><p class="name">${esc(c.nombre)}</p>`;
  const avatar=document.querySelector('.tt-avatar');
  const avatarRing=document.querySelector('.tt-avatar-ring');
  if(avatar){
    const iconUrl=c.avatar||"";
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
  $("#touchDisc").setAttribute('aria-label','Ver '+c.nombre);
  const stats=c.metricsTrusted?[c.totalViews?fmt(c.totalViews)+" vistas":"",c.subs?fmt(c.subs)+" suscriptores":"",c.nVideos?c.nVideos+" videos":""].filter(Boolean).join(" · "):"";
  const topVideos=c.videos.slice(0,3);
  $("#channelPanel").innerHTML=`<div class="panel-actions"><button class="ghost" id="closePanel">Cerrar</button></div><div class="panel-top"><div class="panel-copy"><strong class="ghost">${esc(c.handle)}</strong><p>${esc(c.line)}</p>${stats?`<p>${esc(stats)}</p>`:""}${links(c)}</div></div>${topVideos.length?`<div class="panel-videos"><div class="videos">${topVideos.map(v=>videoCard(v,c)).join("")}</div></div>`:""}`;
  document.body.classList.toggle("disc-open",panelOpen);
  $("#openDisc").setAttribute("aria-expanded",String(panelOpen));
  $("#touchDisc").setAttribute("aria-expanded",String(panelOpen));
  renderRail();
  initPlayers($("#channelPanel"));
  initPlayers($("#homeAudio"));
}
function placeholderVideos(c){
  const note=c.loaded?"Abrir canal en YouTube":"Preparando seleccion";
  return Array.from({length:4},(_,i)=>videoCard({title:i===0?c.nombre:"Galadriel Music Studio",tag:c.cat||"Studio",vistas:0},c)).join("");
}
function renderListen(){
  const ordered=[...CH].sort((a,b)=>{
    if(a.metricsTrusted!==b.metricsTrusted)return a.metricsTrusted?-1:1;
    if(a.metricsTrusted&&b.metricsTrusted){
      return (b.subs||0)-(a.subs||0)||(b.totalViews||0)-(a.totalViews||0)||CH.indexOf(a)-CH.indexOf(b);
    }
    const pa=a.handle==="@Galadriel_Symphony"?-1:CH.indexOf(a);
    const pb=b.handle==="@Galadriel_Symphony"?-1:CH.indexOf(b);
    return pa-pb;
  });
  $("#listenList").innerHTML=ordered.map((c,index)=>{
    const vids=[...c.videos].sort((a,b)=>c.metricsTrusted?(+b.vistas||0)-(+a.vistas||0):(new Date(b.date||0)-new Date(a.date||0))).slice(0,4);
    const stats=c.metricsTrusted
      ?[c.subs?`${fmt(c.subs)} suscriptores`:"Suscriptores ocultos",c.totalViews?`${fmt(c.totalViews)} vistas`:"",c.nVideos?`${fmt(c.nVideos)} videos`:""] .filter(Boolean).join(" · ")
      :(c.loaded?"Estadísticas públicas no disponibles":"Cargando estadísticas");
    const videoHeading=c.metricsTrusted?"Videos con más vistas":"Publicaciones recientes";
    const videoNote=c.metricsTrusted?"Ordenados por reproducciones":"Ordenadas por fecha";
    return `<article class="listen-row"><div class="listen-channel"><div class="row-id"><span class="listen-rank" aria-label="Puesto ${index+1} por suscriptores">${pad(index)}</span><span class="listen-disc"><span class="mini-disc" aria-hidden="true">${c.avatar?`<img src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:seal(c)}</span>${audioBlock("Audio del canal",c.audio,c)}${c.audio?audioWave():""}</span><span><h3>${esc(c.nombre)}</h3><small>${esc(stats)}</small></span></div></div><div class="listen-videos"><div class="listen-videos-heading"><span>${videoHeading}</span><small>${videoNote}</small></div><div class="videos">${vids.length?vids.map(v=>videoCard(v,c)).join(""):placeholderVideos(c)}</div></div></article>`;
  }).join("");
  initPlayers($("#listenList"));
}
function renderShop(){
  $("#shopGrid").innerHTML=APP.packs.map(p=>{
    const mobile=`img/shop/${p.slug}-mobile.jpg`;
    const monitor=`img/shop/${p.slug}-monitor.jpg`;
    const mobilePrice="US$2";
    const monitorPrice="US$5";
    const mobileSize="1440 x 3200 px";
    const monitorSize="3840 x 2160 px";
    const asunto=enc("Pack: "+p.t);
    const cuerpo=enc(`Hola, quiero solicitar el pack "${p.t}".\n\nFormatos disponibles:\n- Celular (${mobileSize}) - ${mobilePrice}\n- Monitor (${monitorSize}) - ${monitorPrice}\n\nIndicaré aquí el formato que deseo.\nCanal: ${p.canal}\n\nPor favor, envíame el método de pago y el enlace de descarga. Gracias.`);
    return `<a class="shop-card" aria-label="Solicitar el pack ${esc(p.t)} por correo" href="mailto:${APP.correo}?subject=${asunto}&body=${cuerpo}"><span class="shop-art" style="--pack-bg:${p.bg};--pack-fg:${p.fg}"><span class="shop-edition">Colección digital</span><span class="mock-monitor"><img src="${esc(monitor)}" alt="Vista previa del pack ${esc(p.t)} en monitor" loading="lazy" onerror="this.remove()"></span><span class="mock-phone"><img src="${esc(mobile)}" alt="Vista previa del pack ${esc(p.t)} en celular" loading="lazy" onerror="this.remove()"></span><span class="pack-title">${esc(p.t)}</span><span class="pack-count">${esc(p.n)}</span></span><strong>${esc(p.t)}</strong><small>${esc(p.n)}<span class="price-line">Celular ${mobileSize} · ${mobilePrice}</span><span class="price-line">Monitor ${monitorSize} · ${monitorPrice}</span></small><span class="shop-actions"><em>Solicitar pack</em><i aria-hidden="true">→</i></span></a>`;
  }).join("");
}
function setActive(i){active=(i+CH.length)%CH.length;panelOpen=false;renderHero()}
function setView(next){
  view=next;
  if(view!=="canales"&&panelOpen){panelOpen=false;renderHero()}
  document.body.classList.toggle("view-open",view!=="canales");
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("on",v.id===`view-${view}`));
  document.querySelectorAll("[data-view]").forEach(b=>{if(b.matches(".nav button"))b.setAttribute("aria-current",b.dataset.view===view?"true":"false")});
  if(innerWidth<=820){requestAnimationFrame(()=>{(view==="canales"?document.querySelector(".page"):document.querySelector(`#view-${view}`))?.scrollIntoView({block:"start"})})}
}
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
    }catch(error){lastError=error}
  }
  if(!cj?.items?.[0])throw lastError||new Error("channel");
  const it=cj.items[0];
  const uploads=it.contentDetails?.relatedPlaylists?.uploads;
  const pl=uploads?await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?${qs({part:"snippet",maxResults:"50",playlistId:uploads,key:k})}`):{items:[]};
  const ids=(pl.items||[]).map(x=>x.snippet.resourceId.videoId).filter(Boolean);
  const det={};
  if(ids.length){
    const vd=await getJson(`https://www.googleapis.com/youtube/v3/videos?${qs({part:"contentDetails,statistics",id:ids.slice(0,50).join(","),key:k})}`);
    (vd.items||[]).forEach(v=>det[v.id]={dur:dur(v.contentDetails.duration),vistas:+v.statistics.viewCount||0});
  }
  const videos=(pl.items||[]).map(x=>{const id=x.snippet.resourceId.videoId;return{id,title:x.snippet.title,date:x.snippet.publishedAt,dur:det[id]?.dur||"",vistas:det[id]?.vistas||0}}).filter(v=>v.id).sort((a,b)=>b.vistas-a.vistas);
  const thumbs=it.snippet?.thumbnails||{};
  return{channelId:it.id||c.channelId||"",nombre:it.snippet.title||c.nombre,avatar:cleanRemoteUrl(thumbs.high?.url||thumbs.medium?.url||thumbs.default?.url||""),subs:+it.statistics.subscriberCount||0,totalViews:+it.statistics.viewCount||0,nVideos:+it.statistics.videoCount||0,videos,metricsTrusted:true};
}
async function fetchFallback(c){
  const html=await getText(APP.proxy+enc(`https://www.youtube.com/${c.handle}`));
  const id=c.channelId||(html.match(/"externalId":"(UC[\w-]{22})"/)||html.match(/"channelId":"(UC[\w-]{22})"/)||html.match(/\/channel\/(UC[\w-]{22})/)||[])[1];
  const avatar=cleanRemoteUrl(
    (html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/)||
    html.match(/"avatarViewModel":\{"image":\{"sources":\[\{"url":"([^"]+)"/)||
    html.match(/"(https:\/\/yt3\.googleusercontent\.com\/[^"\\]+)"/)||[])[1]||""
  );
  let videos=[];
  if(id){
    const xml=await getText(APP.proxy+enc(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`));
    const doc=new DOMParser().parseFromString(xml,"text/xml");
    videos=[...doc.querySelectorAll("entry")].slice(0,8).map(n=>({id:n.querySelector("videoId")?.textContent||n.querySelector("yt\\:videoId")?.textContent,title:n.querySelector("title")?.textContent||"Video",date:n.querySelector("published")?.textContent||"",vistas:0,dur:""})).filter(v=>v.id);
  }
  return{channelId:id||c.channelId||"",avatar,videos,metricsTrusted:false};
}
async function loadChannel(c){
  try{
    const api=await fetchViaApi(c);
    Object.assign(c,api,{avatar:api.avatar||c.avatar,videos:api.videos?.length?api.videos:c.videos,loaded:true,metricsTrusted:true});
  }catch(error){
    console.warn("No se pudo cargar YouTube API para",c.handle,error);
    try{
      const fallback=await fetchFallback(c);
      Object.assign(c,fallback,{avatar:fallback.avatar||c.avatar,videos:c.videos?.length?c.videos:fallback.videos,subs:0,totalViews:0,nVideos:0,loaded:true,metricsTrusted:false});
    }catch(fallbackError){
      console.warn("No se pudo cargar fallback de YouTube para",c.handle,fallbackError);
      c.subs=0;c.totalViews=0;c.nVideos=0;c.metricsTrusted=false;c.loaded=true;
    }
  }
  renderHero();renderListen();
}
document.addEventListener("click",ev=>{
  const channel=ev.target.closest("[data-i]");if(channel){setActive(+channel.dataset.i);return}
  const nav=ev.target.closest("[data-view]");if(nav){setView(nav.dataset.view);return}
  if(ev.target.closest("#openDisc")||ev.target.closest("#touchDisc")){togglePanel();return}
  if(ev.target.closest("#closePanel"))togglePanel(false);
});
document.addEventListener("keydown",ev=>{if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;if(ev.key==="ArrowLeft")setActive(active-1);if(ev.key==="ArrowRight")setActive(active+1);if(ev.key==="Escape"){if(panelOpen)togglePanel(false);else setView("canales")}});
function initStaticBindings(){
  const mail=$("#mail");
  if(mail){mail.href=`mailto:${APP.correo}?subject=Contacto%20Galadriel%20Music%20Studio`;mail.textContent=APP.correo}
  const studioMail=$("#studioMail");
  if(studioMail)studioMail.href=`mailto:${APP.correo}?subject=Conocer%20Galadriel%20Music%20Studio`;
  const studioLower=document.querySelector(".studio-lower");
  if(studioLower&&!studioLower.dataset.audioReady){
    studioLower.dataset.audioReady="1";
    studioLower.insertAdjacentHTML("beforeend",`<div class="contact-card studio-card studio-audio-card"><h3>Audio del estudio</h3>${audioBlock("Audio del estudio",APP.studioAudio,{nombre:"Galadriel Music Studio"})}</div>`);
    initPlayers(studioLower);
  }
}
const notifyForm=$("#lista-correo"),notifyMsg=$("#susc-msg");
if(notifyForm){
  notifyForm.addEventListener("submit",ev=>{
    const email=notifyForm.email.value.trim();
    const accepted=$("#consent")?.checked;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!accepted){
      ev.preventDefault();
      notifyMsg.textContent=!accepted?"Acepta la politica de privacidad para continuar.":"Escribe un correo valido.";
      notifyMsg.classList.add("error");
      return;
    }
    if(notifyForm.action.includes("TU_ID")){
      ev.preventDefault();
      notifyMsg.classList.remove("error");
      notifyMsg.textContent="Formulario preparado. Falta conectar Formspree o cambiarlo por tu proveedor de correo.";
    }
  });
}
function closeIntro(){const intro=$("#intro");if(!intro||intro.classList.contains("off"))return;intro.classList.add("off");setTimeout(()=>intro.remove(),950)}
function initIntro(){
  const intro=$("#intro"),video=$("#introVideo");
  if(!intro)return;
  intro.addEventListener("click",closeIntro,{once:true});
  addEventListener("keydown",closeIntro,{once:true});
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){setTimeout(closeIntro,500);return}
  const mobile=matchMedia("(max-width: 820px), (pointer: coarse)").matches;
  let started=false;
  let fallback=setTimeout(closeIntro,9000);
  if(video){
    const markStarted=()=>{started=true};
    video.addEventListener("playing",markStarted,{once:true});
    video.addEventListener("timeupdate",markStarted,{once:true});
    setTimeout(()=>{if(mobile&&!started)closeIntro()},1600);
    video.addEventListener("ended",()=>{clearTimeout(fallback);closeIntro()},{once:true});
    video.addEventListener("error",()=>{clearTimeout(fallback);setTimeout(closeIntro,1200)},{once:true});
    video.play?.().catch(()=>{if(mobile)closeIntro()});
  }
}
initIntro();
async function loadSiteData(){
  const response=await fetch("data/channels.json",{cache:"no-store"});
  if(!response.ok)throw new Error("No se pudo cargar data/channels.json");
  const data=await response.json();
  APP=data.app||APP;
  FALLBACK=data.fallback||{};
}
async function boot(){
  try{
    await loadSiteData();
    buildChannels();
    initStaticBindings();renderShop();renderHero();renderListen();setView("canales");CH.forEach(loadChannel);
    setTimeout(()=>{CH.forEach(c=>{if(!c.loaded)c.loaded=true});renderListen();renderHero()},6200);
  }catch(error){
    document.body.insertAdjacentHTML("beforeend",'<p style="position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:99999;padding:1rem;background:#0b0a08;color:#fff;border-radius:8px">No se pudo cargar la data del sitio. Sube tambien la carpeta data.</p>');
    console.error(error);
  }
}
boot();
