/* Tienda V29: independent visual selector; no payment, backend or fabricated catalogue inventory. */
(()=>{'use strict';
const root=document.getElementById('view-tienda');if(!root)return;
const base='img/shop/v29/';
const items=[
 {slug:'paisajes',name:'Paisajes de fantasía',type:'ARTE VISUAL',short:'Paisajes',detail:'Escenas panorámicas'},
 {slug:'cantos',name:'Cantos élficos',type:'PORTADA / MÚSICA',short:'Personajes',detail:'Retratos y atmósferas'},
 {slug:'visual',name:'Colección visual cinematográfica',type:'COLECCIÓN EDITORIAL',short:'Colecciones',detail:'Universos visuales'},
 {slug:'norte',name:'Ecos del norte',type:'PAISAJES / MÚSICA',short:'Nórdico',detail:'Montañas y horizontes'},
 {slug:'alma',name:'Arte con alma',type:'ILUSTRACIÓN',short:'Naturaleza',detail:'Bosques y luz'}
];
let active=2,changeTimer=null,copyBody='';
const $=s=>root.querySelector(s);
const slots=$('#shSlots'),count=$('#shCount'),types=$('#shTypes');
const safe=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function relative(i){const n=items.length;let d=(i-active+n)%n;if(d>Math.floor(n/2))d-=n;return d;}
function render(){
 slots.innerHTML='<span class="sh-vinyl" aria-hidden="true"></span>'+items.map((item,i)=>`<button type="button" class="sh-cover" data-sh-index="${i}" data-slot="${relative(i)}" aria-label="Seleccionar ${safe(item.name)}" aria-pressed="${active===i}"><img src="${base+item.slug}.webp" alt="" draggable="false" loading="eager"><span class="sh-cover-category">${safe(item.type)}</span><span class="sh-cover-title">${safe(item.name)}</span></button>`).join('');
 count.textContent=String(active+1).padStart(2,'0')+' / '+String(items.length).padStart(2,'0');
 count.setAttribute('aria-label',`Colección ${active+1} de ${items.length}`);
 types.innerHTML=items.map((item,i)=>`<button type="button" class="sh-type" data-sh-index="${i}" aria-pressed="${i===active}" aria-label="Mostrar ${safe(item.name)}"><span><img src="${base+item.slug}.webp" alt="" loading="lazy">${safe(item.short)}</span><small>${i===active?'ACTIVA':'VER ↗'}</small></button>`).join('');
 $('#shActiveLabel').textContent=items[active].name.toUpperCase();
 const src=base+items[active].slug+'.webp';
 root.querySelectorAll('[data-sh-device-img]').forEach(img=>{img.src=src;img.alt=`Vista previa de ${items[active].name}`;});
 const saver=$('#shSave');saver.href=src;saver.download='galadriel-muestra-'+items[active].slug+'.webp';
}
function choose(i){i=(i+items.length)%items.length;if(i===active)return;clearTimeout(changeTimer);slots.classList.add('sh-moving');root.querySelectorAll('.sh-device').forEach(x=>x.classList.add('sh-fading'));changeTimer=setTimeout(()=>{active=i;render();requestAnimationFrame(()=>{slots.classList.remove('sh-moving');root.querySelectorAll('.sh-device').forEach(x=>x.classList.remove('sh-fading'));});},145);}
root.addEventListener('click',e=>{const target=e.target.closest('[data-sh-step],[data-sh-index]');if(target){if(target.dataset.shStep)choose(active+Number(target.dataset.shStep));else choose(Number(target.dataset.shIndex));}});
let startX=0;slots.addEventListener('touchstart',e=>{startX=e.changedTouches[0].clientX;},{passive:true});slots.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>45)choose(active+(dx<0?1:-1));},{passive:true});
slots.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();choose(active+(e.key==='ArrowRight'?1:-1));}});
$('#shJump').addEventListener('click',()=>$('#shCollection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
const recipient='galdriel2818@hotmail.com';
const dialog=$('#shRequestDialog'),form=$('#shRequestForm'),title=$('#shRequestTitle');let requestType='premium';
function openRequest(type){requestType=type;form.reset();title.textContent=type==='custom'?'Solicitar canción personalizada':'Solicitar música o fragmento';$('#shRequestIntro').textContent=type==='custom'?'Describe la historia, estilo o emoción que quieres convertir en música.':'Indica el canal, enlace del video y el fragmento exacto que buscas.';$('#shFormat').value=type==='custom'?'Composición personalizada':'Audio completo · Consultar disponibilidad';dialog.showModal();}
root.querySelectorAll('[data-sh-request]').forEach(b=>b.addEventListener('click',()=>openRequest(b.dataset.shRequest)));
$('#shClose').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
function makeMessage(){const channel=$('#shChannel').value.trim(),url=$('#shVideo').value.trim(),start=$('#shFrom').value.trim(),end=$('#shTo').value.trim(),format=$('#shFormat').value,notes=$('#shNotes').value.trim();const subject=(requestType==='custom'?'Composición personalizada':'Consulta de audio')+' — Galadriel Music Studio';const body=`Hola Galadriel Music Studio,\n\nSolicitud: ${requestType==='custom'?'Canción personalizada':'Pieza o fragmento existente'}\nCanal / universo: ${channel}\nEnlace del video: ${url||'Por confirmar'}\nFragmento: ${start||'Sin indicar'} a ${end||'Sin indicar'}\nFormato / finalidad: ${format}\nDetalles: ${notes||'Sin indicaciones adicionales'}\n\nPor favor confirmen la disponibilidad, derechos de uso, calidad, precio (si aplica) y forma de entrega antes de realizar cualquier pago.\n\nGracias.`;return {subject,body};}
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const {subject,body}=makeMessage();window.location.href=`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;});
$('#shCopy').addEventListener('click',async()=>{const {subject,body}=makeMessage();copyBody=subject+'\n\n'+body;try{await navigator.clipboard.writeText(copyBody);$('#shCopyStatus').textContent='Solicitud copiada. Envíala a '+recipient;}catch{$('#shCopyStatus').textContent='Puedes enviarla a '+recipient+' desde tu correo.';}});
// No direct PayPal charge link has been provided. The user explicitly approves optional support, so request the real address by email instead of manufacturing a checkout link.
$('[data-sh-paypal]').addEventListener('click',()=>{const subject='Quiero apoyar voluntariamente a Galadriel Music Studio';const body='Hola, disfruté las muestras visuales y quisiera realizar un aporte voluntario. ¿Podrían enviarme su enlace oficial de PayPal? Gracias.';window.location.href=`mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;});
render();
})();
