/* GALADRIEL TIENDA V30: 7 channel LOGOS -> 5 artworks each -> device-specific previews.
   Free image downloads; optional support; music consultation only after price/rights confirmation. */
(()=>{'use strict';
const root=document.getElementById('view-tienda');if(!root)return;
const $=id=>root.querySelector(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let collection=null,channels=[],active=1,selected=0,transitionId=0,requestKind='existing';
const rail=$('#sh30Rail'),list=$('#sh30Items'),art=$('#sh30StageArt');
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad=i=>String(i+1).padStart(2,'0');
const getCurrent=()=>channels[active];
function offset(i){const n=channels.length;let d=(i-active+n)%n;if(d>Math.floor(n/2))d-=n;return d;}
function buildRail(){
  rail.innerHTML=channels.map((ch,i)=>`<button class="sh30-channel" type="button" data-sh30-channel="${i}" aria-label="Elegir ${safe(ch.name)}" aria-pressed="false"><span class="sh30-logo" data-sh30-slug="${safe(ch.slug)}" data-fallback="${safe(ch.mono)}">${safe(ch.mono)}</span><span class="sh30-channel-name">${safe(ch.name)}</span></button>`).join('');
  updateRail();refreshAvatars();
}
function updateRail(){
  rail.querySelectorAll('[data-sh30-channel]').forEach((el)=>{
    const i=Number(el.dataset.sh30Channel);el.dataset.slot=offset(i);
    el.setAttribute('aria-pressed',i===active?'true':'false');el.tabIndex=Math.abs(offset(i))<=2?0:-1;
  });
  $('#sh30Counter').textContent=pad(active)+' / '+pad(channels.length-1);
  $('#sh30Counter').setAttribute('aria-label',`Canal ${active+1} de ${channels.length}`);
  $('#sh30HeroName').textContent=getCurrent().name.toUpperCase();
}
function refreshAvatars(){
  // The existing application fetches each official YouTube avatar into CH asynchronously.
  const source=(typeof CH!=='undefined' && Array.isArray(CH))?CH:[];
  for(const ch of channels){
    const found=source.find(x=>(x.nombre||'').toLowerCase()===ch.name.toLowerCase());
    const target=rail.querySelector(`[data-sh30-slug="${ch.slug}"]`);
    if(!target || !found?.avatar || target.dataset.loaded===found.avatar)continue;
    const image=document.createElement('img');image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';
    image.onload=()=>{target.replaceChildren(image);target.dataset.loaded=found.avatar;};
    image.onerror=()=>{image.remove();};image.src=found.avatar;
  }
}
function renderList(){
  const ch=getCurrent();
  list.innerHTML=ch.items.map((it,i)=>`<button type="button" class="sh30-item" data-sh30-item="${i}" aria-pressed="${i===selected}" aria-label="Previsualizar ${safe(it.name)}"><img src="${safe(it.wide)}" alt="" loading="lazy"><span class="sh30-item-text"><small>OBRA ${pad(i)}</small>${safe(it.name)}</span><b class="sh30-item-no">${i===selected?'✓':'↗'}</b></button>`).join('');
  $('#sh30Strap').textContent=ch.provisional?`${ch.strap}. Estas cinco posiciones son muestras provisionales, listas para sustituirse por obras definitivas del canal.`:`${ch.strap}. Elige una de las cinco imágenes y mira sus encuadres en las cuatro pantallas.`;
  const download=$('#sh30Download');download.disabled=!!ch.provisional;
  download.innerHTML=ch.provisional?'Obras finales en preparación <span aria-hidden="true">○</span>':'Descargar imagen gratis <span aria-hidden="true">↓</span>';
  $('.sh30-free-label').textContent=ch.provisional?'MUESTRAS DE CATÁLOGO · EN REVISIÓN':'GRATIS · Sin compra ni registro';
  $('.sh30-terms').textContent=ch.provisional?'No ofrecemos estas referencias como obras terminadas. Se habilitará su descarga al aprobar las cinco imágenes del canal.':'El aporte nunca es obligatorio. Para uso comercial, consúltanos previamente.';
}
async function renderDevices(){
  const id=++transitionId,ch=getCurrent(),item=ch.items[selected];
  $('#sh30StageChannel').textContent=ch.name.toUpperCase();
  $('#sh30StageIndex').textContent=`OBRA ${pad(selected)} / 05`;
  $('#sh30SelectedName').textContent=item.name;
  if(!reduced())art.classList.add('is-changing');
  // Preload new assets before replacing all four images together, avoiding mismatched screens.
  const urls=[item.wide,item.tablet,item.mobile];
  await Promise.all(urls.map(src=>new Promise(resolve=>{const img=new Image();img.onload=resolve;img.onerror=resolve;img.src=src;})));
  if(id!==transitionId)return;
  art.querySelectorAll('[data-sh30-screen]').forEach(img=>{img.src=item[img.dataset.sh30Screen];img.alt=`${item.name} en ${img.dataset.sh30Screen==='wide'?(img.closest('.sh30-laptop')?'laptop':'monitor'):img.dataset.sh30Screen==='tablet'?'tablet':'celular'}`;});
  requestAnimationFrame(()=>art.classList.remove('is-changing'));
}
function chooseChannel(i){
  if(!channels.length)return;
  i=(i+channels.length)%channels.length;if(i===active)return;
  active=i;selected=0;updateRail();renderList();renderDevices();
}
function chooseArtwork(i){
  if(i<0||i>=getCurrent().items.length||i===selected)return;
  selected=i;list.querySelectorAll('[data-sh30-item]').forEach(el=>{const on=Number(el.dataset.sh30Item)===i;el.setAttribute('aria-pressed',on?'true':'false');el.querySelector('.sh30-item-no').textContent=on?'✓':'↗';});renderDevices();
}
root.addEventListener('click',event=>{
  const ch=event.target.closest('[data-sh30-channel]');if(ch)return chooseChannel(+ch.dataset.sh30Channel);
  const step=event.target.closest('[data-sh30-step]');if(step)return chooseChannel(active+Number(step.dataset.sh30Step));
  const item=event.target.closest('[data-sh30-item]');if(item)return chooseArtwork(+item.dataset.sh30Item);
  if(event.target.closest('[data-sh30-close]'))event.target.closest('dialog')?.close();
});
let touchX=0;
rail.addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX;},{passive:true});
rail.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-touchX;if(Math.abs(d)>44)chooseChannel(active+(d<0?1:-1));},{passive:true});
rail.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();chooseChannel(active+(e.key==='ArrowRight'?1:-1));}});
$('#sh30Explore').addEventListener('click',()=>$('#sh30Content').scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'}));
const freeDialog=$('#sh30FreeDialog'),musicDialog=$('#sh30MusicDialog');
function supportHref(){
  const url=collection?.support?.paypalUrl||'';
  if(/^https:\/\//.test(url))return url;
  const email=collection?.support?.contactEmail||'galdriel2818@hotmail.com';
  return `mailto:${email}?subject=${encodeURIComponent('Aporte voluntario a Galadriel Music Studio')}&body=${encodeURIComponent('Hola. Disfruté una imagen gratuita y quisiera recibir el enlace oficial de PayPal para apoyar voluntariamente al estudio. Gracias.')}`;
}
function openFree(){
  const ch=getCurrent();if(ch.provisional)return;const it=ch.items[selected];
  $('#sh30FreeArt').textContent=`${ch.name} · ${it.name}. Descarga gratuita: elige el encuadre que prefieras.`;
  freeDialog.querySelectorAll('[data-sh30-file]').forEach(a=>{const kind=a.dataset.sh30File;a.href=it[kind];a.download=`galadriel-${ch.slug}-${it.id}-${kind}.webp`;});
  const paypal=$('#sh30PayPalLink');paypal.href=supportHref();
  paypal.textContent=collection.support.paypalUrl?'Apoyar por PayPal ♡':'Solicitar enlace PayPal ♡';
  paypal.target=collection.support.paypalUrl?'_blank':'_self';
  freeDialog.showModal();
}
$('#sh30Download').addEventListener('click',openFree);
$('#sh30Support').addEventListener('click',openFree);
function openMusic(kind){requestKind=kind;$('#sh30MusicForm').reset();$('#sh30MusicFormTitle').textContent=kind==='custom'?'Encargar una canción original':'Solicitar música de un canal';$('#sh30FormChannel').value=getCurrent().slug;$('#sh30FormUrl').required=kind!=='custom';$('#sh30FormFormat').value=kind==='custom'?'Composición personalizada':'WAV · según maestro disponible';musicDialog.showModal();}
root.querySelectorAll('[data-sh30-request]').forEach(button=>button.addEventListener('click',()=>openMusic(button.dataset.sh30Request)));
function message(){const name=getCurrent()?.name||'Galadriel Music Studio';const channel=$('#sh30FormChannel');const selectedChannel=channel.options[channel.selectedIndex]?.textContent||name;
  const url=$('#sh30FormUrl').value.trim(),start=$('#sh30FormFrom').value.trim(),end=$('#sh30FormTo').value.trim(),format=$('#sh30FormFormat').value,notes=$('#sh30FormNotes').value.trim();
  const subject=requestKind==='custom'?'Solicitud de música original · Galadriel':'Consulta de versión premium · Galadriel';
  const body=`Hola, Galadriel Music Studio:\n\nSolicitud: ${requestKind==='custom'?'Nueva composición personalizada':'Versión de una pieza existente'}\nCanal: ${selectedChannel}\nEnlace del video: ${url||'No aplica / por confirmar'}\nFragmento: ${start||'Sin indicar'} — ${end||'Sin indicar'}\nFormato: ${format}\nDetalles: ${notes||'Sin indicaciones adicionales'}\n\nPor favor, confirmen disponibilidad del archivo maestro, permisos o licencia aplicable, precio definitivo y forma de entrega antes de cualquier pago.\n\nGracias.`;
  return {subject,body};
}
$('#sh30MusicForm').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.reportValidity())return;const {subject,body}=message();location.href=`mailto:${collection.support.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;});
$('#sh30CopyRequest').addEventListener('click',async()=>{const {subject,body}=message();try{await navigator.clipboard.writeText(subject+'\n\n'+body);$('#sh30FormStatus').textContent='Solicitud copiada. Pégala en tu correo.';}catch{$('#sh30FormStatus').textContent='Si tu navegador bloquea el portapapeles, utiliza «Preparar solicitud».';}});
for(const d of [freeDialog,musicDialog])d.addEventListener('click',e=>{if(e.target===d)d.close();});
async function init(){
  try{const response=await fetch('data/shop-v30.json?v=30',{cache:'no-store'});if(!response.ok)throw Error('No se encuentra data/shop-v30.json');collection=await response.json();channels=collection.channels;active=Math.max(0,channels.findIndex(c=>c.slug===collection.defaultChannel));selected=0;
    buildRail();renderList();renderDevices();$('#sh30FormChannel').innerHTML=channels.map(ch=>`<option value="${safe(ch.slug)}">${safe(ch.name)}</option>`).join('');
    const observerTarget=document.getElementById('channelRail');if(observerTarget){let throttle=0;const obs=new MutationObserver(()=>{clearTimeout(throttle);throttle=setTimeout(refreshAvatars,120);});obs.observe(observerTarget,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});}
    refreshAvatars();
  }catch(err){console.error('[Tienda V30]',err);rail.innerHTML='<p role="alert" style="text-align:center;color:#f6dac0">No se pudo cargar el catálogo. Comprueba data/shop-v30.json y las carpetas img/shop/v30.</p>';}
}
init();
})();
