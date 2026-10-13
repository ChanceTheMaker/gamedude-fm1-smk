"""Local-only GB preview with read-only access to a supplied cartridge folder."""
import argparse,json
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse,parse_qs
ROOT=Path(__file__).resolve().parents[1]
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=8805)
    p.add_argument('--rom-dir',type=Path,default=Path('E:/Games/RetroPocketGames_EMUL8R/gb'))
    a=p.parse_args();folder=a.rom_dir.resolve()
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'web'),**kwargs)
        def do_GET(self):
            u=urlparse(self.path)
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
