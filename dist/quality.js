// Device-aware quality tiers. Geometry detail, materials and shadows are fixed at build time, so the tier is chosen before the scene is created.
// Choice order: ?quality= in the URL, then the viewer's saved choice, then automatic detection.
const profiles={
 low:{label:'منخفضة',antialias:false,pixelRatio:1,minPixelRatio:.5,shadowMap:1024,softShadows:false,ao:false,physical:false,clothNormals:false,hdr:false,sphere:[8,6],cylinder:6,capsule:[2,6],drillSphere:[8,6],drillCylinder:6,lite:true,leaves:60,anisotropy:2,crowdCell:1e6,staticCell:1e6,idleFps:20,maxFps:30},
 medium:{label:'متوسطة',antialias:true,pixelRatio:1.25,minPixelRatio:.6,shadowMap:2048,softShadows:true,ao:false,physical:false,clothNormals:true,hdr:true,sphere:[10,8],cylinder:8,capsule:[3,8],drillSphere:[12,8],drillCylinder:10,lite:false,leaves:120,anisotropy:4,crowdCell:40,staticCell:48,idleFps:30,maxFps:60},
 high:{label:'عالية',antialias:true,pixelRatio:2,minPixelRatio:.75,shadowMap:4096,softShadows:true,ao:true,physical:true,clothNormals:true,hdr:true,sphere:[14,10],cylinder:10,capsule:[4,12],drillSphere:[16,12],drillCylinder:14,lite:false,leaves:180,anisotropy:8,crowdCell:16,staticCell:24,idleFps:30,maxFps:60}
};
function readGpu(){
 try{const c=document.createElement('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return '';const ext=gl.getExtension('WEBGL_debug_renderer_info'),name=String((ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))||gl.getParameter(gl.RENDERER)||'');gl.getExtension('WEBGL_lose_context')?.loseContext();return name;}catch{return '';}
}
function detect(){
 const gpu=readGpu(),phone=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)||matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<900;
 const memory=navigator.deviceMemory||8,cores=navigator.hardwareConcurrency||4;
 let tier='medium',reason='افتراضي';
 if(/swiftshader|llvmpipe|software|basic render/i.test(gpu)){tier='low';reason='بدون كرت شاشة';}
 else if(phone){tier='low';reason='جوال';}
 else if(memory<=4||cores<=2){tier='low';reason='ذاكرة أو معالج محدود';}
 else if(/nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|apple m\d/i.test(gpu)){tier='high';reason='كرت شاشة مستقل';}
 else if(/intel|iris|uhd|hd graphics|radeon\(tm\)|vega|adreno|mali|powervr|apple gpu/i.test(gpu)){tier='medium';reason='كرت شاشة مدمج';}
 return {tier,gpu,reason};
}
const params=new URLSearchParams(location.search);let saved=null;try{saved=localStorage.getItem('uqudcm-quality');}catch{}
const requested=[params.get('quality'),saved].find(v=>v&&profiles[v]),detected=detect();
export const tier=requested||detected.tier;
export const choice=requested||'auto';
export const detectedTier=detected.tier,detectionReason=detected.reason,gpuName=detected.gpu;
export const Q=profiles[tier];
export const tierLabel=t=>profiles[t].label;
export function chooseQuality(value){try{if(value==='auto')localStorage.removeItem('uqudcm-quality');else localStorage.setItem('uqudcm-quality',value);}catch{}const url=new URL(location.href);url.searchParams.delete('quality');location.replace(url);}
