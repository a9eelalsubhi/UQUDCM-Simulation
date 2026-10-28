from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import json,threading,webbrowser,urllib.request
root=Path(__file__).parent/'dist'
url='http://127.0.0.1:8877/'
handler=partial(SimpleHTTPRequestHandler,directory=str(root))
try:
 server=ThreadingHTTPServer(('127.0.0.1',8877),handler)
except OSError:
 try:
  identity=json.load(urllib.request.urlopen(url+'lab.identity.json',timeout=2))
  if identity.get('lab')!='uqudcm-visual-lab-2026-10-28':raise ValueError('Different server')
  webbrowser.open(url)
  print('Visual Lab is already running: '+url)
 except Exception:
  print('Port 8877 is used by another application. Close that application before starting the lab.')
  input('Press Enter to close.')
 raise SystemExit
thread=threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
print('UQUDCM Visual Lab: '+url)
print('This is a local experiment. The published site is unchanged.')
print('Keep this window open while exploring. Press Ctrl+C to stop.')
webbrowser.open(url)
try:thread.join()
except KeyboardInterrupt:server.shutdown()
finally:server.server_close()
