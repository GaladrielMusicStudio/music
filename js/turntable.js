/* The existing audio player is the sole playback source. No second audio element. */
(()=>{
 const zone=document.querySelector('.tt-zone');
 if(!zone)return;
 const rotor=zone.querySelector('.tt-rotor'),lift=zone.querySelector('.tt-arm-lift');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let playing=false,speed=0,angle=0,last=0,frame=0;
 function tick(now){
  const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  const target=playing&&!reduced.matches?200:0,previous=speed;
  speed=target+(speed-target)*Math.exp(-dt/(playing?.42:.62));
  angle=(angle+(previous+speed)*.5*dt)%360;
  rotor.style.transform=`rotate(${angle}deg)`;
  if((playing&&!reduced.matches)||speed>.08)frame=requestAnimationFrame(tick);
  else{frame=0;last=0;speed=0;}
 }
 function setPlaying(value){
  value=!!value;
  zone.classList.toggle('is-audio-playing',value);
  if(playing===value)return;
  playing=value;
  if(!reduced.matches){lift.classList.remove('is-cueing');void lift.getBoundingClientRect();lift.classList.add('is-cueing');}
  if(!frame){last=0;frame=requestAnimationFrame(tick);}
 }
 window.galadrielTurntable={setPlaying};
})();
