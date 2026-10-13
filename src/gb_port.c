/* SPDX-License-Identifier: GPL-3.0-only */
#include "gb_port.h"
#include "smk37_game_controls.h"
#include <string.h>
#ifndef MINIGB_APU_AUDIO_FORMAT_S16SYS
#define MINIGB_APU_AUDIO_FORMAT_S16SYS
#endif
#ifndef AUDIO_SAMPLE_RATE
#define AUDIO_SAMPLE_RATE GB_PORT_RATE
#endif
#include "minigb_apu.h"
void minigb_apu_render(struct minigb_apu_ctx *, audio_sample_t *, unsigned);
static struct minigb_apu_ctx apu;
static uint8_t audio_read(uint16_t addr) { return minigb_apu_audio_read(&apu, addr); }
static void audio_write(uint16_t addr, uint8_t v) { minigb_apu_audio_write(&apu, addr, v); }
#define ENABLE_SOUND 1
#define PEANUT_GB_12_COLOUR 0
#define PEANUT_GB_IS_LITTLE_ENDIAN 1
#define PEANUT_GB_USE_INTRINSICS 0
#include "peanut_gb.h"
#if defined(GB_HARDWARE)
#define POOL __attribute__((section(".pool"), aligned(4)))
#define BARRIER() __asm__ volatile("csync" ::: "memory")
#else
#define POOL
#define BARRIER() __asm__ volatile("" ::: "memory")
#endif
#ifndef GP_RENDER_SKIP
#if defined(GB_HARDWARE)
#define GP_RENDER_SKIP 1
#else
#define GP_RENDER_SKIP 0
#endif
#endif
static struct gb_s gb;
static uint8_t save[GB_PORT_SAVE_MAX] POOL;
static uint16_t pixels[160*144] POOL;
#define RING 4096u
static int16_t ring[RING*2] POOL;
static int16_t pcm[740*2];
static volatile uint32_t write_pos, read_pos;
static const uint8_t *cart;
static uint32_t cart_size, save_size, dirty, error, ready, paused, frames;
static uint32_t sample_acc, palette_id, volume = 65;
static char title[17];
static const uint16_t palettes[4][4] = {
    {0xe7da,0x9d50,0x5308,0x18e3}, {0xffff,0xad55,0x52aa,0},
    {0xffba,0xd42e,0x786d,0x2087}, {0xdfff,0x6e9c,0x3274,0x1108}
};
static uint8_t rom_read(struct gb_s *g, uint_fast32_t a) {
    (void)g; return a < cart_size ? cart[a] : 0xff;
}
static uint8_t ram_read(struct gb_s *g, uint_fast32_t a) {
    (void)g; return a < save_size ? save[a] : 0xff;
}
static void ram_write(struct gb_s *g, uint_fast32_t a, uint8_t v) {
    (void)g; if (a < save_size && save[a] != v) { save[a] = v; dirty = 1; }
}
static void cpu_error(struct gb_s *g, enum gb_error_e e, uint16_t a) {
    (void)e; (void)a; error = GP_CPU; g->gb_frame = 1;
}
static void line(struct gb_s *g, const uint8_t *p, const uint_fast8_t y) {
    (void)g; if (y >= 144) return;
    for (unsigned x=0;x<160;x++) pixels[y*160+x]=palettes[palette_id][p[x]&3];
}
int gp_load(const uint8_t *rom, uint32_t n) {
    ready=0; error=0; paused=0; frames=0; dirty=0; save_size=0;
    title[0]=0; cart=0; cart_size=0; write_pos=read_pos=0;
    memset(pixels,0,sizeof pixels);
    if (!rom || n<0x150) return error=GP_SHORT;
    if (rom[0x143]==0xc0) return error=GP_COLOR;
    /* Validate before gb_init, which indexes its size tables directly. */
    if (rom[0x148]>8 || n != (32768u<<rom[0x148])) return error=GP_ROM_SIZE;
    if (rom[0x149]>5) return error=GP_RAM_SIZE;
    uint8_t sum=0;
    for (unsigned i=0x134;i<=0x14c;i++) sum=(uint8_t)(sum-rom[i]-1);
    if (sum!=rom[0x14d]) return error=GP_CHECKSUM;
    switch(rom[0x147]) {
      case 0: case 1: case 2: case 3: case 5: case 6: case 8: case 9:
      case 0x0f: case 0x10: case 0x11: case 0x12: case 0x13:
      case 0x19: case 0x1a: case 0x1b: case 0x1c: case 0x1d: case 0x1e: break;
      default: return error=GP_MAPPER;
    }
    cart=rom; cart_size=n;
    memset(&gb,0,sizeof gb); memset(&apu,0,sizeof apu);
    minigb_apu_audio_init(&apu);
    if (gb_init(&gb,rom_read,ram_read,ram_write,cpu_error,0)!=GB_INIT_NO_ERROR)
        return error=GP_MAPPER;
    /* MBC2 RAM is internal to the mapper even with header RAM size zero. */
    if (gb.mbc==2) gb.cart_ram=1;
    size_t s=0;
    if (gb_get_save_size_s(&gb,&s) || s>sizeof save) return error=GP_RAM_SIZE;
    save_size=gb.cart_ram ? (uint32_t)s : 0;
    memset(save,0xff,sizeof save);
    gb_init_lcd(&gb,line); gb.direct.joypad=0xff;
    gb.direct.frame_skip=GP_RENDER_SKIP; gb.direct.interlace=0;
    for (unsigned i=0;i<16;i++) {
        uint8_t c=rom[0x134+i];
        if (i==15 && (rom[0x143]&0x80)) c=0;
        title[i]=(c>=32 && c<=126)?(char)c:0;
    }
    title[16]=0; sample_acc=0; ready=1; return GP_OK;
}
void gp_buttons(uint32_t p) {
    /* Opposite directions cancel. Ownership is handled by each frontend. */
    if ((p&48)==48) p&=~48u;
    if ((p&192)==192) p&=~192u;
    gb.direct.joypad=(uint8_t)~p;
}
void gp_pause(uint32_t p) { paused=!!p; gp_buttons(0); }
void gp_reset(void) {
    if (!ready) return;
    memset(&apu,0,sizeof apu); minigb_apu_audio_init(&apu); gb_reset(&gb);
    gb.direct.frame_skip=GP_RENDER_SKIP;
    error=0; sample_acc=0; frames=0;
    gp_buttons(0);
}
int gp_frame(void) {
    if (!ready || error || paused) return 0;
    /* Backpressure: never advance and discard sound when the consumer stalls. */
    if (RING-gp_audio_queued()<740) return 0;
    gb.gb_frame=0;
    unsigned steps=0;
    while (!gb.gb_frame && !error && steps++<80000) __gb_step_cpu(&gb);
    if (error) return 0;
    if (!gb.gb_frame) { error=GP_TIMEOUT; return 0; }
    if (!(gb.hram_io[0x40]&0x80)) {
        for (unsigned i=0;i<160*144;i++) pixels[i]=palettes[palette_id][0];
    }
    /* Exact rational sample count: no fixed 738-sample-per-frame drift. */
    sample_acc += GB_PORT_RATE * 70224u;
    uint32_t count=sample_acc/4194304u; sample_acc%=4194304u;
    minigb_apu_render(&apu,pcm,count);
    uint32_t w=write_pos;
    for (uint32_t i=0;i<count;i++) {
        ring[((w+i)&(RING-1))*2]=(int16_t)((int32_t)pcm[i*2]*(int32_t)volume/100);
        ring[((w+i)&(RING-1))*2+1]=(int16_t)((int32_t)pcm[i*2+1]*(int32_t)volume/100);
    }
    BARRIER(); write_pos=w+count;
    frames++; return 1;
}
void gp_audio_read(int16_t *out,uint32_t n) {
    uint32_t r=read_pos,w=write_pos; BARRIER();
    for(uint32_t i=0;i<n;i++) {
        if(r!=w && !paused && !error) {
            out[2*i]=ring[(r&(RING-1))*2];out[2*i+1]=ring[(r&(RING-1))*2+1];r++;
        } else {out[2*i]=out[2*i+1]=0;if(r!=w)r++;}
    }
    BARRIER(); read_pos=r;
}
uint32_t gp_audio_queued(void) { return write_pos-read_pos; }
void gp_palette(uint32_t p) {palette_id=p%4;}
void gp_volume(uint32_t v) {volume=v>100?100:v;}
uint16_t *gp_pixels(void) {return pixels;}
uint8_t *gp_save_data(void) {return save;}
uint32_t gp_save_size(void) {return save_size;}
uint32_t gp_save_dirty(void) {return dirty;}
void gp_save_clean(void) {dirty=0;}
uint32_t gp_error(void) {return error;}
uint32_t gp_frame_count(void) {return frames;}
const char *gp_title(void) {return title;}
uint32_t gp_input_keys(uint32_t lo,uint32_t hi) {
#if GB_SMK37
    return gp_smk37_keys(lo,hi);
#else
    (void)hi;
    /* FM-1 starts at F3. White keys: left 1/2, down 3, right 4/5,
       Select 7, Start 8, whites 14/16 B/A. Black keys 2/3
       both mean Up; count black and white keys separately from the left.
       These are zero-based chromatic scan indices, not white-key numbers. */
    static const uint8_t keys[8]={26,23,11,12,7,0,3,4};
    uint32_t p=0;
    for(unsigned i=0;i<8;i++) if(lo&(1u<<keys[i]))p|=1u<<i;
    if(lo&(1u<<2))p|=GP_LEFT;  /* Inner white 2. */
    if(lo&(1u<<6))p|=GP_RIGHT; /* Inner white 4. */
    if(lo&(1u<<5))p|=GP_UP; /* Third black key, A#3; second is G#3. */
    return p;
#endif
}
