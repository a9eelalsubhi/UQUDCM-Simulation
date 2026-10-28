import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {buildFacility,roomData,siteLayout} from './facility.js';
import {createDrill} from './drill.js';
import {createDashboard} from './dashboard.js';
import {stadiumOutline} from './traffic.js';
const $=id=>document.getElementById(id);
const viewport=$('viewport'),scene=new THREE.Scene();
scene.background=new THREE.Color('#c8d9e4');scene.fog=new THREE.Fog('#c8d9e4',175,370);
const camera=new THREE.PerspectiveCamera(48,1,.2,900);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch(e){$('loading').innerHTML='<h2>المتصفح لا يدعم عرض 3D</h2><p>افتح الرابط في Chrome أو Safari حديث مع تفعيل WebGL.</p>';throw e}
const mobileScreen=matchMedia('(max-width:800px)').matches;renderer.setPixelRatio(Math.min(devicePixelRatio,mobileScreen?1.5:2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;viewport.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#e8f2ff','#aaa088',1.35));
const sun=new THREE.DirectionalLight('#fff0d9',2.7);sun.position.set(-40,72,38);sun.target.position.set(-15,0,10);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(mobileScreen?2048:4096,mobileScreen?2048:4096);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=86;sun.shadow.camera.bottom=-90;sun.shadow.camera.near=1;sun.shadow.camera.far=210;sun.shadow.bias=-.00012;sun.shadow.normalBias=.095;scene.add(sun);
const fill=new THREE.DirectionalLight('#eaf3ff',.6);fill.position.set(20,20,-30);scene.add(fill);
const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;const skyCtx=skyCanvas.getContext('2d'),skyGrad=skyCtx.createLinearGradient(0,0,0,256);skyGrad.addColorStop(0,'#84accf');skyGrad.addColorStop(.48,'#e5eced');skyGrad.addColorStop(.53,'#d6ccb5');skyGrad.addColorStop(1,'#857c6c');skyCtx.fillStyle=skyGrad;skyCtx.fillRect(0,0,512,256);const skyTex=new THREE.CanvasTexture(skyCanvas);skyTex.colorSpace=THREE.SRGBColorSpace;skyTex.mapping=THREE.EquirectangularReflectionMapping;scene.environment=skyTex;scene.environmentIntensity=.35;

const facility=buildFacility(scene);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.07;orbit.maxPolarAngle=Math.PI/2.07;orbit.minDistance=5;orbit.maxDistance=650;orbit.target.set(0,0,7);
let mode='overview',yaw=0,pitch=0,keys={},lastTime=0,drag=null,toastTimer,panelsOpen=false;
let drill=null,drillSnapshot=null,cameraGoal=null,dashboard=null;
function stopFollow(){cameraGoal=null;if(drill?.active)drill.setFollow(false);}
orbit.addEventListener('start',stopFollow);
const places=[
{id:'loop',name:'الطريق الدائري للإسعاف',x:35,z:58,yaw:-Math.PI/2,color:'#3e7380'},
{id:'entry',name:'مدخل الكلية',x:0,z:11,color:'#486750'},
{id:'reception',name:'الاستقبال',x:0,z:-6.4,color:'#486750'},
{id:'dashboard',name:'شاشة الأسرّة',x:6.25,z:-12.5,yaw:0,color:'#2f7b8f'},
{id:'A',name:'Zone A',x:-33.25,z:3.0,yaw:Math.PI,color:'#db5551'},
{id:'B',name:'Zone B',x:-20.25,z:3.0,yaw:Math.PI,color:'#38a071'},
{id:'C',name:'Zone C',x:20.25,z:3.0,yaw:Math.PI,color:'#3987d5'},
{id:'D',name:'Zone D',x:33.25,z:3.0,yaw:Math.PI,color:'#edbd3c'},
{id:'exit',name:'باب الحريق · الجناح المتصل',x:63,z:2,yaw:Math.PI/2,color:'#486750'},
{id:'red',name:'الفرز الأحمر',x:siteLayout.red.x,z:siteLayout.red.z+3.5,color:'#c74842'},
{id:'black',name:'منطقة الوفيات — أسود',x:siteLayout.black.x,z:siteLayout.black.z+2,color:'#303c40'},
{id:'helipad',name:'مهبط الإخلاء الجوي',x:-19,z:30,yaw:Math.PI/2,color:'#376a7d'},
{id:'yellow',name:'الفرز الأصفر',x:siteLayout.yellow.x,z:siteLayout.yellow.z+3.5,color:'#d6ad3d'},
{id:'green',name:'الفرز الأخضر',...siteLayout.greenArrival,color:'#418b68'},
{id:'prayer',name:'المصلى',x:0,z:-19,color:'#486750'},
{id:'cafe',name:'UQU Cafe',x:-6.5,z:-12.5,color:'#78583c'},
{id:'briefing',name:'قاعة التدريب',x:-13.6,z:-1.2,color:'#718873'}
];
for(const p of places){const b=document.createElement('button');b.dataset.place=p.id;b.innerHTML='<i class="dot" style="background:'+p.color+'"></i>'+p.name;b.addEventListener('click',()=>go(p));$('destinations').appendChild(b)}
function optimizeStatic(){
 facility.world.updateMatrixWorld(true);const buckets=new Map();facility.world.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)&&!o.material.transparent){let node=o;while(node){if(node.userData.simulationPatient)return;node=node.parent}let ancestor=o;while(ancestor&&!ancestor.userData.actorId)ancestor=ancestor.parent;if(ancestor)o.userData.actorId=ancestor.userData.actorId;const p=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld),key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow+':'+Math.floor(p.x/24)+':'+Math.floor(p.z/24);let items=buckets.get(key);if(!items){items=[];buckets.set(key,items)}items.push(o)}});
 for(const items of buckets.values()){if(items.length<2)continue;const geoms=items.map(o=>{let g=o.geometry.clone();if(g.index)g=g.toNonIndexed();return g.applyMatrix4(o.matrixWorld)}),merged=mergeGeometries(geoms,false);if(merged){const o=new THREE.Mesh(merged,items[0].material);o.castShadow=items[0].castShadow;o.receiveShadow=items[0].receiveShadow;o.userData.actorIds=[...new Set(items.map(i=>i.userData.actorId).filter(Boolean))];items.forEach(old=>{old.parent.remove(old);if(!old.geometry.userData.shared)old.geometry.dispose()});facility.world.add(o)}geoms.forEach(g=>g.dispose())}
}
optimizeStatic();
function fitOverview(){
 const target=new THREE.Vector3(22,0,43),back=new THREE.Vector3(75,101,115).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),back).normalize(),up=new THREE.Vector3().crossVectors(back,right),tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;let distance=0;
 for(const x of [-73,117])for(const z of [-25,120])for(const y of [0,8]){const v=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,Math.abs(v.dot(right))/tanH+v.dot(back),Math.abs(v.dot(up))/tanV+v.dot(back));}
 distance*=1.08;camera.position.copy(target).addScaledVector(back,distance);orbit.target.copy(target);orbit.update();scene.fog.near=Math.max(175,distance*1.15);scene.fog.far=Math.max(370,distance*2);
}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(mode==='overview')fitOverview();}

