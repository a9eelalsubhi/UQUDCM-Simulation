const params=new URLSearchParams(location.search);
async function attach(){const f=window.facilityDebug;if(!f||document.getElementById('loading')){requestAnimationFrame(attach);return;}
 if(params.get('time')){f.switchSimulation(true);f.drill.seek(+params.get('time'));f.drill.setFollow(false);}f.overview();f.orbit.dispatchEvent({type:'start'});f.orbit.maxPolarAngle=Math.PI;const roof=document.getElementById('roof-toggle');roof.checked=params.get('roof')==='1';roof.dispatchEvent(new Event('change'));
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 try{const eye=JSON.parse(params.get('eye')),target=JSON.parse(params.get('target'));if(eye?.length===3&&target?.length===3){f.camera.position.set(...eye);f.orbit.target.set(...target);f.orbit.update();}}catch{}window.baselineReady=true;
 const badge=document.createElement('a');badge.href='../index.html';badge.textContent='النسخة الأساسية للمقارنة · العودة للتجارب ↗';badge.style.cssText='position:fixed;z-index:9;top:102px;right:310px;background:#fff9e6;border:1px solid #dbcda5;color:#796338;padding:10px 14px;border-radius:5px;font:11px Tahoma;text-decoration:none';if(innerWidth<800){badge.style.top='128px';badge.style.right='12px';badge.style.fontSize='9px';}document.body.append(badge);
}attach();
