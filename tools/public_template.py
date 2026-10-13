"""Generate a public firmware template containing only our original diagnostic."""
import hashlib,json,shutil,subprocess,sys
from pathlib import Path
from diagnostic import make_rom
ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,'tools/build.py','fm1','--rom-capacity','524288'],cwd=ROOT,check=True)
subprocess.run([sys.executable,'tools/package_fm1.py'],cwd=ROOT,check=True)
m=json.loads((ROOT/'build/fm1/manifest.json').read_text());p=json.loads((ROOT/'build/fm1/trial.json').read_text())
app=(ROOT/'build/fm1/gb-fm1-NOT-FOR-INSTALL.bin').read_bytes();offset=m['cartridge_offset'];diag=make_rom()
assert app[offset:offset+len(diag)]==diag
assert app[offset+len(diag):offset+m['cartridge_capacity']]==b'\xff'*(m['cartridge_capacity']-len(diag))
out=ROOT/'web/firmware';out.mkdir(parents=True,exist_ok=True)
shutil.copy2(ROOT/'build/fm1'/p['package'],out/'fm1-template.fwsc')
meta={'product':p['product'],'package':'fm1-template.fwsc','sha256':p['sha256'],
      'cartridge_offset':offset,'cartridge_capacity':m['cartridge_capacity'],
      'app_bytes':len(app),'diagnostic_sha256':hashlib.sha256(diag).hexdigest(),
      'notice':'Original diagnostic only. User ROMs are inserted locally in the browser.',
      'hardware_status':'FM-1 trial; SMK37 is not enabled for flashing.'}
(out/'template.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps(meta,indent=2))
