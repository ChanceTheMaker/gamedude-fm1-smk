"""Original small GB cartridge: visual bars, JOYP indicators and a pulse tone. No game assets."""
from pathlib import Path

def make_rom():
    rom=bytearray(32768)
    rom[0x100:0x104]=bytes([0,0xc3,0x50,1])
    rom[0x134:0x143]=b'FM1 SMK GB TEST'.ljust(15,b'\0')
    code=bytearray();labels={};fix=[]
    def emit(*b):code.extend(b)
    def label(n):labels[n]=0x150+len(code)
    def jump(op,n):emit(op,0,0);fix.append((len(code)-2,n))
    def reg(r,v):emit(0x3e,v,0xe0,r)
    emit(0xf3,0x31,0xfe,0xff)
    reg(0x40,0)
    # Copy 64 bytes / four tiles to VRAM.
    emit(0x21,0,5,0x11,0,0x80,0x06,64)
    label('tiles');emit(0x2a,0x12,0x13,0x05);jump(0xc2,'tiles')
    # Fill 32x32 tilemap with alternating shades.
    emit(0x21,0,0x98,0x01,0,4,0x16,0)
    label('map');emit(0x7a,0xe6,3,0x22,0x14,0x0b,0x78,0xb1);jump(0xc2,'map')
    reg(0x47,0xe4);reg(0x42,0);reg(0x43,0);reg(0x40,0x91)
    reg(0x26,0x80);reg(0x24,0x77);reg(0x25,0x11)
    reg(0x11,0x80);reg(0x12,0x60);reg(0x13,0);reg(0x14,0x87)
    label('frame');emit(0xf0,0x44,0xfe,144);jump(0xda,'frame')
    reg(0,0x10);emit(0xf0,0,0xf0,0,0x2f,0xe6,15,0xea,0,0xc0,0x47)
    reg(0,0x20);emit(0xf0,0,0xf0,0,0x2f,0xe6,15,0xea,1,0xc0,0x4f)
    # Eight indicator tiles in centre, shade 3 when pressed / shade 0 released.
    emit(0x21,0x28,0x99)
    for r in (0x78,0x79):
        for bit in range(4):
            emit(r,0xe6,1<<bit)
            jump(0xca,f'off{r}_{bit}');emit(0x3e,3)
            label(f'off{r}_{bit}');emit(0x22)
    # Tone changes with A/B; directional state controls horizontal scroll.
    emit(0x79,0xe0,0x43,0x78,0xe6,3,0x07,0x07,0x07,0x07,0xe0,0x13)
    label('end');emit(0xf0,0x44,0xfe,144);jump(0xd2,'end');jump(0xc3,'frame')
    for pos,n in fix:code[pos:pos+2]=labels[n].to_bytes(2,'little')
    assert 0x150+len(code)<0x500
    rom[0x150:0x150+len(code)]=code
    for tile in range(4):
        for y in range(8):
            rom[0x500+tile*16+y*2]=255 if tile&1 else 0
            rom[0x501+tile*16+y*2]=255 if tile&2 else 0
    rom[0x14d]=(-sum(rom[0x134:0x14d])-25)&255
    total=sum(rom)-rom[0x14e]-rom[0x14f]
    rom[0x14e:0x150]=(total&65535).to_bytes(2,'big')
    return bytes(rom)

if __name__=='__main__':
    p=Path(__file__).resolve().parents[1]/'web/diagnostic.gb'
    p.parent.mkdir(exist_ok=True);p.write_bytes(make_rom())
