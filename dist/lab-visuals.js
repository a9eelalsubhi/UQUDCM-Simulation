import * as THREE from 'three';
import {HDRLoader} from './vendor/HDRLoader.js';

const loader=new THREE.TextureLoader(),surfaces=new Map(),assetPromises=[];
function texture(name,color=false){let resolve;const promise=new Promise(r=>resolve=r);assetPromises.push(promise);const t=loader.load('assets/lab/'+name,()=>resolve(true),undefined,()=>resolve(false));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;return t;}
function paintSurface(kind,color){
 const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');q.fillStyle=color;q.fillRect(0,0,512,512);let seed=421;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<16000;i++){const v=rand()>.5?255:0;q.fillStyle=`rgba(${v},${v},${v},${kind==='sand'?.08:.025})`;q.fillRect(rand()*512,rand()*512,1,1);}
 const height=document.createElement('canvas');height.width=height.height=512;const h=height.getContext('2d');h.fillStyle='#eee';h.fillRect(0,0,512,512);
 if(kind==='tile'||kind==='paving'){const step=kind==='tile'?128:64;q.strokeStyle=kind==='tile'?'#b8bbb7':'#a99f8e';q.lineWidth=kind==='tile'?1.4:2;h.strokeStyle='#333';h.lineWidth=3;for(let y=0;y<=512;y+=step){q.beginPath();q.moveTo(0,y);q.lineTo(512,y);q.stroke();h.beginPath();h.moveTo(0,y);h.lineTo(512,y);h.stroke();for(let x=(kind==='paving'&&y/step%2?step:0);x<=512;x+=kind==='paving'?step*2:step){q.beginPath();q.moveTo(x,y);q.lineTo(x,y+step);q.stroke();h.beginPath();h.moveTo(x,y);h.lineTo(x,y+step);h.stroke();}}}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;const bump=new THREE.CanvasTexture(height);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;
 const m=new THREE.MeshStandardMaterial({map,roughness:kind==='tile'?.38:.94,bumpMap:bump,bumpScale:kind==='tile'?.003:.008});m.userData.labTextureSize=kind==='tile'?2.4:kind==='paving'?2.4:5;return m;
}
export function labSurface(kind,color){
 const key=kind+color;if(surfaces.has(key))return surfaces.get(key);let m=null;
 if(kind==='asphalt'&&color==='#48535b')m=new THREE.MeshStandardMaterial({map:texture('asphalt_01_diff.jpg',true),normalMap:texture('asphalt_01_nor_gl.jpg'),roughnessMap:texture('asphalt_01_rough.jpg'),normalScale:new THREE.Vector2(.35,.35),roughness:.95,color:'#d2d3d2'});
 if(kind==='concrete')m=new THREE.MeshStandardMaterial({map:texture('concrete_wall_001_diff.jpg',true),normalMap:texture('concrete_wall_001_nor_gl.jpg'),roughnessMap:texture('concrete_wall_001_rough.jpg'),normalScale:new THREE.Vector2(.16,.16),roughness:.9,color:new THREE.Color().setRGB(1.25,1.10,.90)});
 if(kind==='wood')m=new THREE.MeshPhysicalMaterial({map:texture('wood_table_001_diff.jpg',true),normalMap:texture('wood_table_001_nor_gl.jpg'),roughnessMap:texture('wood_table_001_rough.jpg'),normalScale:new THREE.Vector2(.2,.2),roughness:.6,color:'#a78c75',clearcoat:.18,clearcoatRoughness:.45});
 if(kind==='tile')m=paintSurface(color==='#bcaf98'?'paving':'tile',color==='#bcaf98'?'#c6bba6':'#e1e3e0');
 if(kind==='asphalt'&&color!=='#48535b')m=paintSurface('sand','#b9b19b');
 if(m){m.name='Lab / '+key;m.userData.labTextureSize??=kind==='wood'?1.6:kind==='concrete'?3.2:3;surfaces.set(key,m);}return m;
}
export function surfaceUV(g,m){const size=m?.userData.labTextureSize;if(!size||g.userData.labUV)return;const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;if(!p||!n||!uv)return;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.setXY(i,(ny>=nx&&ny>=nz?x:nx>=nz?z:x)/size,(ny>=nx&&ny>=nz?z:y)/size);}g.userData.labUV=true;}

