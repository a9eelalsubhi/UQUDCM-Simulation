from pathlib import Path
import urllib.request,json,concurrent.futures,hashlib
root=Path(__file__).parent/'dist'
folder=root/'assets/lab';folder.mkdir(exist_ok=True)
def request(url):
 req=urllib.request.Request(url,headers={'User-Agent':'UQUDCM-Visual-Lab/1.0 (local architectural experiment)'})
 return urllib.request.urlopen(req,timeout=45).read()
sources=[];jobs=[]
for asset in ['asphalt_01','asphalt_02','concrete_wall_001','wood_table_001']:
 try:
  data=json.loads(request('https://api.polyhaven.com/files/'+asset))
  for channel,source_key in [('diff','Diffuse'),('nor_gl','nor_gl'),('rough','Rough')]:
   entries=data.get(source_key,{}).get('1k',{})
   chosen=entries.get('jpg') or entries.get('png')
   if not chosen:continue
   url=chosen['url'];target=folder/(asset+'_'+channel+Path(url).suffix)
   jobs.append((url,target));sources.append({'asset':asset,'channel':channel,'file':target.relative_to(root).as_posix(),'source':url,'page':'https://polyhaven.com/a/'+asset,'license':'CC0 1.0'})
 except Exception as e:print(asset+': '+str(e))
data=json.loads(request('https://api.polyhaven.com/files/quadrangle_sunny'))
entry=data['hdri']['1k']['hdr'];url=entry['url'];target=folder/'quadrangle_sunny_1k.hdr';jobs.append((url,target));sources.append({'asset':'quadrangle_sunny','file':target.relative_to(root).as_posix(),'source':url,'page':'https://polyhaven.com/a/quadrangle_sunny','license':'CC0 1.0'})
for name in ['loaders/HDRLoader.js','geometries/RoundedBoxGeometry.js']:
 url='https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/'+name
 target=root/'vendor'/Path(name).name;jobs.append((url,target));sources.append({'asset':Path(name).name,'file':target.relative_to(root).as_posix(),'source':url,'license':'MIT — Three.js'})
def save(job):
 url,target=job
 if not target.exists():target.write_bytes(request(url))
 return {'file':target.name,'bytes':target.stat().st_size}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
 for item in executor.map(save,jobs):print(json.dumps(item))
(folder/'sources.json').write_text(json.dumps(sources,indent=2),encoding='utf-8')
(root.parent/'ASSET-CREDITS.md').write_text('# Visual Lab asset credits\n\nPoly Haven textures and HDRI are CC0: https://polyhaven.com/license .\nThree.js modules are MIT: https://github.com/mrdoob/three.js/blob/r180/LICENSE .\n\n'+''.join('- '+s['file']+' — '+s['license']+' — '+s.get('page',s['source'])+'\n' for s in sources),encoding='utf-8')
