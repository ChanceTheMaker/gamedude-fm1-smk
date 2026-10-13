"""Stage only public GameDude assets; never copy the local ROM catalog or builds."""
import hashlib,json,shutil
from pathlib import Path
from diagnostic import make_rom

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
OUT=ROOT/'build/site'
files=['artwork/fm1.svg','artwork/smk-pro.svg','artwork/smk-elite.svg','artwork/gamedude-devices.svg','artwork/NOTICE.txt','index.html','studio.css','gamedude.js','gamedude-audio.js',
       'gamedude-logo.svg','branding.js','simulator.js','flash-ui.js',
       'rom-firmware.js','restore-firmware.js','zip.js','credits.html','gb.wasm','diagnostic.gb','build.json',
       'vendor/fm1pkg.js','vendor/fm1ota.js','firmware/fm1-template.fwsc',
       'firmware/template.json','firmware/GPL-3.0.txt','firmware/MIT-Peanut-GB.txt',
       'firmware/Apache-2.0.txt','firmware/NOTICE.txt']
assert (WEB/'diagnostic.gb').read_bytes()==make_rom(),'Unexpected diagnostic ROM'
metadata=json.loads((WEB/'firmware/template.json').read_text())
assert hashlib.sha256((WEB/'firmware/fm1-template.fwsc').read_bytes()).hexdigest()==metadata['sha256']
assert hashlib.sha256((WEB/'gb.wasm').read_bytes()).hexdigest()==json.loads((WEB/'build.json').read_text())['sha256']
if OUT.exists():
    unexpected=[p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file()
                and '.git' not in p.relative_to(OUT).parts and p.relative_to(OUT).as_posix() not in files+['.nojekyll']]
    assert not unexpected,'Unexpected output files: '+str(unexpected)
for name in files:
    target=OUT/name;target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(WEB/name,target)
(OUT/'.nojekyll').write_text('')
print(f'Staged {len(files)} public assets in {OUT}')
