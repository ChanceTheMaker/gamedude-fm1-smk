"""Stage only public GameDude assets; never copy the local ROM catalog or builds."""
import hashlib,json,shutil
from pathlib import Path
from diagnostic import make_rom

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
OUT=ROOT/'build/site'
files=['hero.js','artwork/game-stack.png','artwork/game-trail.png','artwork/game-court.png','artwork/fm1.svg','artwork/smk-pro.svg','artwork/smk-elite.svg','artwork/gamedude-devices.svg','artwork/NOTICE.txt','index.html','studio.css','gamedude.js','gamedude-audio.js',
       'gamedude-logo.svg','branding.js','simulator.js','flash-ui.js',
       'rom-firmware.js','install-firmware.js','update-progress.js','restore-firmware.js','zip.js','credits.html','gb.wasm','diagnostic.gb','build.json',
       'vendor/fm1pkg.js','vendor/fm1ota.js','firmware/fm1-template.fwsc',
       'firmware/template.json','firmware/fm1-original.fwsc','firmware/original.json','firmware/GPL-3.0.txt','firmware/MIT-Peanut-GB.txt',
       'firmware/Apache-2.0.txt','firmware/NOTICE.txt']
files.extend(['device-loader.js','main-loader.js','device-loader.css','bluetooth-transfer.js','bluetooth-library.js','usb-library.js','gamedude-firmware.js','firmware-file.js','smk-format.js','smk-install.js','smk-firmware.js','native-smk.js','vendor/smk37-package.js','vendor/smk37-stock.js','firmware/gamedude.json','firmware/gamedude-fm1-938.bin','firmware/gamedude-smk37-938.bin'])
release=json.loads((WEB/'firmware/gamedude.json').read_text())
assert release['version']==938
for model,item in release['models'].items():
    assert item['file'] in files
    core=(WEB/item['file']).read_bytes()
    assert len(core)==item['bytes'] and hashlib.sha256(core).hexdigest()==item['sha256']
files.extend(['homebrew.js','homebrew/catalog.json','homebrew/NOTICE.txt'])
stock=json.loads((WEB/'homebrew/catalog.json').read_text())
assert stock['schema']==1
for game in stock['games']:
    name=game['file']
    assert name.endswith('.gb') and '/' not in name and '\\' not in name
    rom=(WEB/'homebrew'/name).read_bytes()
    assert len(rom)==game['bytes'] and 32768<=len(rom)<=524288
    assert rom[0x143]!=0xc0, 'GBC-only stock cartridge'
    assert hashlib.sha256(rom).hexdigest()==game['sha256'],name
    for field in ['file','license_file','source_file']:
        if field not in game: continue
        rel=game[field]
        assert not Path(rel).is_absolute() and '..' not in Path(rel).parts
        asset=WEB/'homebrew'/rel
        assert asset.resolve().is_relative_to((WEB/'homebrew').resolve()) and asset.is_file()
        if field=='source_file': assert hashlib.sha256(asset.read_bytes()).hexdigest()==game['source_sha256']
        elif field=='license_file': assert asset.stat().st_size>100
        if 'homebrew/'+rel not in files: files.append('homebrew/'+rel)
assert (WEB/'diagnostic.gb').read_bytes()==make_rom(),'Unexpected diagnostic ROM'
metadata=json.loads((WEB/'firmware/template.json').read_text())
assert hashlib.sha256((WEB/'firmware/fm1-template.fwsc').read_bytes()).hexdigest()==metadata['sha256']
original=json.loads((WEB/'firmware/original.json').read_text())
assert original['product']=='FM-1_015' and original['sha256']=='db1642b2b6fa5c2cccb11ffd13878068bb28601678d3644049f99dc40e7edb8a'
assert hashlib.sha256((WEB/'firmware/fm1-original.fwsc').read_bytes()).hexdigest()==original['sha256']
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
