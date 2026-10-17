from pathlib import Path
from zipfile import ZipFile

def read_cartridge(path,entry=None):
 path=Path(path)
 if path.suffix.lower()=='.zip':
  with ZipFile(path) as z:
   choices=[i for i in z.infolist() if not i.is_dir() and i.filename.lower().endswith('.gb') and (entry is None or i.filename==entry)]
   if len(choices)!=1 or choices[0].file_size>262144:raise ValueError('Choose one Game Boy ROM up to 256 KiB')
   data=z.read(choices[0])
 else:data=path.read_bytes()
 if len(data)<32768 or data[0x148]>3 or len(data)!=(32768<<data[0x148]) or data[0x143]==0xc0 or data[0x149]>5:raise ValueError('Unsupported Game Boy cartridge size/header')
 checksum=0
 for b in data[0x134:0x14d]:checksum=(checksum-b-1)&255
 if checksum!=data[0x14d] or data[0x147] not in [0,1,2,3,5,6,8,9,15,16,17,18,19,25,26,27,28,29,30]:raise ValueError('Invalid header or unsupported mapper')
 return data
