"""Local-only GB preview with read-only access to a supplied cartridge folder."""
import argparse,json
from native_smk import Bridge
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse,parse_qs
ROOT=Path(__file__).resolve().parents[1]
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=8805)
    p.add_argument('--rom-dir',type=Path,default=Path('E:/Games/RetroPocketGames_EMUL8R/gb'))
    p.add_argument('--owner-firmware',action='store_true',help='Install the verified private SMK core from ignored build files')
    a=p.parse_args();folder=a.rom_dir.resolve();bridge=Bridge(owner=a.owner_firmware)
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'web'),**kwargs)
        def api_allowed(self,write=False):
            hosts=(f'127.0.0.1:{a.port}',f'localhost:{a.port}')
            origins=tuple('http://'+host for host in hosts)
            return self.headers.get('Host') in hosts and self.headers.get('Origin') in (origins if write else (None,*origins))
        def json_reply(self,value,status=200):
            data=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        def do_POST(self):
            if urlparse(self.path).path!='/api/smk/jobs':self.send_error(404);return
            if not self.api_allowed(write=True):self.send_error(403);return
            try:
                size=int(self.headers.get('Content-Length','0'))
                if not 0<size<=512 or self.headers.get('Content-Type','').split(';')[0]!='application/json':raise ValueError('Invalid request')
                request=json.loads(self.rfile.read(size))
                if set(request)!={'action','model'} or request['model']!='smk-pro':raise ValueError('Unsupported local device')
                self.json_reply({'id':bridge.start(request['action'])},202)
            except (ValueError,KeyError,TypeError) as exc:self.json_reply({'error':str(exc)},400)
        def do_GET(self):
            u=urlparse(self.path)
            if u.path.startswith('/api/smk/'):
                if not self.api_allowed():self.send_error(403);return
                if u.path=='/api/smk/capabilities':self.json_reply({'available':bridge.available,'models':['smk-pro'] if bridge.available else []});return
                if u.path.startswith('/api/smk/jobs/'):
                    job=bridge.status(u.path.removeprefix('/api/smk/jobs/'))
                    self.json_reply(job if job else {'error':'Unknown operation'},200 if job else 404);return
                self.send_error(404);return
            if u.path=='/api/roms':
                names=sorted(x.name for x in folder.iterdir() if x.is_file() and x.suffix.lower() in ('.gb','.zip')) if folder.is_dir() else []
                data=json.dumps(names).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            if u.path=='/api/rom':
                name=parse_qs(u.query).get('name',[''])[0];path=(folder/name).resolve()
                if path.parent!=folder or path.suffix.lower() not in ('.gb','.zip') or not path.is_file() or path.stat().st_size>16*1024*1024:
                    self.send_error(404);return
                data=path.read_bytes();self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
            super().do_GET()
    print(f'GameDude GB: http://localhost:{a.port}/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
if __name__=='__main__':main()
