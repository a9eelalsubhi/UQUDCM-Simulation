import * as THREE from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {humanTorso,cloth as clothMat,skin as skinMat,hair as hairMat,carPaint} from './lab-visuals.js?v=20261029e';
import {ambulanceJourney,ambulanceReturn,ambulanceDispatch,ambulanceStaging,smoothRoad} from './traffic.js';

const COLORS={green:'#338965',yellow:'#d5ae38',red:'#b64340',black:'#303c40',doctor:'#ecf1ed',guide:'#e8903a'};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const point=(x,z)=>({x,z});
function makePath(values){
 const points=values.map(p=>Array.isArray(p)?point(...p):{x:p.x,z:p.z}),lengths=[0];
 for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
 return {points,lengths,length:lengths.at(-1)};
}
function sample(path,progress){
 const distance=clamp(progress)*path.length;let i=1;while(i<path.lengths.length-1&&path.lengths[i]<distance)i++;
 const a=path.points[i-1],b=path.points[i],t=clamp((distance-path.lengths[i-1])/(path.lengths[i]-path.lengths[i-1]||1));
 return {x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),yaw:Math.atan2(b.x-a.x,b.z-a.z)};
}
function placed(p,yaw=0){return {x:p.x,z:p.z,yaw};}

export function createDrill({scene,facility,renderer,onChange=()=>{},onFocus=()=>{},onActivate=()=>{}}){
 const roots=new THREE.Group(),visuals=new THREE.Group(),pins=new THREE.Group();scene.add(visuals,pins);visuals.visible=pins.visible=false;
 const geometry=new Map(),materials=new Map(),parts=[],labels=[],batches=[];let contactMaterial;
 const zero=new THREE.Matrix4().makeScale(0,0,0),vector=new THREE.Vector3(),matrix=new THREE.Matrix4();
 let active=false,playing=false,time=0,speed=1,follow=true,lastNotice=-1,lastFocus='';
 const meshMaterial=(color,metal=0)=>{
  const key=color+metal;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metal ? .32 : .72,metalness:metal}));return materials.get(key);
 };
 function part(parent,type,args,color,x=0,y=0,z=0){
  const key=type+JSON.stringify(args);if(!geometry.has(key)){
   const g=type==='human'?humanTorso():type==='rounded'?new RoundedBoxGeometry(args[0],args[1],args[2],3,args[3]):type==='box'?new THREE.BoxGeometry(...args):type==='sphere'?new THREE.SphereGeometry(1,16,12):type==='cylinder'?new THREE.CylinderGeometry(...args,14):type==='capsule'?new THREE.CapsuleGeometry(...args,4,12):new THREE.PlaneGeometry(...args);
   geometry.set(key,g);
  }
  const o=new THREE.Mesh(geometry.get(key),typeof color==='string'?meshMaterial(color):color);o.position.set(x,y,z);parent.add(o);parts.push(o);return o;
 }
 const box=(p,x,y,z,w,h,d,c)=>part(p,'box',[w,h,d],c,x,y,z);
 const ell=(p,x,y,z,rx,ry,rz,c)=>{const o=part(p,'sphere',[],c,x,y,z);o.scale.set(rx,ry,rz);return o;};
 function tag(host,text,color,width=2.4,offset=2){
  const c=document.createElement('canvas');c.width=768;c.height=160;const q=c.getContext('2d');q.fillStyle=color;q.beginPath();q.roundRect(3,3,762,154,24);q.fill();q.fillStyle='#fff';q.textAlign='center';q.textBaseline='middle';q.font='bold 55px Arial, Tahoma';q.fillText(text,384,82,720);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(width,width*160/768,1);pins.add(sprite);labels.push({host,sprite,offset});return sprite;
 }
 function shadow(root,w=.8,d=.7){
  if(!contactMaterial){
  const c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d'),gr=q.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(15,28,24,.25)');gr.addColorStop(1,'rgba(15,28,24,0)');q.fillStyle=gr;q.fillRect(0,0,64,64);
  contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});}
  const o=part(root,'plane',[w,d],contactMaterial,0,.09,0);o.rotation.x=-Math.PI/2;
 }
 function avatar({role='patient',kind='green',index=0,lying=false,covered=false}={}){
  const root=new THREE.Group(),figure=new THREE.Group();root.userData.role=role;root.userData.kind=kind;root.add(figure);roots.add(root);root.visible=false;
  const skin=skinMat((kind==='red'||kind==='black')&&role==='patient'?'#a89f91':['#c08f6c','#a8795c','#cfa685','#8f6248','#b88566'][index%5]),uniform=clothMat(role==='doctor'?COLORS.doctor:role==='guide'?COLORS.guide:role==='nurse'?'#326e80':(kind==='red'||kind==='black')?'#555752':['#a7bac2','#b5b5a5','#8caaa8','#c3aa91','#e8e2d4','#7f8f9a'][index%6]),dark=clothMat(['#253b44','#2c2f33','#3a3d40'][index%3]),hair=hairMat('#1d1b19');
  const arms=[],legs=[],knees=[];
  box(figure,0,.91,0,.4,.23,.27,uniform);const torso=part(figure,'human',[],uniform,0,1.19,0);
  ell(figure,0,1.68,0,.132,.18,.116,skin);part(figure,'cylinder',[.065,.065,.15],skin,0,1.49,0);
  const female=index%3!==0;
  // Hijab framing the face for women; a short beard on some men.
  if(female){const scarf=clothMat(['#1f2326','#2d3a4a','#e9e4da','#4b3f3a','#20313a','#5b6b73'][index%6],{repeat:4,sheen:.55});ell(figure,0,1.70,-.05,.151,.198,.15,scarf);ell(figure,0,1.47,-.01,.19,.12,.15,scarf);}else{if(index%2)ell(figure,0,1.585,.04,.104,.06,.075,hair);
   const g=new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.47),key='haircap';if(!geometry.has(key))geometry.set(key,g);else g.dispose();const h=new THREE.Mesh(geometry.get(key),hair);h.position.set(0,1.682,-.003);h.scale.set(.142,.188,.125);figure.add(h);parts.push(h);
  }
  for(const s of [-1,1]){ell(figure,s*.044,1.70,.12,.012,.009,.009,'#222e2c');ell(figure,s*.136,1.67,0,.02,.033,.022,skin);}
  ell(figure,0,1.655,.128,.017,.026,.017,skin);box(figure,0,1.614,.114,.045,.005,.006,'#875e52');
  for(const s of [-1,1]){
   const arm=new THREE.Group();arm.position.set(s*.215,1.38,0);figure.add(arm);arms.push(arm);
   part(arm,'capsule',[.069,.16],uniform,s*.018,-.12,0);part(arm,'capsule',[.055,.13],uniform,s*.038,-.35,.018);ell(arm,s*.05,-.48,.045,.043,.06,.027,skin);for(let j=0;j<4;j++)part(arm,'capsule',[.008,.035],skin,s*.05+(j-1.5)*.014,-.548,.049);
   const band=part(arm,'cylinder',[.078,.078,.075],role==='patient'?COLORS[kind]:'#4d9184',s*.025,-.2,.005);band.rotation.z=s*.1;
   const hip=new THREE.Group();hip.position.set(s*.116,.84,0);figure.add(hip);legs.push(hip);
   part(hip,'capsule',[.08,.23],dark,0,-.2,0);const knee=new THREE.Group();knee.position.y=-.4;hip.add(knee);knees.push(knee);part(knee,'capsule',[.064,.22],dark,0,-.18,0);ell(knee,0,-.37,.08,.094,.06,.17,'#23302e');
  }
  if(role==='doctor'||role==='nurse'){
   box(figure,0,.97,0,.47,.36,.3,uniform);box(figure,-.115,1.32,.16,.09,.1,.012,'#f8faf6');box(figure,-.115,1.35,.17,.07,.02,.012,'#368c9b');box(figure,0,1.36,.16,.055,.22,.012,'#3e6867');
   const loop=part(figure,'capsule',[.065,.07],'#334a4c',.03,1.28,.17);loop.scale.z=.12;ell(figure,.1,1.18,.19,.024,.024,.01,'#aebec0');
  }else if(role==='guide'){
   for(const s of [-1,1])box(figure,s*.13,1.22,.155,.035,.37,.018,'#f0efcf');box(figure,0,1.08,.158,.41,.05,.016,'#f0efcf');
  }
  if(role==='patient'&&!covered){
   const red='#963c3d',woundScale=kind==='yellow'?1:.45;
   if(index%4===0){box(figure,0,1.77,.105,.25,.07,.035,'#eef0e5');ell(figure,-.065,1.765,.128,.035*woundScale,.019,.012,red);}
   else if(index%4===1){box(figure,.235,1.15,.08,.16,.18,.15,'#e5e8dc');ell(figure,.26,1.19,.16,.037*woundScale,.047*woundScale,.011,red);box(figure,.12,1.13,.18,.28,.04,.025,'#f0eee2').rotation.z=-.42;}
   else if(index%4===2){part(knees[0],'cylinder',[.078,.078,.17],'#ebeee4',0,-.15,0);ell(figure,-.13,1.18,.151,.05*woundScale,.04*woundScale,.014,red);}
   else {ell(figure,.08,1.59,.105,.045,.035,.015,'#7c7469');box(figure,0,1.64,.135,.15,.065,.035,'#cbdadb');}
   if(kind==='red'||kind==='black'){for(const [x,y,z,rx,ry] of [[-.10,1.69,.126,.06,.08],[.10,1.16,.16,.12,.13],[-.16,1.37,.16,.07,.10],[.25,1.18,.09,.065,.12]]){ell(figure,x,y,z,rx,ry,.012,'#674840');ell(figure,x+.02,y+.03,z+.01,rx*.55,ry*.55,.008,'#463e39');}}
   if(kind==='yellow')for(let j=0;j<3;j++)ell(figure,-.11+j*.065,1.15-j*.07,.151,.032,.038,.009,red);
   // Everyone has evacuated the fire: soot on clothing and face, varied bandages.
   ell(figure,.09,1.70,.126,.035,.025,.007,'#6a6760');ell(figure,-.12,1.31,.153,.049,.06,.007,'#6a6b64');ell(figure,.13,1.05,.151,.037,.04,.009,'#777b71');
  }
  const trolley=new THREE.Group();root.add(trolley);trolley.visible=lying||covered;
  box(trolley,0,.72,0,.92,.13,2.08,'#bcc9cd');box(trolley,0,.82,0,.91,.16,2.05,'#dce3df');box(trolley,0,.95,-.72,.6,.1,.35,'#f4f3e8');
  for(const s of [-1,1]){box(trolley,s*.48,.94,0,.035,.035,1.7,'#8fa4aa');for(const z of [-.78,.78]){box(trolley,s*.36,.42,z,.04,.55,.04,'#aebfc3');const wheel=part(trolley,'cylinder',[.12,.12,.07],'#283b40',s*.36,.15,z);wheel.rotation.z=Math.PI/2;}}
  const shroud=new THREE.Group();root.add(shroud);shroud.visible=covered;
  const cloth=part(shroud,'capsule',[.25,1.22],'#e4e7df',0,.98,0);cloth.rotation.x=Math.PI/2;cloth.scale.z=.7;box(shroud,0,1.16,0,.014,.009,1.5,'#737e75');box(shroud,.2,1.12,.7,.18,.015,.25,'#303b36');
  shadow(root,lying?1.5:.85,lying?2.4:.85);
  figure.children.filter(o=>o.isMesh&&o.position.y>=1.48).forEach(o=>{o.position.x*=.82;o.position.z*=.82;o.position.y=1.65+(o.position.y-1.65)*.82;o.scale.multiplyScalar(.82);});
  const pose=(clock,moving=false,type=lying?'lying':'stand')=>{
   const seated=type==='seated',isCovered=type==='covered-ground';figure.visible=!isCovered;shroud.visible=isCovered;shroud.position.y=isCovered?-.74:0;figure.rotation.set(type==='lying'?-Math.PI/2:0,0,0);figure.position.set(0,type==='lying'?.98:seated?-.27:0,type==='lying'?.82:0);figure.scale.setScalar(role==='patient'?.94:1);
   for(let i=0;i<2;i++){const phase=clock*7.5+i*Math.PI;legs[i].rotation.x=seated?-Math.PI/2:moving?Math.sin(phase)*(kind==='yellow'?.21:.43):0;knees[i].rotation.x=seated?Math.PI/2:moving?Math.max(0,-Math.sin(phase))*.4:0;arms[i].rotation.x=moving?-Math.sin(phase)*.36:0;arms[i].rotation.z=0;}
   if(type==='lying'){legs.forEach(o=>o.rotation.x=0);knees.forEach(o=>o.rotation.x=0);arms.forEach(o=>o.rotation.x=0);}
   if((kind==='yellow'||kind==='red')&&moving&&type==='stand')figure.rotation.z=Math.sin(clock*7.5)*.045;
   if(type==='ground'){figure.rotation.x=Math.PI/2;figure.position.set(0,.20,-.8);arms[0].rotation.z=.5;arms[1].rotation.z=-.3;}
   if(type==='floor-seated'){figure.position.set(0,-.66,0);legs.forEach(l=>l.rotation.x=-Math.PI/2);knees.forEach(k=>k.rotation.x=.06);arms.forEach(a=>a.rotation.x=.12);}
   if(type==='kneeling'){figure.position.set(0,-.53,0);legs.forEach(l=>l.rotation.x=-1.1);knees.forEach(k=>k.rotation.x=2.5);arms.forEach(a=>a.rotation.x=-.5);}
   if(type==='ground-supine'){figure.rotation.x=-Math.PI/2;figure.position.set(0,.18,.82);legs.forEach(l=>l.rotation.x=0);knees.forEach(k=>k.rotation.x=0);arms[0].rotation.z=.27;arms[1].rotation.z=-.27;}
   return {root,figure,trolley,arms,legs,knees};
  };
  return {root,figure,trolley,shroud,arms,pose,covered};
 }
 function firstAidBag(model){
  const root=new THREE.Group();model.arms[1].add(root);root.position.set(.05,-.7,.04);
  box(root,0,0,0,.42,.29,.23,'#b9443f');box(root,0,.18,0,.18,.045,.035,'#33464a');
  for(const z of [-.122,.122]){box(root,0,0,z,.18,.045,.012,'#f3f5ed');box(root,0,0,z,.045,.18,.012,'#f3f5ed');}return root;
 }
 function rescueLitter(person){const root=new THREE.Group();person.root.add(root);root.visible=false;box(root,0,0,0,.82,.05,1.98,'#cf9655');for(const side of [-1,1])box(root,side*.45,.025,0,.035,.04,2.55,'#abbec2');for(const z of [-.5,.45])box(root,0,.045,z,.85,.018,.07,'#436166');return root;}
 function runPose(model,t,moving){model.pose(moving?t*1.75:t,moving);if(moving){model.figure.rotation.x=.14;model.figure.position.y=.035*Math.abs(Math.sin(t*11));}}
 function beacon(color){const key='beacon'+color;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.2,roughness:.3}));return materials.get(key);}
 function ambulance(index){
  const root=new THREE.Group();roots.add(root);root.visible=false;const white=carPaint('#eff1e9'),dark='#294c59',red=carPaint('#ba4541'),glass=new THREE.MeshPhysicalMaterial({color:'#637f89',transparent:true,opacity:.5,roughness:.13,metalness:.05,clearcoat:.8,clearcoatRoughness:.12});
  function vehicleBox(parent,x,y,z,w,h,d,color){return Math.min(w,h,d)>.1?part(parent,'rounded',[w,h,d,Math.min(.08,Math.min(w,h,d)/4)],color,x,y,z):box(parent,x,y,z,w,h,d,color);}
  vehicleBox(root,0,.47,0,2.25,.2,5.9,'#405256');vehicleBox(root,0,1.04,-.6,2.26,.93,4.5,white);vehicleBox(root,0,1.2,2.1,2.23,1.3,1.52,white);
  for(const s of [-1,1]){vehicleBox(root,s*1.11,1.84,-.5,.1,.58,4.4,white);vehicleBox(root,s*1.16,1.78,-.35,.025,.52,2.6,glass);vehicleBox(root,s*1.125,1.9,1.95,.025,.62,1.23,glass);vehicleBox(root,s*1.14,1.01,-.7,.035,.3,4.45,red);vehicleBox(root,s*1.14,1.52,-.5,.04,.12,.6,red);vehicleBox(root,s*1.145,1.52,-.5,.04,.57,.13,red);}
  vehicleBox(root,0,1.91,2.9,2.11,.63,.035,glass);vehicleBox(root,0,2.32,1.95,2.26,.13,1.75,white);
  // Open roof makes the patient and accompanying doctors visible in the simulation.
  for(const s of [-1,1])vehicleBox(root,s*1.08,2.3,-.75,.1,.13,4.2,white);
  for(const z of [-2.83,1.32])vehicleBox(root,0,2.3,z,2.15,.13,.12,white);
  vehicleBox(root,0,.76,-2.94,2.25,.22,.1,'#798b8f');vehicleBox(root,0,.8,3.0,2.25,.24,.16,'#75858a');
  for(const s of [-1,1]){vehicleBox(root,s*.78,1.2,2.94,.42,.25,.04,'#fff1c6');vehicleBox(root,s*.85,1.25,-2.96,.18,.5,.05,red);}
  const blue=[];for(const s of [-1,1])blue.push(vehicleBox(root,s*.6,2.47,1.9,.65,.2,.28,beacon(s<0?'#287ff2':'#df4249')));
  const wheels=[];for(const s of [-1,1])for(const z of [-1.95,1.9]){const g=new THREE.Group();g.position.set(s*1.15,.47,z);root.add(g);const tyre=part(g,'cylinder',[.43,.43,.18],'#243135');tyre.rotation.z=Math.PI/2;const hub=part(g,'cylinder',[.22,.22,.19],'#b2c0c0');hub.rotation.z=Math.PI/2;wheels.push(g);}
  for(const s of [-1,1])vehicleBox(root,s*.73,.78,-.85,.42,.12,.55,'#5f8a8d');shadow(root,3,6.6);
  tag(root,'AMBULANCE 0'+(index+1),'#365c63',3.3,2.9);
  for(let j=0;j<5;j++)box(root,0,1.05+j*.06,3.055,1.18,.022,.035,'#2a3234');
  function decal(text,w,h,x,y,z,yaw,bg=null){const c=document.createElement('canvas');c.width=768;c.height=128;const q=c.getContext('2d');if(bg){q.fillStyle=bg;q.fillRect(0,0,768,128);}q.fillStyle='#873b36';q.textAlign='center';q.textBaseline='middle';q.font='bold 48px Arial,Tahoma';q.fillText(text,384,67,730);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false});const o=part(root,'plane',[w,h],m,x,y,z);o.rotation.y=yaw;}
  for(const side of [-1,1])decal('UQUDCM  |  الإسعاف',2.3,.32,side*1.185,1.2,-.7,side*Math.PI/2);
  decal('UQU  '+String(index+1).padStart(2,'0'),.62,.15,0,.71,3.085,0,'#f0eee4');
  return {root,wheels,blue};
 }

 facility.world.updateMatrixWorld(true);
 const beds={};for(const [id,item] of Object.entries(facility.bedsByCase)){item.group.getWorldPosition(vector);beds[id]=point(vector.x,vector.z);}
 // The exercise brief assigns four field assessors and five evacuation organizers.
 const station=new THREE.Group();roots.add(station);for(const x of [-2.5,2.5]){box(station,x,1.14,1.5,1.1,.08,.55,'#d9e0d6');for(const dx of [-.45,.45])box(station,x+dx,.74,1.5,.035,.78,.035,'#a9bab7');box(station,x,1.22,1.5,.32,.035,.24,'#315b61');}
 const doctors=Array.from({length:4},(_,i)=>{
  const model=avatar({role:'doctor',index:i+4}),examX=63+i*2.8,x=examX-.9,z=10.1;
  const lane=-.6+i*.4,walkPath=makePath([[lane,-1.8-i*1.1],[lane,4.8],[lane,14],[11,14],[11,12.8],[41,12.8],[42.5,16],[61,16],[x,14.6],[x,z]]),walkStart=.6+i*.7,walkSpeed=1.8,arrival=walkStart+walkPath.length/walkSpeed;
  model.root.userData.triageDoctor=true;tag(model.root,'فرز '+(i+1),'#326c73',1.9,2.3);
  return {id:i+1,model,bag:firstAidBag(model),x,z,yaw:Math.atan2(.9,8.65-z),exam:point(examX,8.65),walkPath,walkStart,walkSpeed,arrival};
 });
 const staging=Array.from({length:8},(_,i)=>ambulanceStaging(i));
 const vehicles=staging.map((_,i)=>ambulance(i)),medics=Array.from({length:16},(_,i)=>avatar({role:'doctor',index:i}));
 const evacuationTeam=Array.from({length:5},(_,i)=>{const model=avatar({role:'guide',index:i+20});tag(model.root,'إخلاء '+(i+1),COLORS.guide,1.7,2.15);return model;});
 const yellowFurniture=new THREE.Group();roots.add(yellowFurniture);
 const yellowStaff=Array.from({length:8},(_,i)=>{const row=Math.floor(i/2),side=i%2===0?-1:1,model=avatar({role:'doctor',kind:'yellow',index:i+2});model.root.userData.yellowStaff=true;return {model,x:side<0?74.85:83.15,z:26.55-row*2.5,yaw:Math.atan2(side<0?1.15:-1.15,-.85)};});

 // Waiting casualties rest on the ground; wheeled stretchers are brought from ambulances.
 function emptyStretcher(){const root=new THREE.Group();roots.add(root);box(root,0,.72,0,.92,.13,2.08,'#bcc9cd');box(root,0,.82,0,.91,.16,2.05,'#dce3df');box(root,0,.95,-.72,.6,.1,.35,'#f4f3e8');for(const side of [-1,1]){box(root,side*.48,.94,0,.035,.035,1.7,'#8fa4aa');for(const z of [-.78,.78]){box(root,side*.36,.42,z,.04,.55,.04,'#aebfc3');const wheel=part(root,'cylinder',[.12,.12,.07],'#283b40',side*.36,.15,z);wheel.rotation.z=Math.PI/2;}}return {root};}
 const emptyStretchers=vehicles.map(()=>emptyStretcher());
 const sequence=[['red',0],['yellow',0]];for(let i=0;i<12;i++)sequence.push(['green',i],['yellow',i+1]);sequence.push(['yellow',13],['yellow',14],['black',0],['black',1]);
 const tentAssignments=[];for(const t of [...facility.siteLayout.tents].sort((a,b)=>a.id-b.id))for(let j=0;j<t.patients;j++)tentAssignments.push({t,j});
 const available=doctors.map(d=>d.arrival+.4);
 const patients=sequence.map(([kind,index],order)=>{
  const id=(kind==='yellow'?'Y':kind==='green'?'G':kind==='red'?'R':'D')+String(index+1).padStart(2,'0'),lying=false,person=avatar({kind,index}),doctorIndex=order%4,slot=Math.floor(order/4),exam=doctors[doctorIndex].exam;
  if(kind==='black'){const start=1.6+index*2.3,target=index===0?point(62.2,-1.8):point(65,-3.6),exitPath=makePath([[58.4,2],[61.5,2],target]),exitDuration=exitPath.length/1.35,exitDone=start+exitDuration,arrival=exitDone+2.2;tag(person.root,id+' · إصابة بالغة',COLORS.black,2.5,1.8);const deathAnchor=new THREE.Group();person.root.add(deathAnchor);deathAnchor.visible=false;tag(deathAnchor,id+' · وفاة',COLORS.black,1.6,1);return {id,kind,index,order,start,assess:Infinity,classified:arrival,arrival,path:exitPath,exitPath,exitDuration,exitDone,doctorIndex:-1,slot:0,exam:null,target,tent:null,seat:0,lying:false,person,escort:null,label:null,handoff:null,guideHold:null,deathAnchor,travelSpeed:1.35,state:'building',world:point(58.4,2)};}
  // A rapid, unescorted evacuation stream feeds four parallel assessment queues.
  const start=Math.floor(order/2)*.82+(order%2)*.12,laneZ=order%2?2.65:1.35,laneX=55.9,carried=kind==='red'||kind==='yellow'&&index===0,assisted=kind==='yellow'&&index===1;
  const exitPath=makePath([[laneX,laneZ],[62.3,laneZ],[exam.x,exam.z]]),exitDuration=exitPath.length/(carried?1.6:assisted?1.4:1.8),exitDone=start+exitDuration;
  const assess=Math.max(exitDone,available[doctorIndex]),classified=assess+4.2;available[doctorIndex]=classified+.85;
  let target,path,tent,seat=0;
  const departure=[[exam.x,exam.z],[exam.x+.95,exam.z],[exam.x+.95,12.5]];
  if(kind==='green'){
   const assignment=tentAssignments[index];tent=assignment.t;seat=assignment.j;const saved=facility.population.actors.find(a=>a.id==='out-patient-'+tent.id+'-'+(seat+1));target=point(saved.x,saved.z);
   const dir=tent.yaw===0?1:-1,front=tent.z+dir*3.15,side=seat===0?-1:1;
   path=makePath([...departure,[64.5,13.1],[64.5,18.2],[45.5,18.2],[41,22],[tent.x,22],[tent.x,front],[tent.x+side*1.4,tent.z+dir*.9],[tent.x+side*1.4,tent.z-dir*1.3],[target.x,tent.z-dir*1.3],target]);
  }else if(kind==='yellow'){
   target=point(index===14?82:[76,77.2,80.8,82][index%4],25.7-Math.floor(index/4)*2.5);path=makePath([...departure,[73.5,12.5],[84.5,14.5],[84.5,target.z+.9],[target.x,target.z+.9],target]);
  }else {target=point(69,22);path=makePath([...departure,[73.5,13.5],[73.5,15],[69,15],target]);}
  const travelSpeed=carried?1.3:kind==='green'?1.25:1.35,arrival=classified+path.length/travelSpeed,escort=kind==='green'?avatar({role:'guide',index:index+1}):null;
  const handoff=kind==='green'?classified+path.lengths[3]/travelSpeed:null,guideHold=kind==='green'?point(tent.x+(seat===0?-1.75:1.75),tent.z+(tent.yaw===0?3.2:-3.2)):null;
  let guideRunPath=null,guideRunStart=null,guideRunEnd=null;
  if(escort){const meet=sidePoint(sample(path,path.lengths[3]/path.length),.85);guideRunPath=makePath([guideHold,[tent.x,22],[41,22],[45.5,18.2],[64.5,18.2],meet]);guideRunStart=Math.max(.6,handoff-1-guideRunPath.length/4.1);guideRunEnd=guideRunStart+guideRunPath.length/4.1;}
  const litter=carried?rescueLitter(person):null,restPose=kind==='red'||kind==='yellow'&&index%3!==1?'ground-supine':'floor-seated';
  const label=tag(person.root,id,COLORS[kind],1.05,2.05);
  return {id,kind,index,order,start,assess,classified,arrival,path,exitPath,exitDuration,exitDone,doctorIndex,slot,exam,target,tent,seat,lying,person,escort,label,handoff,guideHold,guideRunPath,guideRunStart,guideRunEnd,carried,assisted,litter,restPose,travelSpeed,state:'building',world:point(laneX,laneZ)};
 });
 // A two-person recovery team carries the deceased after the collapse.
 const recoveryTeam=Array.from({length:2},(_,i)=>{const model=avatar({role:'nurse',kind:'green',index:i+9});model.root.userData.recoveryStaff=true;return model;});
 const along=(p,d)=>({x:p.x+Math.sin(p.yaw)*d,z:p.z+Math.cos(p.yaw)*d,yaw:p.yaw});
 let previousRecovery=null;
 const redRecoveries=patients.filter(p=>p.kind==='black').map((patient,i)=>{
  const destination=point(i===0?67.3:70.7,-8.5),pickupYaw=Math.PI/2,start=previousRecovery?previousRecovery.done+2:patient.arrival+7;
  const carryPath=makePath([patient.target,[77,patient.target.z],[77,-12],[destination.x,-12],destination]),finalYaw=sample(carryPath,1).yaw;
  const approachPaths=recoveryTeam.map((_,j)=>{const d=j===0?1.35:-1.35,from=previousRecovery?along({...previousRecovery.destination,yaw:previousRecovery.finalYaw},d):point(80+j,-6.2),end=along({...patient.target,yaw:pickupYaw},d),waypoints=previousRecovery?[from,[77,-12],[77,patient.target.z]]:[from,[77,patient.target.z]];if(j===1){const bypass=patient.target.z+(i===0?1.1:-1.1);waypoints.push([patient.target.x+2,bypass],[end.x,bypass]);}waypoints.push(end);return makePath(waypoints);});
  const atBody=start+Math.max(...approachPaths.map(p=>p.length))/1.45,liftDone=atBody+6,lowerStart=liftDone+carryPath.length/1.3,done=lowerStart+4;
  const litter=new THREE.Group();patient.person.root.add(litter);litter.visible=false;
  box(litter,0,0,0,.86,.045,1.96,'#c98342');for(const side of [-1,1])box(litter,side*.46,.025,0,.035,.04,2.5,'#a9b8bb');for(const z of [-.56,.42])box(litter,0,.03,z,.9,.02,.07,'#45595b');
  const recovery={patient,index:i,destination,pickupYaw,finalYaw,start,approachPaths,atBody,liftDone,carryPath,lowerStart,done,litter};patient.recovery=recovery;previousRecovery=recovery;return recovery;
 });
 function recoveryPose(recovery,t){if(t<recovery.atBody)return null;if(t<recovery.liftDone){const u=clamp((t-recovery.atBody)/6);return {...placed(recovery.patient.target,recovery.pickupYaw*u*u*(3-2*u)),stage:'lifting',lift:u};}if(t<recovery.lowerStart)return {...sample(recovery.carryPath,(t-recovery.liftDone)/(recovery.lowerStart-recovery.liftDone)),stage:'carrying',lift:1};if(t<recovery.done)return {...placed(recovery.destination,recovery.finalYaw),stage:'lowering',lift:1-clamp((t-recovery.lowerStart)/4)};return {...placed(recovery.destination,recovery.finalYaw),stage:'black',lift:0};}
 function updateRecoveryTeam(t){const recovery=redRecoveries.filter(r=>t>=r.start).at(-1);for(let i=0;i<recoveryTeam.length;i++){const model=recoveryTeam[i];model.root.visible=active;model.root.userData.tagVisible=false;let pose=placed(point(80+i,-6.2),-Math.PI/2),moving=false,bend=0,carrying=false;
  if(recovery){const phase=recoveryPose(recovery,t);if(!phase){pose=sample(recovery.approachPaths[i],(t-recovery.start)/(recovery.atBody-recovery.start));moving=true;}else{const base=phase.stage==='lifting'?placed(recovery.patient.target,recovery.pickupYaw):phase;pose=along(base,i===0?1.35:-1.35);pose.yaw=base.yaw+(i===0?Math.PI:0);moving=phase.stage==='carrying';carrying=phase.stage!=='black';if(phase.stage==='lifting')bend=Math.sin(Math.PI*phase.lift);else if(phase.stage==='lowering')bend=Math.sin(Math.PI*phase.lift);}}
  position(model,pose);const rig=model.pose(i===0&&moving?-t:t,moving);if(carrying){model.arms.forEach(a=>a.rotation.x=-.6);model.figure.position.y=-.28*bend;rig.knees.forEach(k=>k.rotation.x=.55*bend);rig.legs.forEach(l=>l.rotation.x=-.22*bend);}
 }}
 const triageComplete=Math.max(...patients.map(p=>p.classified)),critical=patients.find(p=>p.kind==='red'),transportStart=Math.ceil(critical.arrival)+5;
 // Queue advancement is derived from time, so pause, resume and seeking agree.
 function queuePoint(p,t){const advance=patients.filter(q=>q.doctorIndex===p.doctorIndex&&q.order<p.order).reduce((n,q)=>n+clamp((t-q.classified)/.85),0);return point(p.exam.x,p.exam.z-Math.max(0,p.slot-advance)*1.02);}
 function evacuationPose(p,t){const route=makePath([...p.exitPath.points.slice(0,-1),queuePoint(p,t)]);return sample(route,(t-p.start)/p.exitDuration);}
 const bedOrder=['B4','C2','B3','C1','A1','D1','A2','D2','A3','C3','A4','C4','B1','D3','B2','D4'];
 const lastTrip=Array(8).fill(null),lastBerth=Array(2).fill(null);
 let previousRoadDeparture=-Infinity;
 const transfersPlaceholder={firstDeparture:0};
 const transportPatients=[critical,...patients.filter(p=>p.kind==='yellow').sort((a,b)=>a.index-b.index)];
 const transfers=transportPatients.map((p,i)=>{
  const vehicleIndex=i%8,bay=0,vehicle=vehicles[vehicleIndex],park=point(77,33),bedId=bedOrder[i],bed=beds[bedId];
  const firstDeparture=i?transfersPlaceholder.firstDeparture:0;
  const stagingPath=makePath(ambulanceDispatch(staging[vehicleIndex],park)),stagingDuration=stagingPath.length/5;
  const dispatch=Math.max(transportStart+i*12,(lastTrip[vehicleIndex]?.returnDone||0)+5,p.arrival+5-stagingDuration,(i?lastBerth[0].loadDone+8:0)-stagingDuration),prepare=dispatch+stagingDuration;
  const pickup=p.kind==='red'?point(71.3,p.target.z):point(bay===0?78.4:79.6,p.target.z+.8);
  const aisle=p.kind==='red'?73.5:84.5,pickupPath=makePath([[80.25,park.z],[84.5,park.z],[84.5,28.5],[aisle,28.5],[pickup.x,28.5],pickup]),unpackDone=prepare+3,atPatient=unpackDone+pickupPath.length/1.45,pickupDone=atPatient+5,start=pickupDone;
  const loadPath=makePath([pickup,[pickup.x,28.5],[84.5,28.5],[84.5,park.z],[80.25,park.z]]),loadDone=start+loadPath.length/1.35+4;
  const journey=ambulanceJourney(park,bay),drivePath=makePath(journey.points),driveDone=loadDone+drivePath.length/4.4,tripNumber=Math.floor(i/8)+1;
  const room=facility.roomData.find(r=>r.id.split('/').includes(bedId)),roomX=room.x,foot=point(bed.x,6.3),hospitalPath=makePath([[3.6,19],[5.7,19],[5.7,14.2],[1.4,14.2],[0,11],[0,2.2],[roomX,2.2],[roomX,5.6],[bed.x,5.6],foot]),unloaded=driveDone+4;
  const receptionStart=unloaded+hospitalPath.lengths[5]/1.25,receptionDone=receptionStart+5,atBed=unloaded+hospitalPath.length/1.25+5,done=atBed+6;
  const returnWalkPath=makePath([...hospitalPath.points].reverse().map(p=>Math.abs(p.x)<.01?point(1.6,p.z):p)),returnWalkDone=done+2+returnWalkPath.length/1.7;
  const returnJourney=ambulanceReturn(bay,staging[vehicleIndex]),returnDrivePath=makePath(returnJourney.points),returnDone=returnWalkDone+returnDrivePath.length/5,loopStart=returnWalkDone+returnJourney.loopStartDistance/5,loopEnd=returnWalkDone+returnJourney.loopEndDistance/5;
  const bedAnchor=new THREE.Group();bedAnchor.position.set(bed.x,facility.groundHeight(bed.x,bed.z),bed.z);roots.add(bedAnchor);tag(bedAnchor,bedId+' · '+p.id,p.kind==='red'?COLORS.red:'#3b7b65',2,2);bedAnchor.userData.tagVisible=false;
  const trip={patient:p,vehicle,vehicleIndex,bay,index:i,dispatch,stagingPath,prepare,unpackDone,pickup,pickupPath,atPatient,pickupDone,start,park,loadPath,loadDone,drivePath,driveDone,loopStart,loopEnd,tripNumber,lapLength:returnJourney.lapLength,unloaded,hospitalPath,receptionStart,receptionDone,atBed,done,bed,foot,bedId,roomX,bedAnchor,returnWalkPath,returnWalkDone,returnDrivePath,returnDone};
  // Reserve the hospital bay until its crew returns, preventing stacked vehicles.
  const delay=Math.max(0,(lastBerth[0]?.returnWalkDone||0)+8-trip.driveDone,previousRoadDeparture+10-trip.loadDone);
  if(delay)for(const key of ['dispatch','prepare','unpackDone','atPatient','pickupDone','start','loadDone','driveDone','loopStart','loopEnd','unloaded','receptionStart','receptionDone','atBed','done','returnWalkDone','returnDone'])trip[key]+=delay;
  previousRoadDeparture=trip.loadDone;lastTrip[vehicleIndex]=lastBerth[bay]=trip;if(i===0)transfersPlaceholder.firstDeparture=trip.loadDone;return trip;
 });
 const allBedsAt=Math.max(...transfers.map(t=>t.done));
 const support=createScenarioSupport(allBedsAt,transfers[0]);
 const duration=Math.ceil(Math.max(support.airborne+18,...transfers.map(tr=>tr.returnDone+4)));
 const events=[{time:0,label:'الإنذار · إخلاء R01 وY01 محمولتين من الداخل',view:'triage'},{time:.6,label:'خروج أطباء الفرز من باب الكلية سيراً مع حقائب الإسعاف',view:'responders'},...doctors.map(d=>({time:d.arrival,label:'وصول طبيب الفرز '+d.id+' بالحقيبة',view:'triage'})),{time:Math.min(...patients.filter(p=>p.escort).map(p=>p.guideRunStart)),label:'منظمو الأخضر ينطلقون من الخيام للقاء الحالات',view:'green'},
 {time:Math.min(...patients.filter(p=>p.kind==='black').map(p=>p.exitDone)),label:'سقوط الحالتين قرب مخرج الحريق',view:'collapse'},
 {time:critical.classified,label:'R01 · تصنيف أحمر وأولوية النقل',view:'triage',patient:'R01'},
 {time:triageComplete,label:'اكتمال الفرز · 1 أحمر، 15 أصفر، 12 أخضر، 2 أسود',view:'triage'},
 ...redRecoveries.flatMap(r=>[{time:r.atBody,label:'رفع '+r.patient.id+' من موقع الحريق',view:'collapse',patient:r.patient.id},{time:r.done,label:'وضع '+r.patient.id+' في منطقة الوفيات السوداء',view:'black',patient:r.patient.id}]),
 {time:Math.max(...patients.filter(p=>p.kind==='green').map(p=>p.arrival)),label:'اكتمال وصول 12 حالة إلى الفرق الراجلة الثمانية',view:'green'},
 ...transfers.flatMap(tr=>[
  {time:tr.prepare,label:'إخراج النقالة من إسعاف '+(tr.vehicleIndex+1),view:'loading',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.atPatient,label:'استلام '+tr.patient.id+' من '+(tr.patient.kind==='red'?'الأحمر — أولوية':'الأصفر'),view:tr.patient.kind==='red'?'recovery':'yellow',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.loadDone,label:'انطلاق إسعاف '+(tr.vehicleIndex+1)+' بالحالة '+tr.patient.id+' · رحلة '+tr.tripNumber+'/2',view:'drive',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.loopStart,label:'لفة العودة '+tr.tripNumber+'/2 للإسعاف '+(tr.vehicleIndex+1)+' بعد تسليم '+tr.patient.id,view:'loop',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.loopEnd,label:'الوصول إلى طابور الجهة المقابلة · إسعاف '+(tr.vehicleIndex+1),view:'loop',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.driveDone,label:'وصول '+tr.patient.id+' إلى المستشفى',view:'hospital',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.receptionStart,label:'تسليم '+tr.patient.id+' إلى استقبال الطوارئ',view:'intake',patient:tr.patient.id,bedId:tr.bedId},
  {time:tr.done,label:'وصول '+tr.patient.id+' إلى السرير '+tr.bedId,view:'bed',patient:tr.patient.id,bedId:tr.bedId}
 ]),{time:allBedsAt,label:'استلام الحالات الـ16 · اكتملت الغرف الثماني',view:'beds'},...support.events].sort((a,b)=>a.time-b.time);

 const savedInstances=[];
 const relocated={'intake-1':{x:-2.5,z:.5},'intake-2':{x:2.5,z:.5}};for(const [id,bed] of Object.entries(beds)){const r=facility.roomData.find(r=>r.id.split('/').includes(id)),side=Math.sign(bed.x-r.x);relocated['doctor-'+id]={x:r.x+side*2.65,z:10.8};for(let k=1;k<=5;k++){const a=facility.population.actors.find(a=>a.id==='student-'+id+'-'+k);if(a)relocated[a.id]=k<=3?{x:r.x+side*2.7,z:7.5+(k-1)*1.35}:{x:r.x+side*.6,z:k===4?10:11.1};}}
 for(const batch of facility.crowd.children){const items=[];(batch.userData.actorIds||[]).forEach((id,i)=>{if(id.startsWith('out-patient-')||support.hiddenActors.has(id)||relocated[id]){batch.getMatrixAt(i,matrix);items.push({i,id,matrix:matrix.clone()});}});if(items.length)savedInstances.push({batch,items});}
 function staticScene(visible){
  facility.patientVisuals.forEach(o=>o.visible=visible);facility.curtains.forEach(c=>c.node.visible=visible);
  for(const {batch,items} of savedInstances){for(const item of items){if(visible)batch.setMatrixAt(item.i,item.matrix);else if(relocated[item.id]){
    const a=facility.population.actors.find(a=>a.id===item.id),p=relocated[item.id],m=item.matrix.clone();m.elements[12]+=p.x-a.x;m.elements[14]+=p.z-a.z;batch.setMatrixAt(item.i,m);
   }else batch.setMatrixAt(item.i,zero);}batch.instanceMatrix.needsUpdate=true;}
  renderer.shadowMap.needsUpdate=true;
 }

 function updateEvacuationTeam(t){
  const carried=patients.filter(p=>p.carried),assisted=patients.find(p=>p.assisted),homes=[point(65.5,15.2),point(65.5,26.6),point(73.3,15.1),point(73.3,27.4),point(73.5,12.9)];
  for(let i=0;i<5;i++){const model=evacuationTeam[i],p=i<4?carried[Math.floor(i/2)]:assisted;model.root.visible=active;model.root.userData.tagVisible=false;let pose,moving=false,holding=false,bend=0;
   const release=p.arrival+(i<4?4:2);
   if(t<release){const patientPose=t<p.start?placed(p.exitPath.points[0],Math.PI/2):{x:p.person.root.position.x,z:p.person.root.position.z,yaw:p.person.root.rotation.y};
    if(i<4){pose=along(patientPose,i%2===0?1.32:-1.32);pose.yaw=patientPose.yaw+(i%2===0?Math.PI:0);holding=true;bend=Math.sin(Math.PI*clamp((t-p.arrival)/4));moving=t>=p.start&&(t<p.exitDone||t>=p.classified&&t<p.arrival);}
    else {pose=sidePoint(patientPose,-.58);moving=t>=p.start&&(t<p.exitDone||t>=p.classified&&t<p.arrival);holding=t>=p.start;}
   }else {const base=placed(p.target,p.kind==='red'?Math.PI:p.index%4<2?Math.PI/2:-Math.PI/2),from=i<4?along(base,i%2===0?1.32:-1.32):sidePoint(base,-.58),path=p.kind==='yellow'?makePath([from,[from.x,p.target.z+1.55],[73.6,p.target.z+1.55],homes[i]]):makePath([from,[65.2,from.z],homes[i]]),u=clamp((t-release)/(path.length/1.45));pose=sample(path,u);moving=u<1;}
   position(model,pose);const rig=model.pose(i%2===0&&moving?-t:t,moving);if(holding){model.arms.forEach(a=>a.rotation.x=i<4?-.62:-.9);if(i<4){model.figure.position.y=-.28*bend;rig.knees.forEach(k=>k.rotation.x=.55*bend);rig.legs.forEach(l=>l.rotation.x=-.22*bend);}}
  }
 }

 function createScenarioSupport(allBedsAt,redTrip){
  const hiddenActors=new Set(),heatStart=Math.max(...transfers.map(tr=>tr.driveDone)),heatResolved=heatStart+110,clinicalReview=Math.max(allBedsAt+45,transfers.filter(tr=>tr.vehicleIndex===0).at(-1).returnDone+8);
  const affected=[1,2,5,6].map((id,i)=>{
   const tent=facility.siteLayout.tents.find(t=>t.id===id),dir=tent.yaw===0?1:-1;
   const original=facility.population.actors.find(a=>a.id==='paramedic-'+id+'-1'),helperOriginal=facility.population.actors.find(a=>a.id==='paramedic-'+id+'-2');
   hiddenActors.add(original.id);hiddenActors.add(helperOriginal.id);
   const model=avatar({role:'nurse',index:i+30}),helper=avatar({role:'nurse',index:i+35});
   tag(model.root,'إجهاد حراري · فريق '+id,'#986531',2.6,.8);
   const end=point(tent.x+(i%2?1.4:-1.4),22-dir*1.75),walk=makePath([original,[tent.x-1.8,tent.z+dir*3.15],end]);
   const assist=makePath([helperOriginal,[tent.x+1.8,tent.z+dir*3.15],[end.x+.85,end.z]]),rest=makePath([end,[tent.x,tent.z+dir*3.1]]);
   // Four illustrative secondary casualties; the brief does not specify a count.
   return {id:'H0'+(i+1),tent,model,helper,original,helperOriginal,walk,assist,rest,end,start:heatStart+i*2,collapse:heatStart+12+i*2,help:heatStart+23+i*2,seated:heatStart+62+i*2};
  });
  const pad=new THREE.Group();roots.add(pad);pad.position.set(-29,0,30);
  part(pad,'cylinder',[7.3,7.3,.025],'#e6e6d9',0,.025,0);part(pad,'cylinder',[6.95,6.95,.025],'#43595d',0,.042,0);
  for(const x of [-1.3,1.3])box(pad,x,.063,0,.55,.015,4.3,'#f5f2e5');box(pad,0,.063,0,2.7,.015,.55,'#f5f2e5');
  tag(pad,'مهبط الإخلاء الجوي / HELIPAD','#315968',6.3,.4);
  const helicopter=new THREE.Group();roots.add(helicopter);const white=carPaint('#e3e9e5'),red=carPaint('#b73d3b'),glass=meshMaterial('#385d6a',.35);
  ell(helicopter,0,1.6,0,1.15,1.05,2.8,white);ell(helicopter,0,1.9,1.72,.96,.65,1.1,glass);
  box(helicopter,0,1.6,-3.7,.35,.45,4.3,white);box(helicopter,0,2.7,-5.35,.12,2.3,.9,red);box(helicopter,0,1.6,-5.0,3,.15,.65,red);
  for(const side of [-1,1]){box(helicopter,side*1.13,1.55,-.3,.035,.3,2.4,red);box(helicopter,side*1.15,1.7,-.4,.04,.7,.18,red);box(helicopter,side*1.14,.28,0,.12,.12,5.4,'#6e8386');for(const z of [-1.4,1.4])box(helicopter,side*.9,.65,z,.1,.8,.1,'#6e8386');}
  part(helicopter,'cylinder',[.12,.12,.6],'#5e747a',0,2.8,0);const rotor=new THREE.Group();helicopter.add(rotor);rotor.position.y=3.1;
  box(rotor,0,0,0,10.8,.045,.18,'#253b42');box(rotor,0,0,0,.18,.045,10.8,'#253b42');
  const tailRotor=new THREE.Group();tailRotor.position.set(.3,2.3,-5.1);helicopter.add(tailRotor);box(tailRotor,0,0,0,.05,1.6,.1,'#253b42');box(tailRotor,0,0,0,.05,.1,1.6,'#253b42');
  shadow(helicopter,7,10);tag(helicopter,'AIR MEDICAL · إخلاء جوي','#355f6c',4.8,3.8);
  const fieldApproach=ambulanceDispatch(staging[0],point(77,33)),dispatchPath=makePath([...fieldApproach,...ambulanceJourney(point(77,33),0).points.slice(1)]),crewArrival=clinicalReview+dispatchPath.length/5;
  const approach=makePath([...redTrip.hospitalPath.points].reverse()),departure=crewArrival+approach.length/1.5+6;
  const bedOut=makePath([redTrip.bed,redTrip.foot,...redTrip.hospitalPath.points.slice(0,-1).reverse()]),walkDone=departure+bedOut.length/1.25,loaded=walkDone+5;
  const drivePath=makePath(smoothRoad([[0,19],[-18.8,19],[-18.8,30]],4)),helipadArrival=loaded+drivePath.length/4;
  const toHeli=makePath([[-18.8,26.4],[-21,26.4],[-24.5,28.5],[-28.4,31.5]]),unloaded=helipadArrival+4,heliWalkDone=unloaded+toHeli.length/1.2,airborne=heliWalkDone+8;
  const events=[{time:heatStart,label:'بدء إخلاء الفرق · حادث الإجهاد الحراري',view:'heat'},...affected.map(h=>({time:h.collapse,label:h.id+' · إغماء عضو من الفريق '+h.tent.id,view:'heat'})),{time:heatStart+30,label:'الزملاء يقدمون الإسعاف والرعاية في الظل',view:'heat'},{time:heatResolved,label:'استقرار الحالات الثانوية بعد المساعدة',view:'heat'},
   {time:clinicalReview,label:'R01 · تشخيص الحالة واتخاذ قرار الإحالة القلبية',view:'bed',patient:'R01',bedId:redTrip.bedId},
   {time:departure,label:'R01 · مغادرة السرير باتجاه إسعاف المهبط',view:'hospital',patient:'R01'},
   {time:loaded,label:'R01 · انطلاق إسعاف الإخلاء الجوي',view:'helipad',patient:'R01'},
   {time:helipadArrival,label:'R01 · وصول الإسعاف إلى المهبط',view:'helipad',patient:'R01'},
   {time:airborne,label:'R01 · إقلاع المروحية إلى المستشفى المرجعي',view:'helipad',patient:'R01'}];
  function vehiclePoseAt(t){return t<crewArrival?sample(dispatchPath,(t-clinicalReview)/(crewArrival-clinicalReview)):t<loaded?placed(point(0,19),-Math.PI/2):t<helipadArrival?sample(drivePath,(t-loaded)/(helipadArrival-loaded)):placed(point(-18.8,30),0);}
  function update(t){
   pad.visible=helicopter.visible=active;pad.userData.tagVisible=t<clinicalReview;helicopter.position.set(-29,0,30);helicopter.rotation.y=Math.PI/2;rotor.rotation.y=t>=loaded?t*24:0;tailRotor.rotation.x=t>=loaded?t*31:0;
   if(t>=airborne){const u=clamp((t-airborne)/18);helicopter.position.set(-29-u*28,u*u*45,30-u*20);}
   for(const h of affected){const m=h.model,g=h.helper;m.root.visible=g.root.visible=active;let q=placed(h.original),moving=false,type='stand';
    if(t>=h.start&&t<h.collapse){q=sample(h.walk,(t-h.start)/(h.collapse-h.start));moving=true;}else if(t>=h.collapse&&t<h.seated){q=placed(h.end);type='ground';}else if(t>=h.seated&&t<h.seated+18){q=sample(h.rest,(t-h.seated)/18);moving=true;}else if(t>=h.seated+18){q=placed(h.rest.points.at(-1),h.tent.yaw);type='floor-seated';}
    position(m,q);m.pose(t,moving,type);m.root.userData.tagVisible=t>=h.collapse&&t<heatResolved;
    if(t>=h.collapse&&t<h.collapse+2){const u=(t-h.collapse)/2;m.pose(t,false);m.figure.rotation.x=Math.PI/2*u;m.figure.position.set(0,.2*u,-.8*u);}
    let hp=placed(h.helperOriginal),hm=false;if(t>=h.collapse&&t<h.help){hp=sample(h.assist,(t-h.collapse)/(h.help-h.collapse));hm=true;}else if(t>=h.help&&t<h.seated){hp={x:h.end.x+.85,z:h.end.z,yaw:-Math.PI/2};}else if(t>=h.seated){hp=sidePoint(q,.75);hm=moving;}
    position(g,hp);g.pose(t,hm,t>=h.help&&t<h.seated?'seated':'stand');g.root.userData.tagVisible=false;if(t>=h.help&&t<h.seated)g.arms.forEach(a=>a.rotation.x=-.8);
   }
   if(t<clinicalReview)return;
   const vehicle=vehicles[0];position(vehicle,vehiclePoseAt(t));emptyStretchers[0].root.visible=false;
   if(t>=departure){const p=critical,person=p.person;let q;
    if(t<walkDone)q=sample(bedOut,(t-departure)/(walkDone-departure));else if(t<loaded){const a=bedOut.points.at(-1),b=relative(vehicle,0,-.65,.35),u=clamp((t-walkDone)/5);q={x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),yaw:0,y:.35*u};}
    else if(t<helipadArrival)q=relative(vehicle,0,-.65,.35);else if(t<unloaded){const a=relative(vehicle,0,-.65,.35),b=toHeli.points[0],u=clamp((t-helipadArrival)/4);q={x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),yaw:0,y:.35*(1-u)};}else q=sample(toHeli,(t-unloaded)*1.2/toHeli.length);
    if(t>=heliWalkDone){const u=clamp((t-heliWalkDone)/8),end=toHeli.points.at(-1);q={x:mix(end.x,-29,u),z:mix(end.z,30,u),y:u*.65,yaw:-Math.PI/2};}
    position(person,q,q.y||0);person.pose(t,false,'lying');person.trolley.visible=t<heliWalkDone+4;person.root.visible=active&&t<airborne;person.root.userData.tagVisible=t<heliWalkDone;p.world=point(q.x,q.z);p.state=t>=airborne?'airborne':t>=helipadArrival?'helipad-transfer':'referral-transfer';redTrip.bedAnchor.userData.tagVisible=false;
   }
   for(let i=0;i<2;i++){const m=medics[i];m.root.visible=active;let q=relative(vehicle,i===0?-.7:.7,-.8,.37),moving=false,seated=true;
    if(t>=crewArrival&&t<departure){q=sidePoint(sample(approach,(t-crewArrival)*1.5/approach.length),i===0?-.7:.7);moving=t<departure-6;seated=false;}
    else if(t>=departure&&t<walkDone){q=sidePoint(sample(bedOut,(t-departure)/(walkDone-departure)),i===0?-.7:.7);moving=true;seated=false;}
    else if(t>=unloaded&&t<airborne){q=sidePoint(sample(toHeli,(t-unloaded)*1.2/toHeli.length),i===0?-.7:.7);moving=t<airborne-8;seated=false;}
    else if(t>=airborne){q={x:-22-i,z:32,yaw:-Math.PI/2};seated=false;}
    position(m,q,q.y||0);m.pose(t,moving,seated?'seated':'stand');
   }
  }
  return {hiddenActors,affected,heatStart,heatResolved,clinicalReview,departure,loaded,helipadArrival,heliWalkDone,airborne,helicopter,pad,events,update,vehiclePoseAt};
 }

 function finalize(){
  const byMaterial=new Map();for(const mesh of parts){const key=mesh.geometry.uuid+':'+mesh.material.uuid;if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(mesh);}
  for(const items of byMaterial.values()){const mesh=new THREE.InstancedMesh(items[0].geometry,items[0].material,items.length);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=true;visuals.add(mesh);batches.push({mesh,items});}
 }
 finalize();
 function visible(o){let n=o;while(n){if(!n.visible)return false;n=n.parent;}return true;}
 function render(){
  roots.updateMatrixWorld(true);for(const {mesh,items} of batches){for(let i=0;i<items.length;i++)mesh.setMatrixAt(i,visible(items[i])?items[i].matrixWorld:zero);mesh.instanceMatrix.needsUpdate=true;}
  for(const item of labels){item.sprite.visible=active&&visible(item.host)&&item.host.userData.tagVisible!==false;if(item.sprite.visible){item.host.getWorldPosition(vector);item.sprite.position.set(vector.x,vector.y+(item.host.userData.tagHeight??item.offset),vector.z);}}
 }
 function position(model,p,y=0){model.root.position.set(p.x,facility.groundHeight(p.x,p.z)+y,p.z);model.root.rotation.y=p.yaw||0;}
 function sidePoint(p,offset){return {x:p.x+Math.cos(p.yaw)*offset,z:p.z-Math.sin(p.yaw)*offset,yaw:p.yaw};}
 function relative(vehicle,x,z,y=0){const a=vehicle.root.rotation.y;return {x:vehicle.root.position.x+Math.cos(a)*x+Math.sin(a)*z,z:vehicle.root.position.z-Math.sin(a)*x+Math.cos(a)*z,yaw:a,y};}
 function currentTrip(vehicleIndex,t){return transfers.filter(tr=>tr.vehicleIndex===vehicleIndex&&t>=tr.dispatch).at(-1)||null;}
 function vehiclePose(vehicleIndex,t){const tr=currentTrip(vehicleIndex,t);if(!tr)return placed(staging[vehicleIndex],Math.PI/2);if(t<tr.prepare)return sample(tr.stagingPath,(t-tr.dispatch)/(tr.prepare-tr.dispatch));if(t>=tr.returnDone)return placed(staging[vehicleIndex],Math.PI/2);if(t>=tr.returnWalkDone)return sample(tr.returnDrivePath,(t-tr.returnWalkDone)/(tr.returnDone-tr.returnWalkDone));if(t>=tr.loadDone)return sample(tr.drivePath,(t-tr.loadDone)/(tr.driveDone-tr.loadDone));return placed(tr.park,-Math.PI/2);}
 function vehiclePoseAt(vehicleIndex,t){return vehicleIndex===0&&t>=support.clinicalReview?support.vehiclePoseAt(t):vehiclePose(vehicleIndex,t);}

 function transferPose(tr,t){
  if(t<tr.atPatient)return null;
  if(t<tr.pickupDone){const u=clamp((t-tr.atPatient)/5),a=tr.patient.target,v=clamp((u-.2)/.8);return {x:mix(a.x,tr.pickup.x,v),z:mix(a.z,tr.pickup.z,v),yaw:mix(tr.patient.kind==='yellow'?(tr.patient.index%4<2?Math.PI/2:-Math.PI/2):Math.PI,0,v),stage:'patient-pickup',moving:false,lift:v};}
  if(t<tr.loadDone-4)return {...sample(tr.loadPath,(t-tr.start)/(tr.loadDone-4-tr.start)),stage:'loading-walk',moving:true};
  if(t<tr.loadDone){const a=tr.loadPath.points.at(-1),b=relative(tr.vehicle,0,-.65,.35),u=clamp((t-(tr.loadDone-4))/4);return {x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),y:mix(0,.35,u),yaw:-Math.PI/2,stage:'loading',moving:false};}
  if(t<tr.driveDone)return {...relative(tr.vehicle,0,-.65,.35),stage:'aboard',moving:false};
  if(t<tr.unloaded){const a=relative(tr.vehicle,0,-.65,.35),b=tr.hospitalPath.points[0],u=clamp((t-tr.driveDone)/4);return {x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),y:mix(.35,0,u),yaw:Math.PI,stage:'unloading',moving:false};}
  if(t<tr.atBed){const elapsed=t-tr.unloaded-(t>=tr.receptionDone?5:t>=tr.receptionStart?t-tr.receptionStart:0);return {...sample(tr.hospitalPath,elapsed*1.25/tr.hospitalPath.length),stage:t>=tr.receptionStart&&t<tr.receptionDone?'reception':'hospital-walk',moving:!(t>=tr.receptionStart&&t<tr.receptionDone)};}
  return {...placed(tr.foot,Math.PI),stage:t<tr.done?'bed-transfer':'bed',moving:false,transfer:clamp((t-tr.atBed)/6)};
 }
 function update(t,force=false){
  station.visible=yellowFurniture.visible=active;
  for(const recovery of redRecoveries){recovery.litter.visible=active&&t>=recovery.atBody;recovery.patient.deathAnchor.visible=active&&t>=recovery.patient.arrival;}
  for(const staff of yellowStaff){staff.model.root.visible=active;position(staff.model,placed(staff,staff.yaw));staff.model.pose(t,false,'kneeling');staff.model.arms[0].rotation.x=-.5+Math.sin(t*.6+staff.x)*.1;staff.model.root.userData.tagVisible=false;}
  for(const doctor of doctors){const model=doctor.model,moving=t>=doctor.walkStart&&t<doctor.arrival,at=t>=doctor.arrival,pose=at?placed(doctor,doctor.yaw):sample(doctor.walkPath,(t-doctor.walkStart)/(doctor.arrival-doctor.walkStart));model.root.visible=active;position(model,pose);model.pose(t,moving);if(moving)model.arms[1].rotation.x=-.15+Math.sin(t*4+doctor.id)*.06;model.root.userData.tagVisible=at;
   const parent=at?model.root:model.arms[1];if(doctor.bag.parent!==parent)parent.add(doctor.bag);doctor.bag.position.set(at?.65:.05,at?.18:-.7,at?.06:.04);
   const assessing=patients.find(p=>p.doctorIndex===doctor.id-1&&t>=p.assess&&t<p.classified);if(assessing){model.arms[0].rotation.x=-.7+Math.sin(t*2+doctor.id)*.12;model.arms[1].rotation.x=-.25;}
  }

  for(let i=0;i<vehicles.length;i++){const v=vehicles[i],tr=currentTrip(i,t);v.root.visible=active;position(v,vehiclePose(i,t));const driving=tr&&(t>=tr.dispatch&&t<tr.prepare||t>=tr.loadDone&&t<tr.driveDone||t>=tr.returnWalkDone&&t<tr.returnDone);v.wheels.forEach(w=>w.rotation.x=driving?-t*6:0);v.blue.forEach((light,j)=>light.visible=Math.sin(t*7+j*Math.PI)>.05);const empty=emptyStretchers[i];empty.root.visible=active&&!!tr&&t>=tr.prepare&&t<tr.pickupDone;if(tr&&empty.root.visible){let p;if(t<tr.unpackDone){const u=clamp((t-tr.prepare)/3),a=relative(v,0,-.65,.35),b=tr.pickupPath.points[0];p={x:mix(a.x,b.x,u),z:mix(a.z,b.z,u),yaw:-Math.PI/2,y:mix(.35,0,u)};}else p=t<tr.atPatient?sample(tr.pickupPath,(t-tr.unpackDone)/(tr.atPatient-tr.unpackDone)):placed(tr.pickup);position(empty,p,p.y||0);}}
  for(const tr of transfers)tr.bedAnchor.userData.tagVisible=t>=tr.done;
  for(const p of patients){
   const person=p.person;person.root.visible=active&&t>=p.start;if(p.litter)p.litter.visible=false;if(p.escort){p.escort.root.visible=active;position(p.escort,placed(p.guideHold,Math.PI));p.escort.pose(t,false);p.escort.root.userData.tagVisible=false;}if(p.label)p.label.visible=false;p.state='building';if(!person.root.visible)continue;
   if(p.kind==='black'){const u=clamp((t-p.exitDone)/2.2),pose=t<p.exitDone?sample(p.exitPath,(t-p.start)/p.exitDuration):placed(p.target);position(person,pose);person.trolley.visible=false;person.pose(t,t<p.exitDone,t>=p.arrival?'ground':'stand');if(t>=p.exitDone&&t<p.arrival){person.figure.rotation.x=Math.PI/2*u;person.figure.position.set(0,.2*u,-.8*u);person.figure.scale.y=1-.12*Math.sin(Math.PI*u);person.arms[0].rotation.z=.5*u;}p.state=t<p.exitDone?'evacuating':t<p.arrival?'collapsing':'deceased';const recovery=recoveryPose(p.recovery,t);p.recovery.litter.visible=active&&!!recovery;if(recovery){position(person,recovery);p.recovery.litter.position.y=.05+.79*recovery.lift;person.figure.position.y=.2+.8*recovery.lift;if(recovery.stage!=='lifting'||recovery.lift>=.45){person.figure.visible=false;person.shroud.visible=true;person.shroud.position.y=-.74+.8*recovery.lift;}p.state=recovery.stage==='lifting'?'recovery-lift':recovery.stage==='carrying'?'carried-to-black':recovery.stage==='lowering'?'recovery-lower':'black';}p.world=point(recovery?.x??pose.x,recovery?.z??pose.z);person.root.userData.tagVisible=t<p.arrival;p.deathAnchor.visible=t>=p.arrival;person.root.userData.tagHeight=t>=p.exitDone?1.1:2.05;p.deathAnchor.position.y=recovery?.lift?recovery.lift*.6:0;continue;}
   let pose,moving=false,type='stand',tr=transfers.find(q=>q.patient===p),transfer=tr?transferPose(tr,t):null;
   if(transfer){pose=transfer;moving=transfer.moving;p.state=transfer.stage;type=transfer.stage==='patient-pickup'?p.restPose:'lying';}
   else if(t<p.exitDone){pose=evacuationPose(p,t);moving=true;p.state='evacuating';}
   else if(t<p.assess){pose=placed(queuePoint(p,t));moving=patients.some(q=>q.doctorIndex===p.doctorIndex&&q.order<p.order&&t>=q.classified&&t<q.classified+.85);p.state='queue';}
   else if(t<p.classified){pose=placed(p.exam);p.state='triage';}
   else if(t<p.arrival){pose=sample(p.path,(t-p.classified)/(p.arrival-p.classified));moving=true;p.state='to-'+p.kind;}
   else {pose=placed(p.target,p.kind==='green'?p.tent.yaw:Math.PI);p.state=p.kind==='green'?'tent':p.kind==='yellow'?'yellow':'red';type=p.restPose;if(p.kind==='yellow')pose.yaw=p.index%4<2?Math.PI/2:-Math.PI/2;}
   position(person,pose,pose.y||0);
   const carrying=p.carried&&!transfer&&t<p.arrival+4,lower=p.carried?clamp((t-p.arrival)/4):0;
   if(carrying)type='lying';person.pose(p.state==='evacuating'?t*1.2:t,moving&&!carrying,type);
   if(carrying){person.figure.position.y=mix(.98,.18,lower);p.litter.position.y=mix(.84,.05,lower);p.litter.visible=active;person.trolley.visible=false;p.state=t>=p.arrival?'evacuation-lower':p.state;p.evacuationLift=1-lower;}
   else {person.trolley.visible=type==='lying'&&!!transfer&&transfer.stage!=='bed';p.evacuationLift=0;}
   if(p.state==='evacuating'&&!carrying)person.figure.rotation.x=.07;
   if(p.assisted&&!transfer&&t<p.arrival){person.arms[0].rotation.z=-.9;person.figure.rotation.z=-.08;}
   if(transfer?.stage==='patient-pickup'){const u=transfer.lift,startY=p.restPose==='floor-seated'?-.66:.18,startAngle=p.restPose==='floor-seated'?0:-Math.PI/2;person.figure.rotation.x=mix(startAngle,-Math.PI/2,u);person.figure.position.set(0,mix(startY,.98,u),mix(p.restPose==='floor-seated'?0:.82,.82,u));person.trolley.visible=false;}

   if(transfer&&(transfer.stage==='bed-transfer'||transfer.stage==='bed')){person.figure.position.z-=Math.hypot(tr.bed.x-tr.foot.x,tr.bed.z-tr.foot.z)*transfer.transfer;person.figure.position.y=mix(.98,1.02,transfer.transfer);}
   p.world=point(pose.x,pose.z);if(transfer?.transfer===1)p.world={...tr.bed};person.root.userData.tagVisible=p.state==='triage'||(p.index<2&&p.kind==='yellow'||p.kind==='red')&&p.state!=='bed';
   if(p.escort){
    let ep=placed(p.guideHold,p.tent.yaw),guideMoving=false,guideRunning=false;
    const meet=sidePoint(sample(p.path,p.path.lengths[3]/p.path.length),.85);
    if(t>=p.guideRunStart&&t<p.guideRunEnd){ep=sample(p.guideRunPath,(t-p.guideRunStart)/(p.guideRunEnd-p.guideRunStart));guideMoving=guideRunning=true;}
    else if(t>=p.guideRunEnd&&t<p.handoff)ep={...meet,yaw:Math.PI};
    else if(t>=p.handoff){ep=sidePoint(pose,.85);guideMoving=moving;const atFront=p.classified+p.path.lengths[8]/p.travelSpeed;if(t>=atFront){const front=p.guideHold,u=clamp((t-atFront)/1.5),last=sidePoint(sample(p.path,p.path.lengths[8]/p.path.length),.85);ep={x:mix(last.x,front.x,u),z:mix(last.z,front.z,u),yaw:p.tent.yaw};guideMoving=u<1;}}
    position(p.escort,ep);if(guideRunning)runPose(p.escort,t,true);else p.escort.pose(t,guideMoving);p.escort.root.userData.tagVisible=false;
   }
  }

  for(let i=0;i<medics.length;i++){
   const vehicleIndex=Math.floor(i/2),tr=currentTrip(vehicleIndex,t),doc=medics[i],phase=tr?transferPose(tr,t):null;doc.root.visible=active;doc.root.userData.tagVisible=false;let p=relative(vehicles[vehicleIndex],i%2===1?.7:-.7,-.8,.37),moving=false,seated=true;
   if(tr&&t>=tr.returnWalkDone&&t<tr.returnDone){p=relative(tr.vehicle,i%2===1?.7:-.7,-.8,.37);seated=true;}
   else if(tr&&t>=tr.done){if(t<tr.returnWalkDone){p=sidePoint(sample(tr.returnWalkPath,(t-tr.done-2)/(tr.returnWalkDone-tr.done-2)),i%2===1?.25:-.25);moving=t>=tr.done+2;}else {p=relative(tr.vehicle,i%2===1?.7:-.7,-.8,.37);seated=true;}}
   else if(tr&&t<tr.prepare){p=relative(tr.vehicle,i%2===1?.7:-.7,-.8,.37);seated=true;}
   else if(tr&&t<tr.atPatient){const g=sample(tr.pickupPath,(t-tr.unpackDone)/(tr.atPatient-tr.unpackDone));p=sidePoint(g,i%2===1?.8:-.8);moving=true;}
   else if(phase){if(phase.stage==='aboard'){p=relative(tr.vehicle,i%2===1?.7:-.7,-.8,.37);seated=true;}
    else if(phase.stage==='bed'||phase.stage==='bed-transfer')p=placed(point(tr.bed.x+(i%2===1?.85:-.85),tr.bed.z),i%2===1?-Math.PI/2:Math.PI/2);
    else {const narrow=phase.stage==='hospital-walk'&&phase.z>3&&phase.z<6&&Math.abs(phase.x-tr.roomX)<.7;p=narrow?{x:phase.x,z:phase.z-(i%2===1?2.6:1.3),yaw:phase.yaw}:sidePoint(phase,i%2===1?.8:-.8);moving=phase.moving;}}
   if(tr&&((t>=tr.prepare&&t<tr.loadDone)||(t>=tr.driveDone&&t<tr.returnWalkDone)))seated=false;
   position(doc,p,p.y||0);doc.pose(t,moving,seated?'seated':'stand');
  }
  updateRecoveryTeam(t);
  support.update(t);
  updateEvacuationTeam(t);
  render();const snapshot=getSnapshot();const stamp=Math.floor(t*4);if(force||stamp!==lastNotice){lastNotice=stamp;onChange(snapshot);}
  if(follow){let cameraStage='court';if(patients.some(p=>p.state==='collapsing'))cameraStage='collapse';else if(t<triageComplete+2)cameraStage='triage';else if(t<transportStart)cameraStage='green';else if(t>=support.clinicalReview)cameraStage=t>=support.loaded?'helipad':t>=support.departure?'hospital':'beds';else if(t>=support.heatStart&&t<support.heatResolved)cameraStage='heat';else if(transfers.every(tr=>t>=tr.done))cameraStage='beds';else if(transfers.some(tr=>t>=tr.unloaded&&t<tr.done))cameraStage='hospital';else if(transfers.some(tr=>t>=tr.loadDone&&t<tr.driveDone))cameraStage='drive';else cameraStage='loading';if(cameraStage!==lastFocus){lastFocus=cameraStage;onFocus(cameraStage,snapshot);}}

 }
 function getSnapshot(){
  const exited=patients.filter(p=>time>=p.start).length,classified=patients.filter(p=>time>=p.classified).length,green=patients.filter(p=>p.kind==='green'&&time>=p.arrival).length;
  const yellow=patients.filter(p=>p.kind==='yellow'&&time>=p.arrival&&!transfers.some(tr=>tr.patient===p&&time>=tr.atPatient)).length,arrived=transfers.filter(tr=>time>=tr.done).length,red=time>=critical.classified?1:0,black=patients.filter(p=>p.kind==='black'&&time>=p.arrival).length,blackDelivered=redRecoveries.filter(r=>time>=r.done).length;
  const current=patients.filter(p=>time>=p.assess&&time<p.classified),collapse=patients.find(p=>p.state==='collapsing'),moving=transfers.find(tr=>time>=tr.atPatient&&time<tr.done),recovering=patients.find(p=>['recovery-lift','carried-to-black','recovery-lower'].includes(p.state));
  let stage='إنذار الحريق والتدافع · إخلاء 30 مصاباً';
  if(time===0&&!playing)stage='جاهزة · فرضية الحريق والتدافع';else if(time>=support.airborne)stage='إقلاع المروحية باتجاه المستشفى المرجعي';else if(time>=support.departure)stage='نقل R01 من المستشفى إلى مهبط الإخلاء الجوي';else if(time>=support.clinicalReview)stage='R01 · قرار الإحالة إلى مركز ذي إمكانات قسطرة قلبية';else if(time>=support.heatStart&&time<support.heatResolved)stage='حدث طارئ · إجهاد حراري لأربعة من أعضاء الفرق الراجلة';else if(arrived===16)stage='اكتملت الغرف الثماني · استلام 16 حالة';else if(collapse)stage='سقوط حالة عند المخرج · '+collapse.id;else if(current.length)stage='فرز متزامن · '+current.length+' من 4 أعضاء';else if(recovering)stage='فريق حمل ينقل '+recovering.id+' إلى المنطقة السوداء';else if(moving)stage='نقل '+moving.patient.id+' إلى '+moving.bedId+' · تم التسليم '+arrived+'/16';else if(classified===30)stage='توزيع الحالات ونقل الأحمر أولاً ثم الأصفر';
  const referral=time>=support.departure,airborne=time>=support.airborne;
  return {active,playing,time,duration,speed,follow,stage,exited,classified,green,yellow,red,black,blackDelivered,redDelivered:0,hospital:arrived,occupied:arrived-(referral?1:0),referral:airborne?'airborne':referral?'to-helipad':time>=support.clinicalReview?'requested':'pending',heat:{affected:time>=support.heatStart?4:0,assisted:time>=Math.max(...support.affected.map(h=>h.help))?4:0,resolved:time>=support.heatResolved},evacuationOrganizers:5,triageDoctors:doctors.map(d=>({id:d.id,x:d.model.root.position.x,z:d.model.root.position.z,arrived:time>=d.arrival,patient:current.find(p=>p.doctorIndex===d.id-1)?.id||null})),yellowStaff:yellowStaff.length,yellowClassified:patients.filter(p=>p.kind==='yellow'&&time>=p.classified).length,greenClassified:patients.filter(p=>p.kind==='green'&&time>=p.classified).length,redClassified:red,
  patients:patients.map(p=>({id:p.id,kind:p.kind,state:p.state,admitted:transfers.some(tr=>tr.patient===p&&time>=tr.done),x:p.world.x,z:p.world.z,doctor:p.doctorIndex+1,onTrolley:p.person.root.visible&&p.person.trolley.visible,carried:!!p.carried&&time>=p.start&&time<p.arrival+4,assisted:!!p.assisted&&time>=p.start&&time<p.arrival,restPose:p.restPose,escorted:!!p.escort&&time>=p.handoff,guide:p.escort?{x:p.escort.root.position.x,z:p.escort.root.position.z,joined:time>=p.handoff}:null,destination:p.kind==='green'?'F'+p.tent.id:p.kind==='black'?'black':transfers.find(tr=>tr.patient===p).bedId})),vehicles:vehicles.map((v,i)=>{const tr=currentTrip(i,time),aboard=transfers.filter(q=>q.vehicleIndex===i&&time>=q.loadDone&&time<q.driveDone),completedTrips=transfers.filter(q=>q.vehicleIndex===i&&time>=q.done).length;return {id:i+1,x:v.root.position.x,z:v.root.position.z,yaw:v.root.rotation.y,completedTrips,plannedTrips:2,tripNumber:tr?.tripNumber||0,patient:tr&&time>=tr.atPatient&&time<tr.done?tr.patient.id:null,cargoCount:aboard.length,onLoop:!!tr&&time>=tr.loopStart&&time<tr.loopEnd,loopProgress:tr?clamp((time-tr.loopStart)/(tr.loopEnd-tr.loopStart)):0};})};
 }

 function enter(){if(active)return;active=true;visuals.visible=pins.visible=true;staticScene(false);onActivate(true);lastFocus='';update(time,true);}
 function play(){enter();if(time>=duration)time=0;playing=true;update(time,true);}
 function pause(){playing=false;update(time,true);}
 function reset(){enter();playing=false;time=0;lastFocus='';update(time,true);}
 function exit(){playing=false;active=false;time=0;visuals.visible=pins.visible=false;staticScene(true);onActivate(false);onChange(getSnapshot());}
 function seek(value){enter();time=clamp(Number(value),0,duration);if(time===duration)playing=false;update(time,true);}
 function tick(dt){if(!active)return;if(playing){time=Math.min(duration,time+dt*speed);if(time>=duration)playing=false;update(time);} }
 function setSpeed(value){speed=[.5,1,2,4,8,16,32].includes(Number(value))?Number(value):1;onChange(getSnapshot());}
 function setFollow(value){follow=!!value;lastFocus='';if(active)update(time,true);}
 return {play,pause,reset,exit,seek,tick,setSpeed,setFollow,getSnapshot,get active(){return active},get playing(){return playing},get clock(){return time},duration,patients,transfers,staging,vehiclePoseAt,beds,doctors,yellowStaff,yellowFurniture,emptyStretchers,evacuationTeam,updateEvacuationTeam,support,recoveryTeam,redRecoveries,events,triageComplete,transportStart,visuals,roots,paths:{exit:patients[0].exitPath},setStaticVisible:staticScene};
}
