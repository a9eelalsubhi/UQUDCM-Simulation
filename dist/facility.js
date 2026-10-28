import * as THREE from 'three';
import {labSurface,surfaceUV,foliage,humanTorso} from './lab-visuals.js';
import {ambulanceLoop,stadiumOutline,lapPoints,pathLength} from './traffic.js';
export const roomData=[
 {id:'A1/A2',zone:'A',x:-39.75,color:'#df292d'},{id:'A3/A4',zone:'A',x:-33.25,color:'#df292d'},
 {id:'B1/B2',zone:'B',x:-26.75,color:'#168d54'},{id:'B3/B4',zone:'B',x:-20.25,color:'#168d54'},
 {id:'C1/C2',zone:'C',x:20.25,color:'#1976d2'},{id:'C3/C4',zone:'C',x:26.75,color:'#1976d2'},
 {id:'D1/D2',zone:'D',x:33.25,color:'#f0b900'},{id:'D3/D4',zone:'D',x:39.75,color:'#f0b900'}
];
export const siteLayout={
 fireSite:{x:51,z:2,w:16,d:20,exitX:59,exitZ:2,attached:true},ambulanceLoop,bounds:{x0:-78,x1:122,z0:-29,z1:125},court:{x:22,z:31,w:150,d:66},
 black:{x:69,z:-8.5,w:7.5,d:6},green:{x:27,z:22,w:25,d:17},red:{x:69,z:22,w:7.5,d:11},yellow:{x:79,z:22,w:9,d:12},
 greenArrival:{x:15,z:22,yaw:-Math.PI/2},roomZ:8,doorZ:4,
 tents:[17.5,23.8,30.2,36.5].flatMap((x,i)=>[{id:i+1,x,z:16.75,yaw:0,patients:2},{id:i+5,x,z:27.25,yaw:Math.PI,patients:1}]),
 treesAtEnd:[{x:44,z:14},{x:44,z:22},{x:44,z:31}]
};
export function buildFacility(scene){
 const world=new THREE.Group(),roofs=new THREE.Group(),smoke=new THREE.Group();scene.add(world,roofs,smoke);
 const patientVisuals=[],curtains=[],bedsByCase={};
 const floorHeight=.35;
 function groundHeight(x,z){if(Math.abs(x)<=10&&z>=-25&&z<=4.8||Math.abs(x)>10&&Math.abs(x)<=43&&z>=-8&&z<=12)return floorHeight;if(Math.abs(x)<=2.4&&z>4.8&&z<=13)return floorHeight*(13-z)/8.2;if(x>43&&x<=59&&z>=-8&&z<=12)return floorHeight;if(x>59&&x<=62&&z>=.5&&z<=3.5)return floorHeight*(62-x)/3;return 0;}
 const colliders=[],stats={rooms:8,beds:0,ambulances:0,civilDefense:0,buses:0};
 const mats=new Map(),texCache=new Map(),peopleGeometry=new Map(),actors=[];let contactMaterial;
 const register=(node,id,role,area,station)=>{if(actors.some(a=>a.id===id))throw new Error('Duplicate actor '+id);node.userData.actorId=id;actors.push({node,id,role,area,station});return node;};

 const mat=(color,metal=0,rough=.65)=>{const key=color+','+metal+','+rough;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough}));return mats.get(key)};
 // Deterministic, locally generated surface maps keep the walkthrough self contained.
 let rngSeed=187;const random=()=>{rngSeed=(rngSeed*1664525+1013904223)>>>0;return rngSeed/4294967296};
 function surface(kind,color,rx=1,rz=1){
  const upgraded=labSurface(kind,color);if(upgraded)return upgraded;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++){const v=random()>.5?255:0;c.fillStyle='rgba('+v+','+v+','+v+','+(kind==='asphalt'?.15:.045)+')';c.fillRect(random()*512,random()*512,kind==='asphalt'?1.5:2,1.5)}
  if(kind==='tile'){c.strokeStyle='#acb0ac';c.lineWidth=1.3;for(let i=0;i<=512;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke()}}
  if(kind==='concrete'){c.strokeStyle='rgba(93,75,54,.28)';c.lineWidth=2;c.strokeRect(2,2,508,508)}
  if(kind==='wood'){for(let i=0;i<300;i++){c.strokeStyle='rgba(23,10,4,'+(random()*.13)+')';c.beginPath();c.moveTo(random()*512,0);c.bezierCurveTo(random()*512,130,random()*512,300,random()*512,512);c.stroke()}}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,rz);t.anisotropy=8;
  const m=new THREE.MeshStandardMaterial({map:t,roughness:kind==='wood'?.48:.88,bumpMap:t,bumpScale:kind==='asphalt'?.025:.006});return m;
 }
 const white=mat('#f4f5f1',0,.5),beige=surface('concrete','#cfbfa4',3,2),wood=surface('wood','#5a3e2c'),steel=mat('#bac7ca',.82,.24),dark=mat('#334b50'),rubber=mat('#23282c',0,.9),red=mat('#b53935');
 const floor=surface('tile','#e1e3df',8,4),lobbyFloor=surface('tile','#e1e3df',6,9),asphalt=surface('asphalt','#48535b',36,20),paving=surface('tile','#bcaf98',7,4),terrain=surface('asphalt','#c9c6b0',22,18);
 const fabric=surface('fabric','#6d7981');
 function roundedBox(x,y,z,w,h,d,m,parent=world,r=.05){
  r=Math.min(r,w/4,h/4,d/4);const shape=new THREE.Shape(),a=w/2-r,b=h/2-r;
  shape.moveTo(-a,-b);shape.lineTo(a,-b);shape.lineTo(a,b);shape.lineTo(-a,b);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:4});geo.translate(0,0,-d/2+r);geo.userData.instanceKey=['rounded',w,h,d,r].join(',');return mesh(geo,typeof m==='string'?mat(m):m,x,y,z,parent);
 }
 function noShadow(o){o.castShadow=false;o.receiveShadow=false;return o}
 function contact(x,z,w,d,parent=world){
  if(!contactMaterial){const c=document.createElement('canvas');c.width=c.height=64;const q=c.getContext('2d'),grad=q.createRadialGradient(32,32,1,32,32,32);grad.addColorStop(0,'rgba(11,25,27,.25)');grad.addColorStop(1,'rgba(11,25,27,0)');q.fillStyle=grad;q.fillRect(0,0,64,64);contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});}
  const o=mesh(new THREE.PlaneGeometry(w,d),contactMaterial,x,.11,z,parent);o.rotation.x=-Math.PI/2;noShadow(o);
 }
 function mesh(g,m,x,y,z,parent=world){
  surfaceUV(g,m);
  if(parent.userData.isPerson){const key=g.userData.instanceKey||(g.type+JSON.stringify(g.parameters));const previous=peopleGeometry.get(key);if(previous){g.dispose();g=previous;}else {g.userData.shared=true;peopleGeometry.set(key,g);}}
  const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!(g.type==='BoxGeometry'&&g.parameters.height<.09);o.receiveShadow=true;parent.add(o);return o;
 }
 function box(x,y,z,w,h,d,m,parent=world){return mesh(new THREE.BoxGeometry(w,h,d),typeof m==='string'?mat(m):m,x,y,z,parent)}
 function cyl(x,y,z,r,h,m,parent=world){return mesh(new THREE.CylinderGeometry(r,r,h,20),typeof m==='string'?mat(m):m,x,y,z,parent)}
 function sphere(x,y,z,r,m,parent=world){return mesh(new THREE.SphereGeometry(r,20,14),typeof m==='string'?mat(m):m,x,y,z,parent)}
 function rod(a,b,r,m,parent=world){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const o=cyl(...av.clone().add(bv).multiplyScalar(.5).toArray(),r,delta.length(),m,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o}
 function block(x,z,w,d){colliders.push({minX:x-w/2-.22,maxX:x+w/2+.22,minZ:z-d/2-.22,maxZ:z+d/2+.22})}
 function wall(x,z,w,d,h=3.4,outer=false){box(x,h/2,z,w,h,d,outer?beige:mat('#edece3'));block(x,z,w,d);box(x,.16,z,w,.22,d+.025,mat('#c5c9bd'));}
 function label(text,x,y,z,w=2.5,h=.6,bg='#26483d',fg='#ffffff',parent=world,rot=0){
  const key=text+bg+fg;let texture=texCache.get(key);
  if(!texture){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,256);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('\n');ctx.font='bold '+(lines.length>1?65:85)+'px Arial, Tahoma';lines.forEach((line,i)=>ctx.fillText(line,512,128+(i-(lines.length-1)/2)*85,960));texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texCache.set(key,texture)}
  const o=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),x,y,z,parent);o.rotation.y=rot;noShadow(o);return o;
 }
 function floorLabel(text,x,z,w=4,h=1,bg='#e5e5da'){const o=label(text,x,.075,z,w,h,bg,'#ecede7');o.rotation.x=-Math.PI/2;return o}
 function line(points,color,width=.1){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);const o=box((a[0]+b[0])/2,.065,(a[1]+b[1])/2,width,.005,len,color);noShadow(o);o.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);}}
 function chair(x,z,rot=0,parent=world){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;parent.add(g);
  roundedBox(0,.48,0,.58,.12,.54,fabric,g);const back=roundedBox(0,.79,-.22,.58,.57,.09,fabric,g);back.rotation.x=-.09;
  for(const a of [-.25,.25]){rod([a,.09,.21],[a,.5,-.2],.018,steel,g);rod([a,.08,-.23],[a,.46,.2],.018,steel,g);rod([a,.5,-.15],[a,.68,-.15],.015,steel,g);roundedBox(a,.68,.02,.06,.05,.35,rubber,g,.02)}return g;
 }
 function clock(x,y,z){const o=cyl(x,y,z,.25,.04,white);o.rotation.x=Math.PI/2;const rim=mesh(new THREE.TorusGeometry(.25,.014,6,24),dark,x,y,z+.024);rod([x,y,z+.035],[x+.13,y+.07,z+.035],.009,dark);rod([x,y,z+.035],[x-.02,y+.18,z+.035],.009,dark);for(let i=0;i<12;i++)sphere(x+Math.sin(i*Math.PI/6)*.21,y+Math.cos(i*Math.PI/6)*.21,z+.04,.009,dark)}
 function monitor(x,y,z,parent=world){box(x,y,z,.48,.33,.05,dark,parent);label('78  ~~~~\n98   120/80',x,y,z+.028,.44,.27,'#101e24','#55d798',parent);box(x,y-.3,z,.04,.3,.04,steel,parent)}
 function crashCart(x,z,parent=world){const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);box(0,.52,0,.62,.86,.5,red,g);for(let j=0;j<5;j++){box(0,.24+j*.14,.256,.56,.018,.018,white,g);box(0,.3+j*.14,.267,.15,.028,.025,steel,g)}box(0,.99,0,.7,.055,.57,steel,g);for(const a of [-.25,.25])for(const b of [-.19,.19])sphere(a,.07,b,.075,rubber,g);box(0,1.17,0,.4,.24,.13,dark,g);label('AED',0,1.18,.07,.27,.15,'#d7eae2','#274b39',g);box(.22,1.05,.13,.12,.09,.13,'#e6c954',g);return g}
 function iv(x,z,parent=world){cyl(x,1.1,z,.018,2.15,steel,parent);for(let j=0;j<4;j++){const t=j*Math.PI/2;rod([x,.12,z],[x+Math.cos(t)*.32,.09,z+Math.sin(t)*.32],.02,steel,parent)}rod([x-.25,2.15,z],[x+.25,2.15,z],.015,steel,parent);box(x-.15,1.88,z,.18,.36,.07,mat('#c0dbea',.1,.2),parent);rod([x-.15,1.7,z],[x-.22,.95,z+.2],.005,white,parent)}
 function bed(x,z,caseId){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);stats.beds++;register(g,'patient-'+caseId,'patient','clinical',caseId);
  box(0,.59,0,1.22,.12,2.45,steel,g);roundedBox(0,.73,0,1.2,.25,2.4,white,g,.09);contact(0,0,2.1,3.5,g);
  for(const a of [-.49,.49])for(const b of [-.91,.91]){box(a,.33,b,.06,.5,.06,steel,g);sphere(a,.12,b,.12,rubber,g)}
  for(const b of [-1.24,1.24]){box(0,1,b,1.26,.46,.09,white,g);box(0,1.19,b,.6,.045,.095,steel,g)}
  for(const a of [-.62,.62]){for(const b of [-.7,.7])box(a,.95,b,.035,.4,.035,steel,g);box(a,1.12,0,.035,.035,1.4,steel,g)}
  roundedBox(0,.91,-.88,.8,.14,.4,'#e6e9df',g,.07);
  const patientNode=new THREE.Group();patientNode.userData.simulationPatient=true;g.add(patientNode);patientVisuals.push(patientNode);bedsByCase[caseId]={group:g,patientNode};
  const skin=mat('#c6a185');const head=sphere(0,1.09,-.68,.15,skin,patientNode);head.scale.set(.86,.92,1.12);for(const a of [-1,1]){const eye=rod([a*.038,1.225,-.70],[a*.074,1.218,-.70],.004,dark,patientNode);noShadow(eye);}sphere(0,1.235,-.65,.015,skin,patientNode);rod([-.025,1.218,-.59],[.025,1.218,-.59],.003,mat('#8a6858'),patientNode);
  let o=mesh(new THREE.CapsuleGeometry(.19,.38,6,14),skin,0,.99,-.17,patientNode);o.rotation.x=Math.PI/2;
  for(const a of [-1,1]){rod([a*.25,1,-.38],[a*.31,.96,.14],.065,skin,patientNode);rod([a*.12,.98,.22],[a*.14,.94,.84],.075,skin,patientNode)}
  roundedBox(0,1.025,.4,.88,.065,.76,mat('#c0d3da'),g,.025);for(const side of [-1,1])rod([side*.52,.64,-.9],[side*.52,.64,.9],.012,dark,patientNode);
  block(x,z,1.25,2.5);
 }
 function supplies(x,z){box(x,.7,z,.68,.035,.55,steel);box(x,.28,z,.68,.025,.55,steel);for(const a of [-.29,.29])for(const b of [-.23,.23])box(x+a,.4,z+b,.025,.65,.025,steel);box(x-.17,.76,z,.21,.09,.26,'#d7e1e7');box(x+.16,.76,z,.23,.1,.22,'#f3e2c6');cyl(x,.81,z+.16,.05,.17,'#c1dfe7');label('IV · AIRWAY',x,.92,z+.29,.66,.2,'#edf4ef','#244f45')}
 let peopleCount=0;
 function person(x,z,coat=true,arm='#d44a43',angle=0,config={}){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;g.userData.isPerson=true;world.add(g);if(!config.id)throw new Error('Unassigned person');register(g,config.id,config.role,config.area,config.station);const female=peopleCount++%3!==0,skin=mat(['#c79d7e','#b2876b','#d4b196'][peopleCount%3],0,.65),uniform=mat(config.color||(coat?'#f1f2ee':'#285367'),0,.85),pants=mat('#263841'),hair=mat('#262321');
  function ellipsoid(x,y,z,rx,ry,rz,m){const o=sphere(x,y,z,1,m,g);o.scale.set(rx,ry,rz);return o}
  function limb(a,b,ra,rb,m){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=mesh(new THREE.CylinderGeometry(rb,ra,v.length(),16),m,...av.clone().add(bv).multiplyScalar(.5).toArray(),g);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());ellipsoid(...a,ra,ra,ra,m);ellipsoid(...b,rb,rb,rb,m)}
  for(const side of [-1,1]){const x=side*.115;if(config.floorSeated){limb([x,.16,-.04],[x,.14,.35],.105,.082,pants);limb([x,.14,.35],[x,.12,.73],.082,.065,pants);ellipsoid(x,.10,.80,.095,.065,.18,rubber);}else if(config.seated){limb([x,.59,-.04],[x,.54,.35],.105,.082,pants);limb([x,.54,.35],[x,.13,.39],.082,.065,pants);ellipsoid(x,.085,.46,.095,.065,.18,rubber);}else{limb([x,.87,0],[x,.48,.01],.105,.082,pants);limb([x,.48,.01],[x,.13,0],.082,.065,pants);ellipsoid(x,.085,.07,.095,.065,.18,rubber);}}
  const upperStart=g.children.length;

  ellipsoid(0,.84,0,.23,.17,.14,pants);
  const body=mesh(humanTorso(),uniform,0,1.18,0,g);
  if(coat){const skirt=mesh(new THREE.CylinderGeometry(.215,.28,.43,24),uniform,0,.93,0,g);skirt.scale.z=.63;roundedBox(0,1.2,.152,.085,.45,.025,'#244655',g,.015);for(const side of [-1,1]){const lapel=roundedBox(side*.075,1.36,.172,.09,.24,.018,white,g,.009);lapel.rotation.z=side*.25;roundedBox(side*.14,1.03,.177,.12,.13,.012,'#e4e7e3',g,.006);}for(let i=0;i<3;i++)noShadow(sphere(.038,1.22-i*.12,.182,.009,dark,g));}
  cyl(0,1.51,0,.068,.15,skin,g);ellipsoid(0,1.68,0,.133,.18,.115,skin);ellipsoid(-.136,1.67,0,.02,.037,.024,skin);ellipsoid(.136,1.67,0,.02,.037,.024,skin);
  if(female){ellipsoid(0,1.73,-.042,.156,.19,.126,hair);ellipsoid(0,1.57,-.046,.173,.16,.106,hair);ellipsoid(0,1.675,.077,.11,.145,.062,skin);}else{const h=mesh(new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI*.48),hair,0,1.682,-.004,g);h.scale.set(.142,.188,.125);}
  for(const side of [-1,1]){ellipsoid(side*.044,1.7,.119,.023,.012,.01,white);ellipsoid(side*.044,1.7,.128,.008,.009,.006,hair);const brow=rod([side*.023,1.728,.12],[side*.063,1.73,.111],.004,hair,g);noShadow(brow);}
  ellipsoid(0,1.66,.129,.016,.028,.014,skin);rod([-.026,1.615,.116],[.026,1.615,.116],.003,mat('#875e4e'),g);
  for(const side of [-1,1]){limb([side*.205,1.39,0],[side*.28,1.13,.022],.089,.072,uniform);limb([side*.28,1.13,.022],[side*.3,.94,.085],.072,.052,uniform);ellipsoid(side*.3,.885,.09,.045,.07,.04,skin);}
  for(const side of [-1,1])for(let j=0;j<4;j++){const finger=mesh(new THREE.CapsuleGeometry(.008,.035,3,6),skin,side*.3+(j-1.5)*.014,.817,.092,g);finger.rotation.x=-.12;}
  const band=mesh(new THREE.CylinderGeometry(.076,.076,.075,20),mat(arm),.279,1.15,.026,g);band.rotation.z=.16;
  if(config.role!=='patient'&&config.role!=='extra'){const badge=roundedBox(-.105,1.31,.177,.08,.11,.009,'#f3f6f3',g,.004);noShadow(badge);noShadow(box(-.105,1.345,.184,.06,.018,.008,config.role==='student'?'#8467aa':config.role==='paramedic'?'#d0a443':'#32969a',g));
  const steth=mesh(new THREE.TorusGeometry(.085,.007,5,20,Math.PI*1.7),rubber,0,1.33,.181,g);steth.rotation.z=.47;noShadow(steth);sphere(.084,1.23,.19,.023,steel,g);}g.children.filter(o=>o.isMesh&&o.position.y>=1.48).forEach(o=>{o.position.x*=.82;o.position.z*=.82;o.position.y=1.65+(o.position.y-1.65)*.82;o.scale.multiplyScalar(.82);});if(config.seated)g.children.slice(upperStart).forEach(o=>o.position.y-=config.floorSeated?.66:.27);contact(0,0,.8,.8,g);return g;
 }
 // Compact college court: a modest extension on the right, parking repurposed for green triage.
 box(22,-.23,45,210,.3,172,terrain);const court=siteLayout.court;box(court.x,-.10,court.z,court.w,.12,court.d,asphalt);
 for(const x of [-53,97])box(x,.01,20.5,.7,.1,45,paving);
 box(0,-.05+floorHeight,-10,20,.13,30,lobbyFloor);box(-26.5,-.05+floorHeight,2,33,.13,20,floor);box(26.5,-.05+floorHeight,2,33,.13,20,floor);
 for(const [x,z,w,d] of [[0,-10,20,30],[-26.5,2,33,20],[26.5,2,33,20]])box(x,.10,z,w,.3,d,beige);
 box(0,-.015,16,86,.04,7,paving);box(0,.015,8.5,20,.04,9,paving);
 const buildingStart=world.children.length;
 for(const side of [-1,1]){
  if(side===1){wall(43,-3.5,.25,9,3.8,true);wall(43,7.5,.25,9,3.8,true)}else wall(-43,2,.25,20,3.8,true);
  wall(side*26.5,-8,33,.25,3.8,true);wall(side*10,-15.5,.25,19,3.8,true);
  wall(side*30.1,12,25.8,.25,3.8,true);
  // Exterior panel seams are painted into the concrete texture, avoiding coplanar shadow strips.
  for(let x=20;x<43;x+=6.5){const window=box(side*x,2.1,-8.14,4.5,1.7,.06,mat('#64818a',.3,.25));window.castShadow=false;box(side*x,2.1,-8.18,.05,1.7,.07,steel);box(side*x,2.1,-8.18,4.5,.05,.07,steel)}
  box(side*5.7,3.1,4.2,5.3,6.2,.7,beige);
  box(side*26.5,3.91,2,33,.16,20,white,roofs);
 }
 wall(0,-25,20,.25,3.8,true);wall(-9,-21.5,.2,7);wall(9,-21.5,.2,7);
 wall(-5.1,-18,7.8,.16);wall(5.1,-18,7.8,.16);box(0,.01,-21.5,17.8,.04,6.8,'#507861');
 label('المصلى / PRAYER',0,2.7,-17.88,2.7,.55);for(let x=-7;x<8;x+=1.2)for(let z=-24;z<-18.5;z+=1.6)line([[x-.45,z],[x-.45,z+1.25],[x+.45,z+1.25],[x+.45,z]],'#aec1a0',.025);
 box(0,3.85,-10.5,20,.16,29,white,roofs);
 // Arched main entrance, frame opening remains walkable
 const shape=new THREE.Shape();shape.moveTo(-3.3,0);shape.lineTo(-3.3,4);shape.quadraticCurveTo(-2.3,5.8,0,7);shape.quadraticCurveTo(2.3,5.8,3.3,4);shape.lineTo(3.3,0);shape.lineTo(2.95,0);shape.lineTo(2.95,3.8);shape.quadraticCurveTo(2,5.4,0,6.6);shape.quadraticCurveTo(-2,5.4,-2.95,3.8);shape.lineTo(-2.95,0);shape.closePath();
 const arch=mesh(new THREE.ExtrudeGeometry(shape,{depth:.35,bevelEnabled:false}),white,0,0,4.25);
 label('EMERGENCY / الطوارئ',0,3.6,4.66,5.8,.8,'#9d302f');
 box(0,5.7,4.22,5.8,.06,.1,steel);
 for(const a of [-1,1])box(a*2.85,1.55,4.25,.07,3.1,.08,steel);
 // Clinical wings. Two rooms for each named zone, sixteen beds.
 roomData.forEach((r,i)=>{
  const x=r.x,first=world.children.length,colliderStart=colliders.length;box(x,.027,-4,6.3,.012,7.8,new THREE.MeshBasicMaterial({color:new THREE.Color(r.color).lerp(new THREE.Color('#ffffff'),.35),toneMapped:false}));box(x,.041,-.65,5.9,.008,.5,new THREE.MeshBasicMaterial({color:r.color,toneMapped:false}));box(x,1.7,-7.83,6.3,3.4,.025,white);
  wall(x-3.25,-4,.16,8);if(i===0||i===4)wall(x+3.25,-4,.16,8);
  wall(x-2.08,0,2.3,.15);wall(x+2.08,0,2.3,.15);
  box(x,2.9,0,1.88,1.02,.14,white);label('Zone '+r.zone+'  ·  '+r.id,x,2.9,.085,3,.48,r.color);box(x,1.24,-7.7,6.1,.4,.03,r.color);
  box(x,1.2,-7.78,5.5,.28,.1,white);
  for(const [bedIndex,off] of [-1.6,1.6].entries()){
   const station=r.id.split('/')[bedIndex],side=off<0?-1:1;bed(x+off,-4.95,station);crashCart(x+off-1,-6.5);iv(x+off+.75,-5.8);monitor(x+off,1.9,-7.56);
   for(let j=0;j<4;j++)box(x+off-.3+j*.2,1.21,-7.7,.07,.08,.04,j===0?'#31a263':j===1?'#c6a33c':'#8f9fa5');
   label(station+' · 1 + 1 + 5',x+off,2.32,-7.54,1.8,.28,'#3d574c');
   person(x+side*.65,-5.1,true,'#278b99',-side*Math.PI/2,{id:'doctor-'+station,role:'doctor',area:'clinical',station});
   [[.72,-3.9,-side*Math.PI/2],[2.4,-3,Math.PI],[1.5,-2.4,Math.PI],[.65,-1.75,Math.PI],[2.6,-4.65,side*Math.PI/2]].forEach(([u,v,a],j)=>person(x+side*u,v,true,'#8467aa',a,{id:'student-'+station+'-'+(j+1),role:'student',area:'clinical',station,color:'#e5edf4'}));

  }
  rod([x,2.85,-7.4],[x,2.85,-2.1],.015,steel);
  const cg=new THREE.PlaneGeometry(4.6,2.2,24,1),pos=cg.attributes.position;for(let j=0;j<pos.count;j++)pos.setZ(j,Math.sin(pos.getX(j)*12)*.065);cg.computeVertexNormals();
  const curtain=mesh(cg,new THREE.MeshStandardMaterial({color:'#fffdf6',side:THREE.DoubleSide,roughness:.95}),x,1.6,-4.95);curtain.rotation.y=Math.PI/2;curtains.push({id:r.id,node:curtain});
  clock(x+2.35,2.7,-7.71);supplies(x-2.55,-1.55);
  const objects=world.children.slice(first),roomGroup=new THREE.Group();roomGroup.position.set(x,0,8);roomGroup.rotation.y=Math.PI;world.add(roomGroup);
  objects.forEach(o=>{world.remove(o);o.position.x-=x;o.position.z+=4;roomGroup.add(o)});
  for(let j=colliderStart;j<colliders.length;j++){const b=colliders[j],old={...b};b.minX=2*x-old.maxX;b.maxX=2*x-old.minX;b.minZ=4-old.maxZ;b.maxZ=4-old.minZ;}
  r.z=8;r.doorZ=4;r.facing='-Z';

 });
 // Large briefing rooms adjoining the central hall
 for(const s of [-1,1]){
  wall(s*17,-4,.16,8);wall(s*14.45,0,3.65,.15);box(s*13.5,2.9,0,2,1,.15,white);
  label('قاعة كبيرة / BRIEFING',s*13.5,2.9,.09,3,.5);
  for(let z=-6.5;z<-1.5;z+=1.4)for(let x=11;x<16;x+=1.2)chair(s*x,z,Math.PI);
  label('UQUDCM',s*13.5,2.2,-7.76,3,.75,'#eff3e7','#37634d');
 }
 // Central dark wood horseshoe reception
 const desk=new THREE.Group();world.add(desk);desk.position.set(0,0,-12.2);
 for(let i=0;i<18;i++){const a=Math.PI*i/17;const x=Math.cos(a)*3.45,z=Math.sin(a)*2.7;let b=box(x,.62,z,.75,1.2,.8,wood,desk);b.rotation.y=-a;let top=box(x,1.27,z,.86,.09,.96,mat('#695140'),desk);top.rotation.y=-a;}
 block(0,-9.7,5.2,.9);block(-3,-11.5,.8,3);block(3,-11.5,.8,3);
 for(const x of [-2,0,2]){monitor(x,1.56,.9,desk);chair(x,-.2,0,desk)}
 label('UQUDCM',0,2.9,-17.7,5,1.1,'#e6e7da','#285544');
 label('الاستقبال والتسجيل / RECEPTION',0,.8,-8.98,4,.6,'#4a3425');
 person(-1.5,-12,true,'#278b99',0,{id:'intake-1',role:'intake',area:'reception'});person(1.5,-12,true,'#278b99',0,{id:'intake-2',role:'intake',area:'reception'});
 for(const side of [-1,1]){
  person(side*4.15,-3.0,true,'#278b99',side===1?Math.PI/2:-Math.PI/2,{id:'vitals-'+(side===1?2:1),role:'vitals',area:'reception'});
  // Five occupied seats along each outer side, facing the clear central aisle.
  for(let i=0;i<5;i++){
   const x=side*8.6,z=-1.4-i*1.5,facing=-side*Math.PI/2;
   chair(x,z,facing);
   person(x,z,false,'#d2b377',facing,{id:'extra-'+((side===1?5:0)+i+1),role:'extra',area:'reception',seated:true,color:i%2?'#6e858d':'#978b77'});
  }
 }

 box(8.65,1.2,-11.2,1.4,2.4,.72,mat('#1e3439'));label('VENDING',8.65,2.1,-10.83,1.25,.3);
 for(let j=0;j<4;j++)for(let k=0;k<4;k++)box(8.14+j*.27,.7+k*.27,-10.82,.15,.18,.04,['#d49159','#e6ba59','#559b78','#8a9dc4'][j]);
 box(-8.3,.9,-11.7,.55,1.8,.55,dark);label('خذ رقمك\nTAKE A TICKET',-8.3,1.3,-11.41,.5,.5,'#e9efe5','#284d3d');
 label('A012    B007\nC014    D003',6.8,2.6,-8.2,2.5,1,'#122e35','#e3d169');
 box(-6.6,.6,-14.2,3.5,1.2,1.5,wood);label('UQU Cafe',-6.6,1.8,-13.43,3,.6,'#4a3425');box(-7,1.4,-14.2,.6,.42,.5,steel);cyl(-5.5,1.34,-14,.16,.15,white);

 for(const x of [-7,-5]){cyl(x,.7,-16.2,.65,.08,wood);chair(x-.8,-16.2,-Math.PI/2);chair(x+.8,-16.2,Math.PI/2)}
 // Four broad high contrast routes match the clinical zones.
 for(const r of roomData){const lane={A:.65,B:1.35,C:2.65,D:3.35}[r.zone],entryX={A:-.75,B:-.25,C:.25,D:.75}[r.zone];line([[entryX,4.5],[entryX,lane],[r.x,lane],[r.x,4.65]],new THREE.MeshBasicMaterial({color:r.color,toneMapped:false}),.22);}
 for(const [zone,x,z] of [['A',-31, .65],['B',-18,1.35],['C',18,2.65],['D',31,3.35]])floorLabel('ZONE '+zone,x,z,2.4,.43,roomData.find(r=>r.zone===zone).color);
 world.children.slice(buildingStart).forEach(o=>o.position.y+=floorHeight);
 // A continuous ramp connects the driveway to the raised hospital floor.
 function ramp(x,z,w,d,rise,side=false){const g=new THREE.BoxGeometry(w,rise,d),a=g.attributes.position;for(let i=0;i<a.count;i++){const px=a.getX(i),py=a.getY(i),pz=a.getZ(i),h=side?(w/2-px)/w*rise:(d/2-pz)/d*rise;a.setY(i,py>0?h:0);}g.computeVertexNormals();const o=mesh(g,paving,x,.01,z);o.userData.ramp=true;return o;}
 ramp(0,8.9,4.8,8.2,floorHeight);ramp(60.5,2,3,3,floorHeight,true);
 for(const x of [-2.45,2.45]){rod([x,1.22,4.8],[x,.87,13],.035,steel);for(const z of [4.8,7.5,10.2,13])rod([x,groundHeight(0,z),z],[x,groundHeight(0,z)+.86,z],.025,steel);block(x,8.9,.07,8.2);}
 for(let z=5;z<12.5;z+=.55){const o=box(0,groundHeight(0,z)+.018,z,4.65,.007,.035,'#d8d0b9');noShadow(o);}
 label('PATIENT ACCESS / مدخل المرضى',0,.9,12.9,3,.4,'#2b5754');
 label('EXIT / المخرج',42.8,2.75,2,2,.5,'#316d4d',undefined,world,Math.PI/2);
 // Wheelchair, stretcher staging at the entrance
 function wheelchair(x,z){const g=new THREE.Group();world.add(g);g.position.set(x,0,z);chair(0,0,0,g);for(const s of [-1,1]){let wheel=mesh(new THREE.TorusGeometry(.32,.033,6,18),rubber,s*.4,.35,0,g);wheel.rotation.y=Math.PI/2;for(let i=0;i<4;i++)rod([s*.4,.35,0],[s*.4,.35+Math.cos(i*Math.PI/2)*.31,Math.sin(i*Math.PI/2)*.31],.006,steel,g)}box(0,.28,.43,.5,.04,.2,steel,g)}
 wheelchair(4.4,6.2);wheelchair(5.6,6.2);
 box(-5.1,.75,6.2,.9,.15,2.1,white);for(const a of [-.38,.38])for(const b of [-.8,.8]){box(-5.1+a,.42,6.2+b,.04,.6,.04,steel);sphere(-5.1+a,.13,6.2+b,.1,rubber)}
 // Green occupies existing parking next to the college. Elongated red/yellow mats are at its tree-lined end.
 const triages=[
  {id:'black',...siteLayout.black,c:'#303c40',title:'BLACK / DECEASED\nالوفيات — أسود'},
  {id:'red',...siteLayout.red,c:'#d32730',title:'RED (TRIAGE)\nالفرز الأحمر'},
  {id:'yellow',...siteLayout.yellow,c:'#e7b600',title:'YELLOW (TRIAGE)\nالفرز الأصفر'},
  {id:'green',...siteLayout.green,c:'#168b50',title:'GREEN (TRIAGE)\nالفرز الأخضر'}
 ];
 box(46,.005,8,6,.035,18,paving);box(74,.005,22,24,.035,16,paving);
 function cone(x,z,color){box(x,.045,z,.45,.09,.45,rubber);mesh(new THREE.ConeGeometry(.18,.65,12),mat(color),x,.4,z);cyl(x,.47,z,.095,.1,white)}
 triages.forEach(t=>{
  const matColor=t.id==='black'?mat(t.c):new THREE.MeshBasicMaterial({color:t.c,toneMapped:false});
  if(t.id==='green'){for(const side of [-1,1])box(t.x,.052,t.z+side*5.25,t.w,.02,6.5,matColor)}else box(t.x,.052,t.z,t.w,.02,t.d,matColor);
  for(const a of [-t.w/2+.15,t.w/2-.15])for(const b of [-t.d/2+.15,t.d/2-.15])cone(t.x+a,t.z+b,t.c);
  const signX=t.id==='green'?t.x-t.w/2-1:t.x,signZ=t.id==='green'?t.z+3:t.z+t.d/2+.6;
  label(t.title,signX,1.4,signZ,t.id==='green'?2.7:2.4,.95,t.c,undefined,world,t.id==='green'?-Math.PI/2:0);
  cyl(signX,.7,signZ,.03,1.3,dark);


 });
 // Two facing rows of tents occupy parking bays, with an aisle parallel to the college facade.
 // The aisle uses the underlying asphalt, with no coplanar floor layer.
 function tent(t){
  const g=new THREE.Group();g.position.set(t.x,0,t.z);g.rotation.y=t.yaw;world.add(g);
  for(const a of [-2.5,2.5])for(const b of [-2.5,2.5])cyl(a,1.45,b,.035,2.9,white,g);
  let roof=mesh(new THREE.ConeGeometry(3.8,1.7,4),white,0,3.5,0,g);roof.rotation.y=Math.PI/4;
  box(0,2.2,-2.48,5,.5,.025,white,g);box(0,1.3,-2.48,5,2.6,.025,'#eeeadd',g);for(const side of [-1,1])box(side*2.48,1.3,0,.025,2.6,5,'#eeeadd',g);
  label('GREEN (TRIAGE)\nالفرز الأخضر',0,2.5,2.53,4,.65,'#168b50',undefined,g);
  label('بسطة '+t.id+' · '+(t.patients===2?'حالتان':'حالة واحدة')+' · 4 طلاب طب',0,2.02,2.53,4,.34,'#edf4e9','#315746',g);
  box(0,.7,0,2,.075,1,white,g);for(const a of [-.8,.8])for(const b of [-.35,.35])box(a,.35,b,.04,.7,.04,steel,g);
  function member(u,v,angle,config){const o=person(0,0,false,'#3d996a',angle,config);world.remove(o);o.position.set(u,0,v);g.add(o);return o;}
  for(let j=0;j<t.patients;j++){const u=t.patients===2?(j===0?-.65:.65):0;member(u,-.85,0,{id:'out-patient-'+t.id+'-'+(j+1),role:'patient',area:'outdoor',station:'F'+t.id,seated:true,floorSeated:true,color:'#739eac'});}
  [[-1.75,.45,Math.PI/2],[1.75,.45,-Math.PI/2],[-1.1,1.65,Math.PI],[1.1,1.65,Math.PI]].forEach(([u,v,a],j)=>member(u,v,a,{id:'paramedic-'+t.id+'-'+(j+1),role:'paramedic',area:'outdoor',station:'F'+t.id,color:'#24596d'}));
 }
 siteLayout.tents.forEach(tent);
 function deceased(x,z,id){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);register(g,id,'deceased','triage');g.userData.simulationPatient=true;patientVisuals.push(g);
  roundedBox(0,.085,0,.95,.06,2.1,'#e2e5e2',g,.02);const body=mesh(new THREE.CapsuleGeometry(.25,1.3,6,18),mat('#e5e5df'),0,.27,0,g);body.rotation.x=Math.PI/2;body.scale.z=.65;
  rod([0,.445,-.8],[0,.445,.8],.006,mat('#87938b'),g);label('محاكاة وفاة',0,.48,1.15,1.15,.26,'#35403d',undefined,g);block(x,z,1,2.1);colliders.at(-1).staticPatient=true;
 }
 deceased(62.2,-1.8,'deceased-1');deceased(65,-3.6,'deceased-2');
 // Original fire exit remains connected to triage at the end of the parking aisle.
 for(const z of [1,3])box(43.05,1.55,z,.14,3.1,.1,steel);
 box(43.05,3.13,2,.14,.12,2.1,steel);
 label('EXIT / المخرج',43.22,3.45,2,2.4,.55,'#316d4d',undefined,world,Math.PI/2);
 line([[59.3,2],[62,2],[63.5,5.5],[68,8]],'#d58d38',.18);
 // Empty parking bays and compact access lane. Vehicles are removed from this version.
 for(let x=-46;x<69;x+=6)noShadow(box(x,-.015,37,2.8,.006,.12,white));
 for(const x of [-49,71])for(let z=18;z<37;z+=6)noShadow(box(x,-.015,z,.12,.006,2.8,white));
 for(let x=15;x<=40;x+=6.25)for(const z of [16.75,27.25])noShadow(box(x,-.015,z,.075,.005,6.5,white));
 for(const z of [13.5,30.5])noShadow(box(27,-.015,z,25,.005,.075,white));
 // Fire annex is physically joined to the clinical wing at x=43.
 const fire=siteLayout.fireSite,annexStart=world.children.length;
 box(51,-.05,2,16,.13,20,lobbyFloor);
 wall(51,-8,16,.2,4,true);wall(51,12,16,.2,4,true);
 wall(59,-3.75,.2,8.5,4,true);wall(59,7.75,.2,8.5,4,true);box(59,3.55,2,.2,.9,3,beige);
 box(51,4.05,2,16,.16,20,beige);box(51,4.45,-7.7,16,.7,.16,beige);
 for(const z of [-4.5,8.5]){box(59.14,1.85,z,.035,1.4,1.8,mat('#537986',.35,.2));for(const dz of [-.85,0,.85])box(59.18,1.85,z+dz,.06,1.5,.04,white);box(59.19,1.85,z,.06,.04,1.85,white);}
 for(const z of [.5,3.5])box(59.05,1.5,z,.12,3,.07,steel);
 label('موقع الحريق · المشرحة\nجناح متصل بمبنى الكلية',59.25,3.5,2,8.3,.95,'#7d4439',undefined,world,Math.PI/2);
 label('SIMULATION / محاكاة',59.23,1.25,7,2.2,.4,'#525954',undefined,world,Math.PI/2);
 world.children.slice(annexStart).forEach(o=>o.position.y+=floorHeight);
 for(const z of [.15,3.85])for(const x of [59.7,61.5])cone(x,z,'#ed9c40');
 for(const z of [.15,3.85]){box(60.6,.9,z,1.8,.13,.015,'#e7c64b');for(let x=59.7;x<61.5;x+=.4){const o=box(x,.9,z,.2,.14,.02,rubber);o.rotation.z=.35;}}
 const smokeTexCanvas=document.createElement('canvas');smokeTexCanvas.width=smokeTexCanvas.height=256;const ctx=smokeTexCanvas.getContext('2d');
 for(let i=0;i<55;i++){const x=60+random()*136,y=60+random()*136,r=22+random()*44,grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,'rgba(54,57,59,.17)');grad.addColorStop(.5,'rgba(69,73,75,.08)');grad.addColorStop(1,'rgba(90,94,95,0)');ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2)}
 const st=new THREE.CanvasTexture(smokeTexCanvas);
 for(let i=0;i<30;i++){const o=new THREE.Sprite(new THREE.SpriteMaterial({map:st,transparent:true,depthWrite:false,opacity:.75,color:'#9da3a7'}));o.userData.seed=i/30;o.userData.drift=Math.sin(i*2.4);smoke.add(o)}
 const flames=new THREE.Group();smoke.add(flames);flames.userData.fire=true;flames.position.set(59.1,.7,2);
 const fireCanvas=document.createElement('canvas');fireCanvas.width=128;fireCanvas.height=256;const fc=fireCanvas.getContext('2d');
 for(let i=0;i<14;i++){const x=30+random()*68,y=115+random()*70,r=15+random()*25,gr=fc.createRadialGradient(x,y,0,x,y,r*2.8);gr.addColorStop(0,'rgba(255,244,149,.9)');gr.addColorStop(.15,'rgba(255,166,37,.7)');gr.addColorStop(.4,'rgba(230,77,14,.35)');gr.addColorStop(1,'rgba(240,90,15,0)');fc.fillStyle=gr;fc.fillRect(x-r*3,y-r*3,r*6,r*6)}
 const ft=new THREE.CanvasTexture(fireCanvas);for(let i=0;i<4;i++){const o=new THREE.Sprite(new THREE.SpriteMaterial({map:ft,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));o.position.set(-.06-i*.07,.6,Math.sin(i)*.45);o.scale.set(.9,2.1,1);flames.add(o)}
 const fireLight=new THREE.PointLight('#ff9c43',5,6,2);fireLight.position.set(59.2,1.3,2);flames.userData.light=fireLight;scene.add(fireLight);
 label('FIELD TRIAGE / الفرز الميداني',67,2.3,12.4,5.8,.8,'#314e4c');for(const x of [64.5,69.5])cyl(x,1,12.36,.035,2,steel);
 function tree(x,z,scale=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);world.add(g);cyl(0,.28,0,1,.56,paving,g);cyl(0,.57,0,.87,.035,mat('#655e4e'),g);const bark=mat('#64523c',0,.97);mesh(new THREE.CylinderGeometry(.07,.145,3.5,14),bark,0,1.8,0,g);const rim=mesh(new THREE.TorusGeometry(.94,.055,6,36),paving,0,.57,0,g);rim.rotation.x=Math.PI/2;const clusters=[];
  for(let i=0;i<11;i++){const a=i*2.4,r=.9+random()*.9,cy=3.1+random()*1.2,x=Math.cos(a)*r,z=Math.sin(a)*r;rod([0,2,0],[x,cy,z],.034,bark,g);clusters.push({x,y:cy,z});}foliage(g,random,clusters);contact(0,0,5,5,g);block(x,z,1.3*scale,1.3*scale);}

 for(const [x,z,scale] of [[-49,20,1],[-14,31,1],[44,14,1.15],[44,22,1.1],[44,31,1.15],[89,34,1]])tree(x,z,scale);
 function solarLight(x,z){cyl(x,3.15,z,.065,6.3,steel);rod([x,5.5,z],[x+.85,5.5,z],.045,steel);const panel=box(x,6.25,z,1.35,.06,1.8,'#263b4a');panel.rotation.z=.32;box(x+.8,5.48,z,.75,.08,.32,'#fff6d6');for(let i=0;i<5;i++)noShadow(box(x-.5+i*.22,6.30,z,.018,.006,1.7,'#698c9c'));}
 for(const [x,z] of [[-36,27],[12,31.5],[33,32.5],[46,13],[88,31]])solarLight(x,z);


 // A full oval circuit in front of the existing college court.
 function ribbon(innerRadius,outerRadius,height,material,portalGaps=false){
  const inner=stadiumOutline(innerRadius),outer=stadiumOutline(outerRadius),positions=[],uv=[];
  const add=p=>{positions.push(p.x,height,p.z);uv.push((p.x+78)/200,(p.z+29)/154);};
  for(let i=1;i<inner.length;i++){
   const middle=(outer[i-1].x+outer[i].x)/2,top=(outer[i-1].z+outer[i].z)/2;
   if(portalGaps&&top<64&&middle>-53&&middle<97)continue;
   for(const p of [outer[i-1],inner[i-1],outer[i],inner[i-1],inner[i],outer[i]])add(p);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const o=mesh(geometry,material,0,0,0);o.castShadow=false;return o;
 }
 const roadStart=world.children.length;
 const edge=ambulanceLoop.radius+ambulanceLoop.width/2,inside=ambulanceLoop.radius-ambulanceLoop.width/2;
 ribbon(inside,edge,.026,asphalt);ribbon(edge,edge+.45,.085,white,true);ribbon(inside-.45,inside,.085,white);
 const outline=stadiumOutline(inside-.45),landPositions=[];
 for(let i=1;i<outline.length;i++)for(const p of [{x:22,z:86},outline[i],outline[i-1]])landPositions.push(p.x,-.018,p.z);
 const landGeometry=new THREE.BufferGeometry();landGeometry.setAttribute('position',new THREE.Float32BufferAttribute(landPositions,3));landGeometry.computeVertexNormals();mesh(landGeometry,mat('#8c9d7e',0,.95),0,0,0).castShadow=false;
 // The frontage and circuit share one continuous asphalt court; no divider.
 const centerline=stadiumOutline();let travelled=0;
 for(let i=1;i<centerline.length;i++){const a=centerline[i-1],b=centerline[i],length=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<length;d+=1){if((travelled+d)%9>=4)continue;const u=(d+.5)/length,o=box(a.x+(b.x-a.x)*u,.052,a.z+(b.z-a.z)*u,.14,.006,Math.min(1.05,length-d),'#e4dfc3');o.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);noShadow(o);}travelled+=length;}
 function arrow(x,z,yaw){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;world.add(g);box(0,.053,-.5,.19,.008,1.5,'#f0eee4',g);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.058,1,.65,.058,.05,-.65,.058,.05],3));geometry.computeVertexNormals();noShadow(mesh(geometry,white,0,0,0,g));}
 for(const [x,z,yaw] of [[112,86,Math.PI],[65,114,Math.PI/2],[-10,114,Math.PI/2],[-68,86,0],[-28,58,-Math.PI/2],[60,36,-Math.PI/2],[25,36,-Math.PI/2],[-10,41,0]])arrow(x,z,yaw);
 for(const x of [-25,-3,19,41,63])tree(x,86,.95);
 floorLabel('AMBULANCE LOOP / مسار الإسعاف',22,84,25,2,'#637758');
 arrow(ambulanceLoop.entryX,51,0);arrow(ambulanceLoop.exitX,51,Math.PI);
 for(let i=0;i<8;i++){const x=56-i*12;for(const z of [108.6,111.4])noShadow(box(x,.052,z,8.2,.006,.08,white));for(const a of [-4.1,4.1])noShadow(box(x+a,.052,110,.08,.006,2.8,white));}
 floorLabel('انتظار الإسعافات / AMBULANCE QUEUE',15,105.8,31,1.3,'#637758');
 world.children.slice(roadStart).forEach(o=>o.userData.ambulanceRoad=true);
 stats.ambulanceLoopLength=Math.round(pathLength(lapPoints()));

 roofs.children.forEach(o=>o.position.y+=floorHeight);
 const led=new THREE.MeshStandardMaterial({color:'#fafbf2',emissive:'#fff9ef',emissiveIntensity:.6});for(const r of roomData)box(r.x,3.72+floorHeight,8,1.4,.045,.65,led,roofs);for(const x of [-6,0,6])for(const z of [-3,-9,-15])box(x,3.72+floorHeight,z,1.3,.045,.65,led,roofs);roofs.visible=false;
 world.updateMatrixWorld(true);
 const populationActors=actors.map(a=>{const v=a.node.getWorldPosition(new THREE.Vector3());return {id:a.id,role:a.role,area:a.area,station:a.station??null,x:v.x,z:v.z};});
 const roleCounts={},areaCounts={};populationActors.forEach(a=>{roleCounts[a.role]=(roleCounts[a.role]||0)+1;areaCounts[a.area]=(areaCounts[a.area]||0)+1;});
 const population={total:populationActors.length,primaryPatients:(roleCounts.patient||0)+(roleCounts.deceased||0),participants:populationActors.length-(roleCounts.patient||0)-(roleCounts.deceased||0),roles:roleCounts,areas:areaCounts,actors:populationActors};
 if(population.total!==172||population.primaryPatients!==30||population.participants!==142)throw new Error('Population does not match the approved distribution');
 const crowd=new THREE.Group();scene.add(crowd);const buckets=new Map();
 actors.filter(a=>a.node.userData.isPerson).forEach(a=>a.node.traverse(o=>{if(!o.isMesh)return;const v=new THREE.Vector3().setFromMatrixPosition(o.matrixWorld),key=o.geometry.uuid+':'+o.material.uuid+':'+o.castShadow+':'+o.receiveShadow+':'+Math.floor(v.x/16)+':'+Math.floor(v.z/16);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({mesh:o,actorId:a.id});}));
 for(const items of buckets.values()){const first=items[0].mesh,instanced=new THREE.InstancedMesh(first.geometry,first.material,items.length);instanced.castShadow=first.castShadow;instanced.receiveShadow=first.receiveShadow;instanced.userData.actorIds=items.map(i=>i.actorId);items.forEach((item,i)=>instanced.setMatrixAt(i,item.mesh.matrixWorld));instanced.instanceMatrix.needsUpdate=true;instanced.computeBoundingBox();instanced.computeBoundingSphere();crowd.add(instanced);}
 actors.filter(a=>a.node.userData.isPerson).forEach(a=>a.node.parent.remove(a.node));
 stats.outdoorStations=siteLayout.tents.length;stats.people=population.total;
 return {world,roofs,smoke,crowd,population,groundHeight,floorHeight,patientVisuals,curtains,bedsByCase,colliders,stats,roomData,triages,siteLayout,fireLight,exit:{x:59,z:2}};
}


