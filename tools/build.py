"""Build browser, native host tests and FM-1/SMK37 compile-only GB candidates."""
import argparse, hashlib, json, os, re, subprocess, sys, zipfile
from pathlib import Path
from diagnostic import make_rom
from prepare_apu import prepare
ROOT=Path(__file__).resolve().parents[1]
DEFAULT_ZIG=Path('E:/AI_Apps/Felucca/Felucca-website/build/wasm-tools/ziglang/zig.exe')
DEFAULT_TC='/mnt/e/AI_Apps/Felucca/Felucca-review/.build-deps/jieli/jieli-linux-toolchains-20250324.1'
def run(args):
    subprocess.run(list(map(str,args)),cwd=ROOT,check=True)
def rom_bytes(path):
    if not path:return make_rom()
    p=Path(path)
    if p.suffix.lower()=='.zip':
        with zipfile.ZipFile(p) as z:
            names=[x for x in z.infolist() if x.filename.lower().endswith('.gb') and not x.is_dir()]
            if len(names)!=1:raise ValueError('ZIP must contain exactly one .gb cartridge')
            if names[0].file_size>8*1024*1024:raise ValueError('ROM exceeds 8 MiB')
            return z.read(names[0])
    return p.read_bytes()
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('target',choices=['web','test','fm1','smk37'])
    p.add_argument('--zig',default=os.environ.get('ZIG',str(DEFAULT_ZIG)))
    p.add_argument('--toolchain',default=os.environ.get('JIELI_TOOLCHAIN',DEFAULT_TC))
    p.add_argument('--rom',type=Path)
    p.add_argument('--rom-capacity',type=int,default=0,help='Reserve cartridge bytes for the browser ROM packer')
    a=p.parse_args(); (ROOT/'build').mkdir(exist_ok=True);(ROOT/'web').mkdir(exist_ok=True)
    prepare(ROOT)
    includes=['-Isrc','-Ivendor/peanut-gb']
    flags=['-std=c99','-O2','-fno-builtin','-DMINIGB_APU_AUDIO_FORMAT_S16SYS','-DAUDIO_SAMPLE_RATE=44100',*includes]
    sources=['src/gb_port.c','build/minigb_apu.c']
    if a.target=='web':
        exports=['gp_upload','gp_load_upload','gp_frame','gp_buttons','gp_pause','gp_reset','gp_palette','gp_volume',
                 'gp_pixels','gp_save_data','gp_save_size','gp_save_dirty','gp_save_clean','gp_audio_queued',
                 'gp_render_audio','gp_error','gp_frame_count','gp_title']
        run([a.zig,'cc','-target','wasm32-freestanding',*flags,'-Isrc/freestanding','-nostdlib',
             '-Wl,--no-entry','-Wl,-z,stack-size=0x10000','-Wl,--initial-memory=0x1000000','-Wl,--max-memory=0x1000000',
             *['-Wl,--export='+x for x in exports],*sources,'src/wasm.c','src/libc.c','-o','web/gb.wasm'])
        (ROOT/'web/diagnostic.gb').write_bytes(make_rom())
        binary=ROOT/'web/gb.wasm'
    elif a.target=='test':
        (ROOT/'build/diagnostic.gb').write_bytes(make_rom())
        run([a.zig,'cc',*flags,'-UNDEBUG','-Wall','-Wextra',*sources,'tests/runtime.c','-o','build/runtime-test.exe'])
        run([ROOT/'build/runtime-test.exe',ROOT/'build/diagnostic.gb'])
        run([a.zig,'cc','-std=c99','-O2','-UNDEBUG','-Isrc','tests/smk37_game_controls.c','-o','build/smk37-controls-test.exe'])
        run([ROOT/'build/smk37-controls-test.exe'])
        run([a.zig,'cc','-std=c99','-O2','-UNDEBUG','-Isrc','tests/video_worker.c','-o','build/video-worker-test.exe'])
        run([ROOT/'build/video-worker-test.exe'])
        return
    else:
        native(a,sources)
        return
    (ROOT/'web/build.json').write_text(json.dumps({'sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'bytes':binary.stat().st_size})+'\n')
    print('Built',binary,binary.stat().st_size,'bytes')

def native(a,sources):
    out=ROOT/'build'/a.target;out.mkdir(exist_ok=True)
    rom=rom_bytes(a.rom)
    if len(rom)>512*1024:raise SystemExit('Hardware candidate supports ROMs up to 512 KiB; linker enforces total flash limit')
    capacity=a.rom_capacity or len(rom)
    if capacity<len(rom) or capacity>524288:raise SystemExit('Invalid cartridge capacity')
    storage=rom+b'\xff'*(capacity-len(rom))
    (out/'cartridge.h').write_text('/* Local cartridge; never publish game ROMs. */\nstatic const unsigned char cartridge[] = {\n'+
        ',\n'.join(','.join(str(b) for b in storage[i:i+32]) for i in range(0,len(storage),32))+'\n};\n')
    rel=out.relative_to(ROOT).as_posix()
    def tc(tool,*args):
        run(['wsl','-e',f'{a.toolchain}/{tool}',*args])
    flags=['-target','pi32v2','-std=c99','-Os','-fno-builtin','-ffunction-sections','-fdata-sections','-DGB_HARDWARE=1','-DMUSICCOACH_DUAL_CORE=1',
        '-DMINIGB_APU_AUDIO_FORMAT_S16SYS','-DAUDIO_SAMPLE_RATE=44100',
        '-Isrc','-Isrc/freestanding','-Ivendor/peanut-gb','-Ivendor/felucca/firmware/hal','-I'+rel,
        '-DGB_SMK37='+str(int(a.target=='smk37')),'-Wall','-Wno-unused-function']
    inputs=[*sources,'src/libc.c','firmware/board.c','firmware/start.S','vendor/felucca/firmware/hal/fm1_vec.S']
    objects=[]
    for i,src in enumerate(inputs):
        obj=f'{rel}/{i}.o'
        source_flags=[('-O2' if f=='-Os' else f) for f in flags] if src in sources else flags
        tc('pi32v2/bin/clang',*source_flags,'-c',src,'-o',obj);objects.append(obj)
    elf=f'{rel}/gb-{a.target}.elf'
    tc('pi32v2/bin/ld','--gc-sections','-T','vendor/felucca/firmware/app.ld',*objects,'-o',elf)
    def capture(tool,*args):
        return subprocess.check_output(['wsl','-e',f'{a.toolchain}/{tool}',*args],cwd=ROOT,text=True)
    symbols=capture('common/bin/objdump','-t',elf);sections=capture('common/bin/objdump','-h',elf)
    (out/'symbols.txt').write_text(symbols);(out/'sections.txt').write_text(sections)
    def sym(n):return int(re.search(r'^([0-9a-f]+) .*\s'+n+r'$',symbols,re.M)[1],16)
    image=bytearray()
    for sec,address in [('.text',0x2000120),('.ram_text',sym('_rt_load')),('.dsp_text',sym('_dsp_load')),('.data',sym('_data_load'))]:
        target=f'{rel}/{sec[1:]}.bin';tc('common/bin/objcopy','-O','binary','-j',sec,elf,target)
        blob=(ROOT/target).read_bytes() if (ROOT/target).exists() else b''
        if not blob:continue
        offset=address-0x2000120
        if offset<len(image):raise RuntimeError('Overlapping XIP sections')
        image.extend(b'\xff'*(offset-len(image)));image.extend(blob)
    image.extend(b'\xff'*(-len(image)%4))
    assert sym('_start')==0x2000120 and image[:4]==bytes.fromhex('04818000')
    assert len(image)<=0x8dfbc and sym('_bss_end')<=0x1c1a000 and sym('_pool_end')<=0x1c74000
    assert sym('_cpu1_stacks_hi')<=0x1c74000 and sym('_cpu1_stacks_hi')-sym('_cpu1_stacks_lo')==8192
    assert 0x1c00000<=sym('gb_core1_main')<sym('_dsp_end')<=0x1c06000
    if a.target=='smk37':
        assert not re.search(r'\b(fm1_input_init|fm1_adc_init|fm1_audio_init|fm1_lcd_hw_init)$',symbols,re.M)
    if a.target=='fm1':
        for required in ['usb_start','ota_session.parm']:
            assert re.search(r'\s'+re.escape(required)+r'$',symbols,re.M), 'Missing USB updater symbol: '+required
    binary=out/f'gb-{a.target}-NOT-FOR-INSTALL.bin';binary.write_bytes(image)
    result={'board':a.target,'installable':False,'hardware_validated':False,'bytes':len(image),
      'ram_bytes':sym('_bss_end')-0x1c08000,'pool_bytes':sym('_pool_end')-0x1c1a000,'cpu1_stack_bytes':sym('_cpu1_stacks_hi')-sym('_cpu1_stacks_lo'),
      'dual_core':'CPU0 GB/APU/audio/input/USB; CPU1 display scaling; timeout/fault fallback',
      'sha256':hashlib.sha256(image).hexdigest(),'rom_bytes':len(rom),'rom_sha256':hashlib.sha256(rom).hexdigest(),
      'cartridge_offset':sym('cartridge')-0x2000120,'cartridge_capacity':capacity,
      'cartridge':'original diagnostic' if a.rom is None else 'private user cartridge',
      'flash_writes':'OTA staging 0xe0000..0xe5000 only' if a.target=='fm1' else False,
      'usb_updater':a.target=='fm1','save_persistence':'session RAM only'}
    (out/'manifest.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if __name__=='__main__':main()
