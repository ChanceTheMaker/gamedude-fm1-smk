"""Build GameDude's requested library manifest; ROM bytes remain outside the project."""
import argparse,hashlib,json,re,zipfile,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
GROUPS=[('Ms. Pac-Man',r'^Ms\. Pac-Man'),('Donkey Kong',r'^Donkey Kong \('),
 ('Space Invaders',r'^Space Invaders'),('Skate or Die',r'^Skate or Die'),('Batman',r'^Batman'),
 ('Tetris',r'^Tetris'),('Blades of Steel',r'^Blades of Steel'),('Baseball',r'^Baseball \('),
 ('Tennis',r'^Tennis \('),('Alleyway',r'^Alleyway'),
 ('Super Mario Land',r'Super Mario Land'),('Castlevania',r'^Castlevania'),
 ('Defender/Joust',r'^Defender-Joust'),('Klax',r'^Klax'),('Marble Madness',r'^Marble Madness'),
 ('Metroid',r'^Metroid'),('NBA Jam',r'^NBA Jam'),('R-Type',r'^R-Type'),
 ('Star Trek',r'^Star Trek'),('Star Wars',r'^Star Wars'),('Street Fighter',r'^Street Fighter'),
 ('TMNT',r'^Teenage Mutant Ninja Turtles'),('Wario',r'^Wario')]
def read_rom(path):
    if path.suffix.lower()=='.zip':
        with zipfile.ZipFile(path) as z:
            items=[i for i in z.infolist() if i.filename.lower().endswith('.gb') and not i.is_dir()]
            if len(items)!=1:raise ValueError('Archive must contain exactly one .gb')
            if items[0].file_size>8*1024*1024:raise ValueError('Cartridge exceeds 8 MiB')
            return z.read(items[0])
    return path.read_bytes()
def main():
    p=argparse.ArgumentParser();p.add_argument('--rom-dir',type=Path,default=Path('E:/Games/RetroPocketGames_EMUL8R/gb'));a=p.parse_args()
    rows=[];missing=[]
    for title,pattern in GROUPS:
        files=[f for f in sorted(a.rom_dir.iterdir()) if f.suffix.lower() in ('.gb','.zip') and re.search(pattern,f.name,re.I)]
        if not files:missing.append(title)
        for f in files:
            old=next((r for r in rows if r['file']==f.name),None)
            if old:old['groups'].append(title);continue
            row={'file':f.name,'title':re.sub(r'\.zip$|\.gb$','',f.name,flags=re.I),'groups':[title]}
            try:
                rom=read_rom(f)
                if len(rom)<0x150:raise ValueError('Cartridge too short')
                if rom[0x143]==0xc0:raise ValueError('GBC-only cartridge')
                if rom[0x148]>8 or len(rom)!=(32768<<rom[0x148]):raise ValueError('Cartridge length mismatch')
                if ((-sum(rom[0x134:0x14d])-25)&255)!=rom[0x14d]:raise ValueError('Invalid header checksum')
                row.update(status='ready',rom_bytes=len(rom),mapper=rom[0x147],sha256=hashlib.sha256(rom).hexdigest(),hardware_size_candidate=len(rom)<=524288)
            except (OSError,ValueError,zipfile.BadZipFile,zlib.error,RuntimeError) as e:
                row.update(status='unreadable',reason=str(e))
            rows.append(row)
    data={'project':'gamedude-smk','rom_directory':str(a.rom_dir),'games':rows,'missing_groups':missing,
          'note':'Archive/header checks only. Hardware loads one cartridge per build; maximum 512 KiB before total linker limit.'}
    (ROOT/'web/catalog.json').write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps({'matched':len(rows),'readable':sum(r['status']=='ready' for r in rows),'unreadable':sum(r['status']!='ready' for r in rows),'missing':missing}))
if __name__=='__main__':main()
