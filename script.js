/* LOADER */
window.addEventListener('load',()=>{setTimeout(()=>document.getElementById('loader').classList.add('done'),1800)});

const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* coral/charcoal gradient placeholders (one locked accent) */
const grads={
  g1:'radial-gradient(120% 120% at 30% 20%,#2a2d2f,#141416 70%),linear-gradient(135deg,rgba(255,106,85,.25),transparent)',
  g2:'radial-gradient(120% 120% at 70% 30%,#34292b,#141416 65%),linear-gradient(180deg,rgba(255,106,85,.18),transparent)',
  g3:'radial-gradient(120% 120% at 50% 80%,#232627,#0e0e10 70%),linear-gradient(45deg,rgba(255,106,85,.22),transparent)',
  g4:'linear-gradient(135deg,#2a2d2f,#141416),radial-gradient(80% 80% at 80% 10%,rgba(255,106,85,.3),transparent)',
  g5:'linear-gradient(160deg,#34292b,#141416),radial-gradient(70% 70% at 20% 90%,rgba(255,106,85,.25),transparent)',
  g6:'radial-gradient(100% 100% at 50% 0%,rgba(255,106,85,.32),#141416 70%)'
};
document.querySelectorAll('.ci-media').forEach(m=>{
  const item=m.closest('.cyl-item');const g=grads[item&&item.dataset.grad];
  if(g && !m.classList.contains('play')) m.style.background=g;
  if(g && m.classList.contains('play')) m.style.background=g;
});

/* scroll reveal for non-carousel sections */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ===== CYLINDRICAL CAROUSEL RENDER =====
   Front item is sharp and large. As rotation advances (scroll down),
   the front item tilts and blurs toward the LEFT, the RIGHT item rotates
   into front and becomes main, and the previous left item passes to the
   BACK. One full -360 turn returns to start, then the pin releases. */
function renderCyl(cyl, rotation){
  const items=cyl._items;const n=items.length;const spread=cyl._spread;
  for(let i=0;i<n;i++){
    const el=items[i];
    const a=(i/n)*Math.PI*2 + rotation;   // this item's angle around the cylinder
    const cos=Math.cos(a), sin=Math.sin(a);
    const depth=(cos+1)/2;                 // 1 = front/near, 0 = back/far
    const x=sin*spread;                    // horizontal position: +right, -left
    const scale=0.5+depth*0.5;             // back 0.5 -> front 1.0
    const blur=(1-depth)*12;               // front 0 -> back 12px, sides partial
    const op=0.12+depth*0.88;              // back faint -> front solid
    const ry=-sin*52;                      // tilt like a cylinder face, front flat
    el.style.transform='translate(-50%,-50%) translateX('+x.toFixed(1)+'px) rotateY('+ry.toFixed(1)+'deg) scale('+scale.toFixed(3)+')';
    el.style.filter='blur('+blur.toFixed(2)+'px)';
    el.style.opacity=op.toFixed(3);
    el.style.zIndex=Math.round(depth*100);
    if(depth>0.92){
      el.classList.add('is-front');
    }else{
      el.classList.remove('is-front');
      // if this card was playing a video and is no longer at the front, stop it
      if(el.classList.contains('is-playing')){
        const f=el.querySelector('.ci-video');if(f) f.remove();
        el.classList.remove('is-playing');
      }
    }
  }
}

function initCarousels(){
  const sections=document.querySelectorAll('[data-carousel]');
  sections.forEach(section=>{
    const cyl=section.querySelector('.cyl');
    const stage=section.querySelector('.carousel-stage');
    const bar=section.querySelector('.carousel-progress span');
    const spreadFactor=parseFloat(section.dataset.spread||'0.32');
    cyl._items=Array.from(cyl.querySelectorAll('.cyl-item'));
    const setSpread=()=>{cyl._spread=Math.max(140, stage.clientWidth*spreadFactor);};
    setSpread();
    renderCyl(cyl,0);

    const dist=Math.max(1000, Math.round(window.innerHeight*1.2));
    ScrollTrigger.create({
      trigger:section,
      start:'top top',
      end:'+='+dist,
      pin:true,
      pinSpacing:true,
      scrub:1,
      anticipatePin:1,
      onRefresh:setSpread,
      onUpdate:self=>{
        const rot=-self.progress*Math.PI*2;   // negative: front exits to the left
        renderCyl(cyl,rot);
        if(bar) bar.style.transform='scaleX('+self.progress.toFixed(3)+')';
      }
    });
  });
  ScrollTrigger.refresh();
}

/* init carousels only if motion is allowed and GSAP loaded; else grid fallback */
if(!reduceMotion && window.gsap && window.ScrollTrigger){
  gsap.registerPlugin(ScrollTrigger);
  window.addEventListener('load',initCarousels);
  let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>ScrollTrigger.refresh(),200);});
}else{
  document.body.classList.add('no-motion');
}