addEventListener('resize',resize);new ResizeObserver(resize).observe(viewport);
function overview(){mode='overview';document.body.classList.remove('walking');orbit.enabled=true;camera.near=.3;camera.updateProjectionMatrix();camera.position.set(55,101,132);orbit.target.set(-20,0,17);orbit.update();$('overview-btn').classList.add('active');$('walk-btn').classList.remove('active');$('crosshair').hidden=true;$('mobile-controls').hidden=true;$('mode-help').textContent='اسحب للدوران · مرّر للتقريب';$('location').textContent='عرض المرفق كاملًا';$('roof-toggle').checked=false;facility.roofs.visible=false;renderer.shadowMap.needsUpdate=true;document.querySelectorAll('[data-place]').forEach(b=>b.classList.remove('selected'));resize();}
function isBlocked(x,z){const b=siteLayout.bounds;return x<b.x0||x>b.x1||z<b.z0||z>b.z1||facility.colliders.some(b=>!(drill?.active&&b.staticPatient)&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ)}
function safePoint(x,z){if(!isBlocked(x,z))return [x,z];for(let r=.4;r<5;r+=.4)for(let t=0;t<Math.PI*2;t+=.4){const a=x+Math.cos(t)*r,b=z+Math.sin(t)*r;if(!isBlocked(a,b))return[a,b]}return[0,11]}
function go(p){mode='walk';scene.fog.near=175;scene.fog.far=370;document.body.classList.add('walking');orbit.enabled=false;const [x,z]=safePoint(p.x,p.z);camera.near=.1;camera.updateProjectionMatrix();camera.position.set(x,1.68+facility.groundHeight(x,z),z);yaw=p.yaw??0;pitch=0;camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);$('overview-btn').classList.remove('active');$('walk-btn').classList.add('active');$('crosshair').hidden=false;$('mobile-controls').hidden=matchMedia('(pointer:fine)').matches;$('mode-help').textContent='W A S D / الأسهم للحركة · اسحب للنظر · Shift أسرع';$('roof-toggle').checked=true;facility.roofs.visible=true;renderer.shadowMap.needsUpdate=true;document.querySelectorAll('[data-place]').forEach(b=>b.classList.toggle('selected',b.dataset.place===p.id));resize();updateLocation();}
$('overview-btn').onclick=()=>{stopFollow();overview()};$('walk-btn').onclick=()=>{stopFollow();go(places[0])};
$('roof-toggle').onchange=e=>{facility.roofs.visible=e.target.checked;renderer.shadowMap.needsUpdate=true};$('smoke-toggle').onchange=e=>{facility.smoke.visible=e.target.checked;facility.fireLight.visible=e.target.checked};
function updateLocation(){if(mode!=='walk')return;const x=camera.position.x,z=camera.position.z;let title='الساحة الخارجية';if(z<4&&z>-18&&Math.abs(x)<10)title='الاستقبال والمركز الرئيسي';if(z<-18&&Math.abs(x)<10)title='المصلى';if(z>4&&z<12){const r=roomData.find(r=>Math.abs(x-r.x)<3.25);if(r)title='Zone '+r.zone+' · '+r.id+' — غرفة محاكاة'}if(z>=0&&z<4&&Math.abs(x)>10)title=x<0?'ممر الجناح الأيسر':'ممر الجناح الأيمن';if(x>43&&z>-1&&z<4)title='المخرج الجانبي للكلية';if(x>43&&x<59&&z>=-8&&z<=12)title='جناح الحريق المتصل بالكلية';for(const t of facility.triages)if(Math.abs(x-t.x)<t.w/2+1&&Math.abs(z-t.z)<t.d/2+1)title=t.title.split('\n')[1];$('location').textContent=title;}
addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName)||panelsOpen)return;keys[e.code]=true;if(mode==='walk'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape')drag=null;});
addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',()=>{keys={};drag=null});
renderer.domElement.addEventListener('pointerdown',e=>{if(mode==='walk'&&!panelsOpen){drag={x:e.clientX,y:e.clientY,id:e.pointerId};renderer.domElement.setPointerCapture(e.pointerId)}});
renderer.domElement.addEventListener('pointermove',e=>{if(mode==='walk'&&drag&&drag.id===e.pointerId){yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.1,1.1);drag.x=e.clientX;drag.y=e.clientY;}});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
const moveCodes={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD'};
document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();keys[moveCodes[b.dataset.move]]=true;b.setPointerCapture(e.pointerId)});const release=()=>keys[moveCodes[b.dataset.move]]=false;b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release)});
const mini=$('minimap'),mc=mini.getContext('2d'),bounds=siteLayout.bounds;const mapW=bounds.x1-bounds.x0,mapD=bounds.z1-bounds.z0;
const mx=x=>(x-bounds.x0)/(bounds.x1-bounds.x0)*600,mz=z=>(z-bounds.z0)/(bounds.z1-bounds.z0)*300;
function rect(x,z,w,d,c){mc.fillStyle=c;mc.fillRect(mx(x-w/2),mz(z-d/2),w/mapW*600,d/mapD*300)}
function mapLoop(radius,color,width){const points=stadiumOutline(radius);mc.strokeStyle=color;mc.lineWidth=width;mc.beginPath();points.forEach((p,i)=>i?mc.lineTo(mx(p.x),mz(p.z)):mc.moveTo(mx(p.x),mz(p.z)));mc.stroke();}
function minimap(){
 mc.clearRect(0,0,600,300);mc.fillStyle='#dde3d5';mc.fillRect(0,0,600,300);rect(siteLayout.court.x,siteLayout.court.z,siteLayout.court.w,siteLayout.court.d,'#8c9a9c');rect(0,-10.5,20,29,'#f9faed');rect(-26.5,2,33,20,'#f9faed');rect(26.5,2,33,20,'#f9faed');mc.lineWidth=1;mc.strokeStyle='#738474';
 mapLoop(26,'#485c61',16);mapLoop(26,'#e2dfc5',1);
 roomData.forEach(r=>{rect(r.x,8,6.25,7.8,r.color);mc.strokeRect(mx(r.x-3.25),mz(4),6.5/mapW*600,8/mapD*300);mc.fillStyle='#455f49';mc.font='11px Arial';mc.textAlign='center';mc.fillText(r.zone,mx(r.x),mz(6.5));for(const a of [-1.4,1.4])rect(r.x+a,9,1.2,2.4,'#fff')});
 rect(0,-21.5,18,7,'#65866c');facility.triages.forEach(t=>rect(t.x,t.z,t.w,t.d,t.c));rect(siteLayout.green.x,siteLayout.green.z,siteLayout.green.w,4,'#8c9a9c');siteLayout.tents.forEach(t=>rect(t.x,t.z,5,5,'#f5f4ee'));
 mc.fillStyle='#365d45';mc.font='10px Tahoma';mc.textAlign='center';rect(51,2,16,20,'#b8a58e');mc.fillText('الحريق',mx(51),mz(0));mc.strokeStyle='#4d7157';mc.lineWidth=4;mc.beginPath();mc.ellipse(mx(0),mz(-12.2),11,8,0,0,Math.PI);mc.stroke();mc.fillText('المدخل',mx(0),mz(8));mc.fillText('المواقف',mx(27),mz(33));
 if(drillSnapshot?.active){for(const p of drillSnapshot.patients){if(p.state==='building')continue;mc.fillStyle=p.kind==='green'?'#19734c':p.kind==='yellow'?'#ffd342':p.kind==='black'?'#26383d':'#cf3b38';mc.strokeStyle='#ffffff';mc.lineWidth=.8;mc.beginPath();mc.arc(mx(p.x),mz(p.z),3,0,Math.PI*2);mc.fill();mc.stroke();}rect(-29,30,13,13,'#526a6d');mc.fillStyle='#fff';mc.font='bold 18px Arial';mc.fillText('H',mx(-29),mz(30));for(const v of drillSnapshot.vehicles)rect(v.x,v.z,2.2,3.5,'#fff');}
 if(mode==='walk'){const x=mx(camera.position.x),z=mz(camera.position.z);mc.fillStyle='#173f37';mc.beginPath();mc.arc(x,z,5,0,Math.PI*2);mc.fill();mc.strokeStyle='#f5fff0';mc.lineWidth=2;mc.stroke();mc.strokeStyle='#173f37';mc.beginPath();mc.moveTo(x,z);mc.lineTo(x-Math.sin(yaw)*14,z-Math.cos(yaw)*14);mc.stroke();}
}
mini.addEventListener('click',e=>{const r=mini.getBoundingClientRect();const x=bounds.x0+(e.clientX-r.left)/r.width*mapW,z=bounds.z0+(e.clientY-r.top)/r.height*mapD;go({x,z,id:null});});
function openDialog(id){keys={};drag=null;panelsOpen=true;$(id).showModal();}
$('people-btn').onclick=()=>openDialog('population');$('blueprint-btn').onclick=()=>openDialog('blueprint');$('help-btn').onclick=()=>openDialog('help');
document.querySelectorAll('dialog').forEach(d=>{d.querySelector('.close').onclick=()=>d.close();d.addEventListener('close',()=>panelsOpen=false);d.addEventListener('click',e=>{if(e.target===d)d.close()})});
const population=facility.population;
$('people-total').textContent=population.total;
$('population-totals').innerHTML=[[population.total,'الإجمالي'],[population.primaryPatients,'حالات أساسية'],[population.participants,'مشاركون']].map(([n,label])=>'<div><strong>'+n+'</strong><span>'+label+'</span></div>').join('');
const areaNames={clinical:'غرف التدريب',reception:'استقبال الطوارئ',outdoor:'البسطات',triage:'المنطقة السوداء — وفيات'};
$('population-areas').innerHTML=Object.keys(areaNames).map(area=>{const all=population.actors.filter(a=>a.area===area),patients=all.filter(a=>a.role==='patient'||a.role==='deceased').length;return '<tr><th>'+areaNames[area]+'</th><td>'+patients+'</td><td>'+(all.length-patients)+'</td><td><b>'+all.length+'</b></td></tr>'}).join('')+'<tr class="total-row"><th>الإجمالي</th><td>'+population.primaryPatients+'</td><td>'+population.participants+'</td><td>'+population.total+'</td></tr>';
const roles={doctor:'أطباء الغرف',student:'طلاب الغرف',extra:'مرضى extras في الاستقبال',vitals:'قياس العلامات الحيوية',intake:'استقبال الحالات'};
$('population-roles').innerHTML=Object.entries(roles).map(([r,name])=>'<div><span>'+name+'</span><b>'+population.roles[r]+'</b></div>').join('');
siteLayout.tents.slice().sort((a,b)=>a.id-b.id).forEach(t=>{const b=document.createElement('button');b.innerHTML='<b>بسطة '+t.id+'</b><span>'+t.patients+' '+(t.patients===1?'حالة':'حالات')+' · 4 طلاب طب</span><small>'+ (t.patients+4)+' أشخاص ↗</small>';b.onclick=()=>{$('population').close();go({id:'green',name:'بسطة '+t.id,x:t.x,z:t.z+(t.yaw===0?4.2:-4.2),yaw:t.yaw===0?0:Math.PI})};$('station-cards').appendChild(b)});
document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{$('blue-image').src='assets/'+b.dataset.image;document.querySelectorAll('[data-image]').forEach(t=>t.classList.toggle('active',t===b));});
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,3000)}
// The same simulation clock drives every moving actor, vehicle and fire effect.
const views={loop:{eye:[140,155,188],target:[22,0,73]},responders:{eye:[60,49,46],target:[26,.8,9]},black:{eye:[83,15,2],target:[69,.4,-8.5]},heat:{eye:[41,6,22],target:[23,.6,22]},helipad:{eye:[-9,18,47],target:[-28,2,30]},intake:{eye:[12,11,8],target:[0,1,0]},recovery:{eye:[82,16,31],target:[69,.6,20]},collapse:{eye:[77,12,8],target:[63,.7,-1.8]},yellow:{eye:[92,12,31],target:[79,.5,22]},triage:{eye:[96,28,30],target:[67,.6,6]},court:{eye:[101,45,63],target:[58,0,20]},green:{eye:[40,5,22],target:[23,1.1,22]},loading:{eye:[95,13,42],target:[79,.7,32]},drive:{eye:[72,48,69],target:[33,.5,29]},hospital:{eye:[42,37,46],target:[0,0,10]},beds:{eye:[0,38,36],target:[0,0,8]}};
function drillView(name){const v=views[name];if(!v)return;if(mode!=='overview')overview();facility.roofs.visible=false;$('roof-toggle').checked=false;renderer.shadowMap.needsUpdate=true;const target=new THREE.Vector3(...v.target),eye=new THREE.Vector3(...v.eye);if(mobileScreen)eye.sub(target).multiplyScalar(1.2).add(target);cameraGoal={eye,target,fromEye:camera.position.clone(),fromTarget:orbit.target.clone(),started:performance.now()};document.querySelectorAll('[data-drill-view]').forEach(b=>b.classList.toggle('selected',b.dataset.drillView===name));}
function clockLabel(t){const n=Math.floor(t);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
$('fleet-cards').innerHTML=Array.from({length:8},(_,i)=>'<div id="fleet-'+(i+1)+'"><span>إسعاف '+(i+1)+'</span><b dir="ltr">0 / 2</b><small>جاهز</small></div>').join('');
function updateDrill(s){
 drillSnapshot=s;$('drill-stage').textContent=s.stage;$('drill-red').parentElement.querySelector('span').textContent='حالة حرجة · أولوية';$('drill-black').parentElement.querySelector('span').textContent='نُقلت للأسود '+s.blackDelivered+'/2';$('sim-operations').textContent='5 إخلاء · 4 فرز · 8 إسعافات';$('sim-secondary').textContent=s.heat.affected?'إجهاد حراري: '+s.heat.affected+' حالات ثانوية · '+(s.heat.resolved?'استقرت':s.heat.assisted?'تتلقى المساعدة':'بدء الاستجابة'):'حدث ثانوي: إجهاد حراري للفرق لاحقاً';$('drill-controls').hidden=$('drill-hud').hidden=!s.active;
 $('drill-play').textContent=s.playing?'Ⅱ إيقاف مؤقت':s.time>=s.duration?'↺ تشغيل من البداية':s.time>0?'▶ استئناف':'▶ تشغيل';
 $('drill-time').textContent=clockLabel(s.time)+' / '+clockLabel(s.duration);$('drill-progress').max=s.duration;$('drill-progress').value=s.time;$('drill-progress').setAttribute('aria-valuetext',clockLabel(s.time));
 $('drill-follow').checked=s.follow;$('drill-speed').value=s.speed;$('drill-hud').classList.toggle('is-playing',s.playing);
 for(const [id,n,total] of [['classified',s.classified,30],['green',s.green,12],['yellow',s.yellow,0],['red',s.red,1],['black',s.black,2]])$('drill-'+id).innerHTML=n+(total?'<small>/'+total+'</small>':'');
 dashboard?.update(s);updateTimeline(s);
 $('fleet-complete').textContent=s.vehicles.reduce((n,v)=>n+v.completedTrips,0)+' / 16';for(const v of s.vehicles){const card=$('fleet-'+v.id);card.classList.toggle('on-loop',v.onLoop);card.querySelector('b').textContent=v.completedTrips+' / 2';card.querySelector('small').textContent=v.patient?v.patient+' · رحلة '+v.tripNumber:v.completedTrips===2?'اكتمل النقل':v.tripNumber?'عودة / انتظار الدور':'في طابور الجهة المقابلة';}
 for(const [bed,id] of [['b4','R01'],['c2','Y01']]){const p=s.patients.find(p=>p.id===id),arrived=p?.state==='bed';$('bed-'+bed).innerHTML=bed.toUpperCase()+' <i>'+(['referral-transfer','helipad-transfer','airborne'].includes(p?.state)?'أحيلت الحالة '+id:arrived?'وصلت '+id:['loading-walk','loading','aboard','unloading','reception','hospital-walk','bed-transfer'].includes(p?.state)?id+' في الطريق':'بانتظار '+id)+'</i>';$('bed-'+bed).classList.toggle('arrived',arrived);}
}
function switchSimulation(open){document.body.classList.toggle('simulation-view',open);$('simulation-panel').hidden=!open;$('panel').hidden=open;$('simulation-tab')?.classList.toggle('selected',open);cameraGoal=null;resize();}
function updateTimeline(snapshot){if(!drill)return;const items=[...$('event-list').children];for(const item of items){const t=Number(item.dataset.time);item.classList.toggle('passed',snapshot.time>=t);item.classList.toggle('current',snapshot.time>=t&&snapshot.time<t+4);}}
function focusEvent(event){stopFollow();drill.pause();drill.seek(event.time);if(event.view==='bed'){const tr=drill.transfers.find(tr=>tr.bedId===event.bedId);overview();drill.setFollow(false);cameraGoal={eye:new THREE.Vector3(tr.roomX+5,8,1),target:new THREE.Vector3(tr.bed.x,1,9),fromEye:camera.position.clone(),fromTarget:orbit.target.clone(),started:performance.now()};}else drillView(event.view);}
dashboard=createDashboard({scene,facility,open:openDialog});
drill=createDrill({scene,facility,renderer,onChange:updateDrill,onFocus:drillView,onActivate:active=>{document.body.classList.toggle('drill-active',active);if(!active)switchSimulation(false);cameraGoal=null;if(active){overview();$('location').textContent='محاكاة حريق الجامعة · 30 حالة';}else overview();resize();}});
$('panel').querySelector('.segmented').after($('drill-start'));
if(mobileScreen)document.body.append($('people-btn'));
$('drill-start').onclick=()=>{switchSimulation(true);drill.setFollow(true);drill.play();};
$('drill-play').onclick=()=>drill.playing?drill.pause():drill.play();$('drill-reset').onclick=()=>drill.reset();$('drill-exit').onclick=()=>drill.exit();
$('drill-progress').oninput=e=>drill.seek(e.target.value);$('drill-speed').onchange=e=>drill.setSpeed(e.target.value);$('drill-follow').onchange=e=>{if(e.target.checked&&mode!=='overview')overview();cameraGoal=null;drill.setFollow(e.target.checked)};
document.querySelectorAll('[data-drill-view]').forEach(b=>b.onclick=()=>{stopFollow();drillView(b.dataset.drillView)});
document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',stopFollow));mini.addEventListener('click',stopFollow);
const note=$('blueprint').querySelector('.dialog-note');note.textContent=note.textContent.replace('وإزالة جميع المركبات','وتظهر ثماني سيارات إسعاف ومروحية أثناء المحاكاة');
const simTab=document.createElement('button');simTab.id='simulation-tab';simTab.textContent='المحاكاة';$('blueprint-btn').before(simTab);simTab.onclick=()=>{switchSimulation(true);if(!drill.active)drill.reset();};
$('simulation-summary').append($('drill-hud'));$('simulation-playback').append($('drill-controls'));$('drill-hud').querySelector('.bed-status').hidden=true;
$('sim-back').onclick=()=>{stopFollow();switchSimulation(false);};$('simulation-end').onclick=()=>drill.exit();$('board-open').onclick=()=>dashboard.open();
for(const p of drill.patients.filter(p=>p.kind!=='green')){const o=document.createElement('option');o.value=p.id;o.textContent=p.id+' → '+(p.kind==='black'?'المنطقة السوداء':drill.transfers.find(tr=>tr.patient===p).bedId+(p.kind==='red'?' · أولوية':''));$('event-patient').append(o);}
const heatOption=document.createElement('option');heatOption.value='heat';heatOption.textContent='الإجهاد الحراري';$('event-patient').append(heatOption);
function buildTimeline(){const chosen=$('event-patient').value;$('event-list').replaceChildren();for(const e of drill.events.filter(e=>chosen==='all'||e.patient===chosen||chosen==='heat'&&e.view==='heat')){const button=document.createElement('button');button.dataset.time=e.time;button.innerHTML='<time dir="ltr">'+clockLabel(e.time)+'</time><span>'+e.label+'</span><i>↗</i>';button.onclick=()=>focusEvent(e);$('event-list').append(button);}updateTimeline(drill.getSnapshot());}
$('event-patient').onchange=buildTimeline;buildTimeline();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let screenDown=null;renderer.domElement.addEventListener('pointerdown',e=>screenDown={x:e.clientX,y:e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(!screenDown||Math.hypot(e.clientX-screenDown.x,e.clientY-screenDown.y)>6)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);if(ray.intersectObject(dashboard.screen).length)dashboard.open();screenDown=null;});
$('help').querySelector('.help-content').insertAdjacentHTML('afterbegin','<p><b>فرضية الحريق والتدافع</b><br>جناح الحريق متصل بمبنى الغرف وبابه يواجه ساحة الفرز، والكلية تمثل المستشفى الرئيسي. 30 حالة: أحمر واحد، 15 أصفر، 12 أخضر، ووَفاتان بالأسود. يبدأ بعض منظمي الإخلاء الخمسة من الداخل حاملين R01 وY01 على نقالات يدوية، ويساعد الخامس Y02 على المشي. يخرج أطباء الفرز الأربعة من داخل الكلية عبر بابها الرئيسي والمنحدر، ويمشون حاملين حقائب الإسعاف إلى موقع الفرز. ينطلق منظمو الأخضر من الخيام بالركض ويلتقون بالحالات بعد الفرز ويرافقونها إلى 8 فرق راجلة، في كل منها 4 طلاب طب. ينتظر المصابون على الأرض جلوساً أو استلقاءً مع الأطباء، وتأتي النقالات ذات العجلات من 8 إسعافات. تُنقل R01 أولاً إلى B4 ثم Y01 إلى C2، ويكمل الأصفر بقية الأسرّة الـ16، مع تسليم الحالات عند استقبال الطوارئ. يظهر الإجهاد الحراري لبعض الفرق بالتزامن مع آخر وصول. بعد استلام الحالات كلها، تُحال R01 بمركبة إسعاف إلى المروحية. كل إسعاف ينقل حالتين في رحلتين منفصلتين، وحالة واحدة في كل رحلة. تنتظر الإسعافات في الجهة المقابلة على الضلع البعيد من الدائرة، وتتقدم بالترتيب إلى موقف تحميل واحد عند الأصفر. تسير بالحالة إلى موقف بمحاذاة مدخل المستشفى، وتصل وتغادر للأمام. تواصل اللفة الخارجية إلى طابور الجهة المقابلة، وتستكمل المنعطف الأيمن إلى الأصفر في دورها التالي. الساحة متصلة بالطريق دون فاصل. يمكنك فتح «رحلات الإسعاف» لمتابعة كل مركبة، أو اختيار كاميرا «الدوار». يمكن إيقاف كل مشهد واستئنافه والرجوع إليه من الخط الزمني. أعداد الإصابات الثانوية والتوقيت والمهبط افتراضية للعرض وليست خطة تشغيل ميدانية.</p>');
updateDrill(drill.getSnapshot());
$('share-btn').onclick=async()=>{const url=location.origin+location.pathname;try{if(navigator.share&&matchMedia('(pointer:coarse)').matches)await navigator.share({title:'UQUDCM — جولة 3D',url});else{await navigator.clipboard.writeText(url);toast('تم نسخ الرابط — شاركيه مع زملائك')}}catch(e){if(e.name!=='AbortError')toast('الرابط: '+url)}};
function step(dt){let forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);const length=Math.hypot(forward,side)||1;forward/=length;side/=length;const speed=(keys.ShiftLeft||keys.ShiftRight?5.5:3)*dt;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed;const n=Math.max(1,Math.ceil(speed/.12));for(let i=0;i<n;i++){if(!isBlocked(camera.position.x+dx/n,camera.position.z))camera.position.x+=dx/n;if(!isBlocked(camera.position.x,camera.position.z+dz/n))camera.position.z+=dz/n;}camera.position.y=1.68+facility.groundHeight(camera.position.x,camera.position.z);camera.rotation.set(pitch,yaw,0);}
function frame(wallMs){const elapsed=lastTime?Math.min((wallMs-lastTime)/1000,.25):0,dt=Math.min(elapsed,.05);lastTime=wallMs;drill.tick(elapsed);const ms=drill.active?drill.clock*1000:wallMs;if(mode==='walk'&&!panelsOpen){step(dt);updateLocation()}else if(mode==='overview'){if(cameraGoal){const u=THREE.MathUtils.clamp((wallMs-cameraGoal.started)/1400,0,1),a=u*u*(3-2*u);camera.position.lerpVectors(cameraGoal.fromEye,cameraGoal.eye,a);orbit.target.lerpVectors(cameraGoal.fromTarget,cameraGoal.target,a);if(u===1)cameraGoal=null;}orbit.update();}
 facility.smoke.children.forEach(o=>{if(o.userData.fire){o.children.forEach((flame,i)=>{flame.scale.set(.9+Math.sin(ms*.01+i)*.11,2+Math.sin(ms*.007+i)*.24,1);flame.material.opacity=.68+Math.sin(ms*.009+i)*.18});return;}const t=((ms*.000052+o.userData.seed)%1);o.position.set(59.4+t*4.5+o.userData.drift*t*.7,1+t*10.5,2+t*1.2+o.userData.drift*t);o.scale.set(1.5+t*7,1.8+t*6.5,1);o.material.opacity=Math.sin(Math.PI*t)*.7;});
 facility.fireLight.intensity=4.2+Math.sin(ms*.017)*.65;minimap();renderer.render(scene,camera);requestAnimationFrame(frame)
}
$('quality').onchange=e=>{const high=e.target.value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?(mobileScreen?1.5:2):1));sun.shadow.mapSize.set(high?(mobileScreen?2048:4096):1024,high?(mobileScreen?2048:4096):1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;resize();};
overview();requestAnimationFrame(frame);
window.facilityDebug={stats:facility.stats,population:facility.population,crowd:facility.crowd,world:facility.world,triages:facility.triages,exit:facility.exit,roomData,siteLayout,scene,orbit,camera,colliders:facility.colliders,isBlocked,go,overview,get mode(){return mode},renderer,drill,drillView,dashboard,groundHeight:facility.groundHeight,switchSimulation,focusEvent,patientVisuals:facility.patientVisuals};
setTimeout(()=>{$('loading').style.opacity=0;setTimeout(()=>$('loading').remove(),600)},350);