let leafMap;
export function foliage(parent,random,clusters){
 if(!leafMap){const c=document.createElement('canvas');c.width=64;c.height=128;const q=c.getContext('2d');q.fillStyle='#fff';q.beginPath();q.moveTo(32,2);q.bezierCurveTo(63,38,59,93,32,126);q.bezierCurveTo(5,93,1,38,32,2);q.fill();leafMap=new THREE.CanvasTexture(c);}
 const mat=new THREE.MeshStandardMaterial({color:'#ffffff',map:leafMap,alphaTest:.45,side:THREE.DoubleSide,roughness:.9});
 const count=clusters.length*180,leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(.13,.28),mat,count),temp=new THREE.Object3D(),color=new THREE.Color();let index=0;
 for(const c of clusters)for(let i=0;i<180;i++){const u=random()*2-1,a=random()*Math.PI*2,r=Math.cbrt(random())*.97,s=Math.sqrt(1-u*u);temp.position.set(c.x+Math.cos(a)*s*r,c.y+u*r*.75,c.z+Math.sin(a)*s*r);temp.rotation.set(random()*Math.PI,random()*Math.PI*2,random()*Math.PI);temp.scale.setScalar(.65+random()*.75);temp.updateMatrix();leaves.setMatrixAt(index,temp.matrix);color.setHSL(.21+random()*.06,.19+random()*.18,.2+random()*.18);leaves.setColorAt(index++,color);}
 leaves.castShadow=true;leaves.receiveShadow=true;leaves.instanceMatrix.needsUpdate=true;parent.add(leaves);return leaves;
}

