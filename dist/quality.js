// Device-aware quality tiers. Geometry detail, materials and shadows are fixed at build time, so the tier is chosen before the scene is created.
// Everyone starts on the light tier so the lab opens on phones, tablets and older laptops; viewers can raise it from the quality menu.
// Choice order: ?quality= in the URL, then the viewer's saved choice, then low.
const profiles={
 low:{label:'منخفضة',antialias:false,pixelRatio:1,minPixelRatio:.5,shadowMap:1024,softShadows:false,ao:false,physical:false,clothNormals:false,hdr:false,sphere:[8,6],cylinder:6,capsule:[2,6],drillSphere:[8,6],drillCylinder:6,lite:true,canvasScale:.5,leaves:60,anisotropy:2,crowdCell:1e6,staticCell:1e6,idleFps:20,maxFps:30},
 medium:{label:'متوسطة',antialias:true,pixelRatio:1.25,minPixelRatio:.6,shadowMap:2048,softShadows:true,ao:false,physical:false,clothNormals:true,hdr:true,sphere:[10,8],cylinder:8,capsule:[3,8],drillSphere:[12,8],drillCylinder:10,lite:false,canvasScale:1,leaves:120,anisotropy:4,crowdCell:40,staticCell:48,idleFps:30,maxFps:60},
 high:{label:'عالية',antialias:true,pixelRatio:2,minPixelRatio:.75,shadowMap:4096,softShadows:true,ao:true,physical:true,clothNormals:true,hdr:true,sphere:[14,10],cylinder:10,capsule:[4,12],drillSphere:[16,12],drillCylinder:14,lite:false,canvasScale:1,leaves:180,anisotropy:8,crowdCell:16,staticCell:24,idleFps:30,maxFps:60}
};
const params=new URLSearchParams(location.search);let saved=null;try{saved=localStorage.getItem('uqudcm-quality');}catch{}
const requested=[params.get('quality'),saved].find(v=>v&&profiles[v]);
export const tier=requested||'low';
export const Q=profiles[tier];
export const tierLabel=t=>profiles[t].label;
export function chooseQuality(value){try{if(value==='low')localStorage.removeItem('uqudcm-quality');else localStorage.setItem('uqudcm-quality',value);}catch{}const url=new URL(location.href);url.searchParams.delete('quality');location.replace(url);}
