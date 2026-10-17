"""Read GameDude status, or explicitly select a library connection mode."""
import argparse,json,os,re,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'build/python-deps'),str(ROOT/'vendor/felucca/tools')]
import fm1_install as wire

def query(link,command):
 prefix=bytes([0xf0,0x7d,71,76,command]);link.drain();link.send(prefix+b'\xf7');end=time.monotonic()+3
 while time.monotonic()<end:
  p=link.read(.2)
  if p and p.startswith(prefix) and len(p)==36:return [sum(p[5+i*5+j]<<(7*j) for j in range(5)) for i in range(6)]
 raise RuntimeError('Status query timed out')

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--model',choices=['fm1','smk-pro'],required=True);p.add_argument('--mode',choices=['bluetooth','usb','menu']);a=p.parse_args()
 wire.PORT_RE=re.compile(r'fm-?1|felucca|sinco' if a.model=='fm1' else r'^(?!MIDIIN).*(?:smk|gamedude|nesynth|felucca|usb-midi)',re.I)
 d=wire.Updater(wire.MidoBackend()).wait_for(lambda i:i.text==('FM-1_938' if a.model=='fm1' else 'SMK-37_938'),12)
 if not d:raise RuntimeError('The selected GameDude device did not reply')
 if a.mode:
  d.link.send(bytes([0xf0,0x7d,71,76,{'bluetooth':1,'usb':4,'menu':3}[a.mode],0xf7]));print(json.dumps({'mode_requested':a.mode,'identity':d.id.text}),flush=True);os._exit(0)
 try:
  result={'identity':d.id.text,'mode':query(d.link,0),'library':query(d.link,2),'runtime':query(d.link,6)}
  print(json.dumps(result),flush=True)
 finally:d.link.close()
if __name__=='__main__':main()