/* ===== LOCAL VIDEO CLICK-TO-PLAY =====
   Add data-video="folder/file.mp4" to any card to play an uploaded video
   directly on the portfolio. Optional: add data-poster="posters/file.jpg". */
function stopAllVideos(except){
  document.querySelectorAll('.cyl-item.is-playing').forEach(it=>{
    if(it===except) return;
    const f=it.querySelector('.ci-video');if(f) f.remove();
    it.classList.remove('is-playing');
  });
}
function loadPreviewVideo(video){
  if(video.dataset.loaded || !video.dataset.src) return;
  const previewTime=parseFloat(video.dataset.previewTime || '0.35');
  video.src=video.dataset.src;
  video.preload='metadata';
  video.dataset.loaded='true';
  video.muted=true;
  video.playsInline=true;
  video.addEventListener('loadedmetadata',()=>{
    const target=Math.min(previewTime, Math.max(0, (video.duration || previewTime) - 0.1));
    try{video.currentTime=target;}catch(e){video.classList.add('is-ready');}
  },{once:true});
  video.addEventListener('seeked',()=>{
    video.pause();
    video.classList.add('is-ready');
  },{once:true});
  video.addEventListener('loadeddata',()=>{
    video.pause();
    video.classList.add('is-ready');
  },{once:true});
  video.load();
}
const previewVideos=document.querySelectorAll('.video-preview');
if('IntersectionObserver' in window){
  const previewObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        loadPreviewVideo(entry.target);
        previewObserver.unobserve(entry.target);
      }
    });
  },{rootMargin:'500px 0px',threshold:0.01});
  previewVideos.forEach(video=>previewObserver.observe(video));
}else{
  previewVideos.forEach(loadPreviewVideo);
}
document.querySelectorAll('.cyl-item[data-video]').forEach(item=>{
  item.addEventListener('click',()=>{
    // in the 3D carousel only the front card is clickable; in grid mode all are
    const inGrid=document.body.classList.contains('no-motion');
    if(!inGrid && !item.classList.contains('is-front')) return;
    if(item.classList.contains('is-playing')) return;
    stopAllVideos(item);
    const video=document.createElement('video');
    video.className='ci-video';
    video.src=item.dataset.video;
    if(item.dataset.poster) video.poster=item.dataset.poster;
    video.controls=true;
    video.autoplay=true;
    video.playsInline=true;
    video.preload='metadata';
    item.appendChild(video);
    item.classList.add('is-playing');
  });
});

