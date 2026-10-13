"""Build and verify a private FM-1 trial package. Never accesses a device."""
import argparse,hashlib,json,re,struct,subprocess,sys
from pathlib import Path
from build import DEFAULT_TC,DEFAULT_ZIG,ROOT
sys.path.insert(0,str(ROOT/'vendor/felucca/tools'))
import fm1pkg_make as pkg
import fm1_install as wire
import lz4blk

SDK_HASHES={
 'uboot.boot':'4e3b4c220dc96641cb5a723f41e68ce41d5261ae9434bb33fbd7f2c59976ded4',
 'cfg_tool.bin':'276579954f076886a6a7694f65dc71c034a63a2c204b76749065c0ac7b010d1b',
 'cfg/eq_cfg_hw.bin':'41167491bffed4651750719c973d2758adeb9021a5670d02d6a53c85ed80ea7d'}
def sha(b):return hashlib.sha256(b).hexdigest()
def run(args):return subprocess.check_output(list(map(str,args)),cwd=ROOT,text=True)
def wrap(image):
 def head(crc,a,b,attr):
  body=struct.pack('<HIIBBH16s',crc,a,b,attr,0,0,b'usb_hid_ota.bin')
  return struct.pack('<H',pkg.crc16(body))+body
 blocks=bytearray()
 for i in range(0,len(image),4096):
  raw=image[i:i+4096];compressed=lz4blk.compress(raw)
  assert len(compressed)<=4096 and lz4blk.decompress(compressed)==raw
  blocks+=struct.pack('<II',len(compressed),len(raw))+compressed
 body=head(pkg.crc16(image),len(image),0x01c0a800,0)+blocks
 return head(pkg.crc16(body),0x20,len(body),0x41)+body
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--sdk',type=Path,default=Path('E:/AI_Apps/Felucca/Felucca-review/.build-deps/ac79-sdk'))
 p.add_argument('--toolchain',default=DEFAULT_TC);p.add_argument('--zig',default=str(DEFAULT_ZIG));a=p.parse_args()
 for rel,digest in SDK_HASHES.items():
  assert sha((a.sdk/'cpu/wl82/tools'/rel).read_bytes())==digest,rel+' SDK revision mismatch'
 out=ROOT/'build/fm1';out.mkdir(parents=True,exist_ok=True)
 def tc(tool,*args):return run(['wsl','-e',a.toolchain+'/'+tool,*args])
 fw='vendor/felucca/firmware'
 flags=['-target','pi32v2','-Os','-ffunction-sections','-fno-builtin','-Wall','-Wno-unused-function','-I'+fw+'/hal','-I'+fw+'/src']
 for stem in ['crt0_ldr','loader']:
  tc('pi32v2/bin/clang',*flags,'-c',fw+'/loader/'+stem+('.S' if stem=='crt0_ldr' else '.c'),'-o','build/fm1/'+stem+'.o')
 tc('pi32v2/bin/ld','--gc-sections','-e','_start','-T',fw+'/loader/loader.ld','build/fm1/crt0_ldr.o','build/fm1/loader.o','-o','build/fm1/loader.elf')
 sections=tc('common/bin/objdump','-h','build/fm1/loader.elf')
 for line in sections.splitlines():
  parts=line.split()
  if len(parts)>4 and parts[1].startswith('.') and int(parts[2],16):assert 0x1c00000<=int(parts[3],16)<0x1c80000,line
 tc('common/bin/objcopy','-O','binary','-j','.text','build/fm1/loader.elf','build/fm1/loader.bin')
 loader=wrap((out/'loader.bin').read_bytes());assert len(loader)<=0x4f00
 (out/'ota.bin').write_bytes(loader)
 app=(out/'gb-fm1-NOT-FOR-INSTALL.bin').read_bytes()
 manifest=json.loads((out/'manifest.json').read_text());assert manifest['sha256']==sha(app)
 product=re.search(r'#define FELUCCA_ID "(FM-1_\d+)"',(ROOT/'firmware/fm1_recovery.h').read_text())[1]
 assert manifest['usb_updater'] and product.encode() in app
 pkg.SDK=a.sdk;flash=pkg.flash_image(app,pkg.KEY);raw=pkg.ufw(flash,loader,product)
 assert wire.product_of(raw)==product
 logical=wire.logical_image(raw)
 assert logical[0x400:0x400+len(flash)]==flash
 # Recover the embedded app independently from the encrypted flash region.
 area=bytearray(flash[0x4000:]);pkg.sfc(area,0,len(area),0,pkg.KEY)
 assert area[0x120:0x120+len(app)]==app
 output=out/('gamedude-fm1-'+product.split('_')[1]+'.fwsc');output.write_bytes(raw)
 restore=Path('E:/AI_Apps/MusicCoach-firmware/build/musiccoach-0.2/musiccoach-fm1-0.2.fwsc')
 assert sha(restore.read_bytes())=='7b24e82aacc80ce8dd9966262768547b136732df3072d2329c59b88efb724d81','Restore package changed'
 logs=[]
 for name in ['ota','ldr']:
  exe=out/(name+'-test.exe')
  run([a.zig,'cc','-O1','-UNDEBUG','vendor/felucca/tests/'+name+'_test.c','-o',exe])
  result=run([exe,output] if name=='ota' else [exe,restore,output]);logs.append(result);print(result)
  if name=='ldr':
   result=run([exe,output,restore]);logs.append(result);print(result)
 (out/'updater-tests.txt').write_text('\n'.join(logs))
 report={'project':'gamedude-smk','product':product,'package':output.name,'sha256':sha(raw),
  'bytes':len(raw),'app_sha256':sha(app),'loader_sha256':sha(loader),'sdk_hashes':SDK_HASHES,
  'restore_package':str(restore),'restore_sha256':sha(restore.read_bytes()),
  'private_cartridge':True,'hardware_validated':False,'installed':False,
  'validation':['SDK hashes','loader RAM placement','LZ4 round trip','encrypted app round trip','OTA simulated flash tests','loader simulated flash tests'],
  'note':'Private Tetris trial. Package writes app sectors; game save RAM is volatile. No public distribution.'}
 (out/'trial.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