export function humanTorso(){
 const profile=[[-.35,.20,.125],[-.22,.19,.125],[-.10,.175,.12],[.05,.215,.145],[.18,.235,.13],[.25,.20,.10],[.29,.09,.065]],segments=24,positions=[],indices=[],uv=[];
 for(let j=0;j<profile.length;j++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,[y,x,z]=profile[j];positions.push(Math.cos(a)*x,y,Math.sin(a)*z);uv.push(i/segments,j/(profile.length-1));if(j<profile.length-1&&i<segments){const n=j*(segments+1)+i;indices.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export async function startVisualLab({scene,renderer,sun,fill,facility,skyTex}){
 document.documentElement.dataset.visualLab='true';document.body.classList.add('visual-lab');
 const approved=document.getElementById('share-btn');approved.textContent='الموقع المعتمد ↗';approved.onclick=()=>window.open('https://uqudcm-hajj-walkthrough.doctors-and-hci.chatgpt.site/','_blank','noopener');
 const ambient=scene.children.find(o=>o.isHemisphereLight);ambient.intensity=.55;sun.intensity=3.1;sun.color.set('#fff3dd');sun.shadow.normalBias=.035;sun.shadow.bias=-.00005;fill.intensity=.22;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.05;scene.environmentIntensity=.6;
 const pmrem=new THREE.PMREMGenerator(renderer);let environment=null;
 const hdrPromise=new Promise(resolve=>new HDRLoader().load('assets/lab/quadrangle_sunny_1k.hdr',hdr=>{hdr.mapping=THREE.EquirectangularReflectionMapping;environment=pmrem.fromEquirectangular(hdr).texture;scene.environment=environment;hdr.dispose();pmrem.dispose();renderer.shadowMap.needsUpdate=true;resolve(true)},undefined,()=>resolve(false)));
 const launcher=document.createElement('div');launcher.id='lab-toolbar';launcher.innerHTML='<span class="lab-dot"></span><b>مختبر الواقعية <small>01</small></b><button id="lab-open">الضبط البصري</button><button id="lab-compare">قارن بالأصل ↗</button>';document.body.append(launcher);
 const dialog=document.createElement('dialog');dialog.id='visual-lab-settings';dialog.innerHTML='<div class="dialog-head"><div><small>LOCAL VISUAL LAB · EXPERIMENT 01</small><h2>تجربة الواقعية</h2></div><button class="close" aria-label="إغلاق">×</button></div><div class="lab-settings"><p class="lab-summary">نفس المخطط والمحاكاة، بخامات مصوّرة وإضاءة بيئية وتفاصيل أدق. هذه نسخة تجارب مستقلة.</p><div class="lab-status"><i></i><span id="lab-assets">تجهيز الخامات والإضاءة…</span></div><label>الإضاءة<select id="lab-light"><option value="day">نهار طبيعي</option><option value="warm">شمس دافئة</option><option value="clinical">إضاءة محايدة</option></select></label><label>سطوع المشهد<input id="lab-exposure" type="range" min="0.7" max="1.5" step="0.05" value="1.05"><output id="lab-exposure-value">1.05</output></label><h3>لقطات للمراجعة</h3><div id="lab-views"><button data-lab-view="entry">مدخل المستشفى</button><button data-lab-view="reception">الاستقبال</button><button data-lab-view="room">الغرف والأسرّة</button><button data-lab-view="green">الخيام والأشجار</button><button data-lab-view="ambulance">المركبات</button></div><button id="lab-baseline" class="primary">افتح النسخة الأساسية للمقارنة ↗</button><p class="lab-footnote">المقارنة تفتح نسخة محفوظة عند زاوية الكاميرا نفسها. الموقع المنشور لم يتغير.</p><p class="lab-footnote">هذه أول تجربة للخامات والنماذج الإجرائية؛ الشخصيات ما زالت تحتاج نماذج بشرية ممسوحة أو مصممة بدقة أعلى للوصول لواقعية أكبر.</p></div>';document.body.append(dialog);
 document.getElementById('lab-open').onclick=()=>dialog.showModal();dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 document.getElementById('lab-exposure').oninput=e=>{renderer.toneMappingExposure=+e.target.value;document.getElementById('lab-exposure-value').value=(+e.target.value).toFixed(2)};
 document.getElementById('lab-light').onchange=e=>{const mode=e.target.value;sun.color.set(mode==='warm'?'#ffd8a0':mode==='clinical'?'#f3f7ff':'#fff3dd');sun.position.set(...(mode==='warm'?[-55,38,35]:[-40,72,38]));sun.intensity=mode==='warm'?3.3:3.1;ambient.intensity=mode==='clinical'?.75:.55;renderer.shadowMap.needsUpdate=true};
 const views={entry:{eye:[20,9,28],target:[0,2,4]},reception:{eye:[12,11,1],target:[0,1,-8]},room:{eye:[-25,7,0],target:[-33,1,8]},green:{eye:[10,4,22],target:[34,1.6,22]},ambulance:{eye:[89,7,41],target:[77,1,33]}};
 for(const button of dialog.querySelectorAll('[data-lab-view]'))button.onclick=async()=>{const f=window.facilityDebug,v=views[button.dataset.labView];f.overview();f.orbit.dispatchEvent({type:'start'});if(button.dataset.labView==='ambulance'){f.switchSimulation(true);f.drill.seek(f.drill.transfers[0].prepare+3);f.drill.setFollow(false);}dialog.close();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));f.camera.position.set(...v.eye);f.orbit.target.set(...v.target);f.orbit.update()};
 function compare(){const f=window.facilityDebug;if(f.drill.active)f.drill.pause();const target=f.mode==='walk'?f.camera.position.clone().addScaledVector(f.camera.getWorldDirection(new THREE.Vector3()),8):f.orbit.target;const params=new URLSearchParams({eye:JSON.stringify(f.camera.position.toArray()),target:JSON.stringify(target.toArray()),time:f.drill.active?f.drill.clock:'',view:f.mode,roof:document.getElementById('roof-toggle').checked?'1':'0'});window.open('baseline/index.html?'+params,'_blank','noopener');}
 document.getElementById('lab-compare').onclick=compare;document.getElementById('lab-baseline').onclick=compare;
 const all=await Promise.all([...assetPromises,hdrPromise]),ok=all.every(Boolean);document.getElementById('lab-assets').textContent=ok?'الخامات والإضاءة جاهزة · نسخة تجريبية مستقلة':'بعض الملفات لم تُحمّل؛ أعد تحميل الصفحة';window.visualLab={ready:true,assetsLoaded:ok,materialCount:surfaces.size,environmentLoaded:!!environment,compare};
}