/* ===== 3D ROBOT (reads scroll inside rAF, no scroll listener) ===== */
const canvas=document.getElementById('robot-canvas');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(window.innerWidth,window.innerHeight);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,.1,100);
camera.position.set(0,0,8);
scene.add(new THREE.AmbientLight(0xffffff,.35));
const key=new THREE.DirectionalLight(0xffffff,1.1);key.position.set(5,6,8);scene.add(key);
const coralLight=new THREE.PointLight(0xff6a55,2.2,30);coralLight.position.set(-6,2,5);scene.add(coralLight);
const rim=new THREE.PointLight(0x6688ff,1,30);rim.position.set(6,-3,-4);scene.add(rim);
const bodyMat=new THREE.MeshStandardMaterial({color:0x232627,metalness:.85,roughness:.25});
const darkMat=new THREE.MeshStandardMaterial({color:0x141416,metalness:.9,roughness:.3});
const coralMat=new THREE.MeshStandardMaterial({color:0xff6a55,emissive:0xff6a55,emissiveIntensity:.9,metalness:.4,roughness:.3});
const whiteMat=new THREE.MeshStandardMaterial({color:0xfcfcfd,metalness:.6,roughness:.2});
const robot=new THREE.Group();const head=new THREE.Group();
head.add(new THREE.Mesh(new THREE.BoxGeometry(2.4,2.2,2.2),bodyMat));
const face=new THREE.Mesh(new THREE.BoxGeometry(2.0,1.7,.3),darkMat);face.position.set(0,0,1.12);head.add(face);
const visor=new THREE.Mesh(new THREE.BoxGeometry(1.6,.5,.2),new THREE.MeshStandardMaterial({color:0x0a0a0c,metalness:.9,roughness:.1}));visor.position.set(0,.15,1.22);head.add(visor);
const eyeGeo=new THREE.SphereGeometry(.16,24,24);
const eyeL=new THREE.Mesh(eyeGeo,coralMat);eyeL.position.set(-.42,.15,1.34);head.add(eyeL);
const eyeR=new THREE.Mesh(eyeGeo,coralMat);eyeR.position.set(.42,.15,1.34);head.add(eyeR);
const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.9,12),whiteMat);antenna.position.set(0,1.45,0);head.add(antenna);
const bulb=new THREE.Mesh(new THREE.SphereGeometry(.12,16,16),coralMat);bulb.position.set(0,1.95,0);head.add(bulb);
[-1.3,1.3].forEach(x=>{
  const ear=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,.25,24),darkMat);ear.rotation.z=Math.PI/2;ear.position.set(x,0,0);head.add(ear);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.36,.04,12,24),coralMat);ring.rotation.y=Math.PI/2;ring.position.set(x*1.07,0,0);head.add(ring);
});
const jaw=new THREE.Mesh(new THREE.BoxGeometry(1.4,.3,.4),darkMat);jaw.position.set(0,-.85,1.0);head.add(jaw);
robot.add(head);
const neck=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,.8,24),bodyMat);neck.position.set(0,-1.7,0);robot.add(neck);
robot.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.25,32),darkMat)).position.set(0,-2.1,0);
const orbit=new THREE.Group();
const ring1=new THREE.Mesh(new THREE.TorusGeometry(3.2,.015,12,80),new THREE.MeshStandardMaterial({color:0xff6a55,emissive:0xff6a55,emissiveIntensity:.5,transparent:true,opacity:.5}));ring1.rotation.x=Math.PI/2.2;orbit.add(ring1);
const ring2=new THREE.Mesh(new THREE.TorusGeometry(3.8,.01,12,80),new THREE.MeshStandardMaterial({color:0x777e90,transparent:true,opacity:.35}));ring2.rotation.x=Math.PI/3;ring2.rotation.y=Math.PI/4;orbit.add(ring2);
scene.add(orbit);
const pGeo=new THREE.BufferGeometry();const pCount=120;const pos=new Float32Array(pCount*3);
for(let i=0;i<pCount*3;i++)pos[i]=(Math.random()-.5)*18;
pGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
const particles=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xff6a55,size:.04,transparent:true,opacity:.6}));
scene.add(particles);scene.add(robot);
function placeRobot(){
  if(window.innerWidth>900){robot.position.x=3.2;orbit.position.x=3.2;}
  else{robot.position.x=0;orbit.position.x=0;robot.position.y=1.2;orbit.position.y=1.2;}
}
placeRobot();
const target={x:0,y:0};
window.addEventListener('mousemove',e=>{target.x=(e.clientX/window.innerWidth)*2-1;target.y=(e.clientY/window.innerHeight)*2-1;});
window.addEventListener('touchmove',e=>{if(e.touches[0]){target.x=(e.touches[0].clientX/window.innerWidth)*2-1;target.y=(e.touches[0].clientY/window.innerHeight)*2-1;}},{passive:true});
let prevScroll=window.scrollY,scrollLook=0,t=0;
function animate(){
  requestAnimationFrame(animate);
  t+=.01;
  const sY=window.scrollY;
  const maxScroll=Math.max(1,document.body.scrollHeight-window.innerHeight);
  const scrollProgress=sY/maxScroll;
  const delta=sY-prevScroll;prevScroll=sY;
  scrollLook=scrollLook*0.9+Math.max(-1,Math.min(1,delta*0.05))*0.1;
  const lookX=target.x*0.8;
  const lookY=(target.y*0.5)+(scrollLook*0.9);   // positive rotation.x = look down
  head.rotation.y+=(lookX-head.rotation.y)*0.07;
  head.rotation.x+=(lookY-head.rotation.x)*0.07;
  head.rotation.z+=((-target.x*0.05)-head.rotation.z)*0.05;
  const baseY=window.innerWidth>900?0:1.2;
  robot.position.y=baseY-scrollProgress*4.5+Math.sin(t)*0.12;
  robot.rotation.y=scrollProgress*Math.PI*2;
  robot.position.z=-scrollProgress*2;
  orbit.position.y=robot.position.y;orbit.position.z=robot.position.z;
  coralMat.emissiveIntensity=0.6+Math.abs(Math.sin(t*2))*0.6;
  orbit.rotation.z+=0.004;orbit.rotation.y+=0.002;ring1.rotation.z+=0.01;
  coralLight.position.x=Math.sin(t*0.5)*6;coralLight.position.y=Math.cos(t*0.4)*3;
  particles.rotation.y+=0.0008;particles.position.y=Math.sin(t*0.3)*0.5;
  camera.position.x+=(target.x*0.4-camera.position.x)*0.04;
  const camTargetY=-target.y*0.3+robot.position.y*0.55;
  camera.position.y+=(camTargetY-camera.position.y)*0.05;
  camera.lookAt(robot.position.x*0.5,robot.position.y*0.7,0);
  renderer.render(scene,camera);
}
animate();
window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  placeRobot();
});
