/* SPDX-License-Identifier: GPL-3.0-only */
#include "gb_port.h"
#include "fm1_game_lights.h"
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../firmware/master_volume.h"
static void checksum(uint8_t*r){unsigned s=0;for(unsigned i=0x134;i<0x14d;i++)s=s-r[i]-1;r[0x14d]=(uint8_t)s;}
int main(int argc,char**argv){
    assert(gb_master_gain(0)==0&&gb_master_gain(8)==0);
    assert(gb_master_gain(512)==1024&&gb_master_gain(1023)==4088);
    for(unsigned k=1;k<1024;k++)assert(gb_master_gain(k)>=gb_master_gain(k-1));
    assert(gb_master_sample(32767,0)==0&&gb_master_sample(-32768,0)==0);
    assert(gb_master_sample(32767,4096)==32767*128);
    assert(gb_master_sample(-32768,4096)==-32768*128);
    assert(argc==2);FILE*f=fopen(argv[1],"rb");assert(f);
    uint8_t rom[32768];assert(fread(rom,1,sizeof rom,f)==sizeof rom);fclose(f);
    assert(gp_load(0,0)==GP_SHORT);
    assert(gp_load(rom,0x100)==GP_SHORT);
    assert(gp_load(rom,sizeof rom-1)==GP_ROM_SIZE);
    rom[0x143]=0xc0;assert(gp_load(rom,sizeof rom)==GP_COLOR);rom[0x143]=0;
    rom[0x148]=255;assert(gp_load(rom,sizeof rom)==GP_ROM_SIZE);rom[0x148]=0;
    rom[0x149]=255;assert(gp_load(rom,sizeof rom)==GP_RAM_SIZE);rom[0x149]=0;
    rom[0x14d]^=1;assert(gp_load(rom,sizeof rom)==GP_CHECKSUM);rom[0x14d]^=1;
    rom[0x147]=0xff;checksum(rom);assert(gp_load(rom,sizeof rom)==GP_MAPPER);
    rom[0x147]=6;checksum(rom);assert(gp_load(rom,sizeof rom)==GP_OK);assert(gp_save_size()==512);
    rom[0x147]=3;rom[0x149]=4;checksum(rom);assert(gp_load(rom,sizeof rom)==GP_OK);assert(gp_save_size()==131072);
    rom[0x147]=0;rom[0x149]=0;checksum(rom);assert(gp_load(rom,sizeof rom)==GP_OK);
    /* FM-1 F3..G5: white 1/2 left, 3 down, 4/5 right and white 15 B and white 16 A. */
    assert(gp_input_keys(1u<<0,0)==GP_LEFT);
    assert(gp_input_keys(1u<<4,0)==GP_DOWN);
    assert(gp_input_keys(1u<<7,0)==GP_RIGHT);
    assert(gp_input_keys((1u<<24)|(1u<<26),0)==(GP_B|GP_A));
    assert(gp_input_keys(1u<<23,0)==0);
    assert(gp_input_keys(1u<<3,0)==GP_UP);
    assert(gp_input_keys(1u<<5,0)==GP_UP);
    assert(gp_input_keys((1u<<3)|(1u<<5),0)==GP_UP);
    assert(gp_input_keys(1u<<2,0)==GP_LEFT);
    assert(gp_input_keys(1u<<6,0)==GP_RIGHT);
    assert(gp_input_keys((1u<<0)|(1u<<2),0)==GP_LEFT); /* Either left key can remain held. */
    assert(gp_input_keys((1u<<6)|(1u<<7),0)==GP_RIGHT);
    assert(gp_input_keys((1u<<2)|(1u<<4),0)==(GP_LEFT|GP_DOWN));
    assert(gp_input_keys((1u<<6)|(1u<<4),0)==(GP_RIGHT|GP_DOWN));
    assert(gp_input_keys((1u<<1)|(1u<<8)|(1u<<10)|
        (1u<<13)|(1u<<15)|(1u<<17)|(1u<<20)|(1u<<22)|(1u<<25),0)==0);
    const uint32_t left=(1u<<0)|(1u<<2),right=(1u<<6)|(1u<<7),up=(1u<<3)|(1u<<5);
    const uint32_t all=left|right|up|(1u<<4)|(1u<<11)|(1u<<12)|(1u<<24)|(1u<<26);
    assert(gp_fm1_key_lights(0)==all);
    assert(gp_fm1_key_lights(gp_input_keys(1u<<0,0))==(all&~left));
    assert(gp_fm1_key_lights(gp_input_keys(left,0))==(all&~left));
    assert(gp_fm1_key_lights(gp_input_keys(1u<<2,0))==(all&~left)); /* Outer released, inner held. */
    assert(gp_fm1_key_lights(gp_input_keys(0,0))==all); /* Last duplicate released. */
    assert(gp_fm1_key_lights(gp_input_keys(1u<<6,0))==(all&~right));
    assert(gp_fm1_key_lights(gp_input_keys(1u<<7,0))==(all&~right));
    assert(gp_fm1_key_lights(gp_input_keys(1u<<3,0))==(all&~up));
    assert(gp_fm1_key_lights(gp_input_keys(1u<<5,0))==(all&~up));
    assert(gp_fm1_key_lights(GP_LEFT|GP_RIGHT)==(all&~(left|right)));
    assert(gp_fm1_key_lights(GP_A)==(all&~(1u<<26)));
    assert(gp_fm1_key_lights(gp_input_keys(1u<<1,0))==all); /* Unmapped key stays dark. */
    int16_t out[740*2];unsigned long total=0;unsigned loud=0;
    for(unsigned n=0;n<1000;n++){
        gp_buttons(n<500?0:GP_A|GP_RIGHT);
        assert(gp_frame()==1);assert(!gp_error());
        unsigned count=gp_audio_queued();assert(count==738||count==739);
        total+=count;gp_audio_read(out,count);
        for(unsigned i=0;i<count*2;i++)if(out[i])loud++;
    }
    assert(total==(unsigned long long)44100*70224*1000/4194304);
    assert(loud>10000);assert(gp_frame_count()==1000);
    uint16_t *px=gp_pixels();unsigned changes=0;for(unsigned i=1;i<160*144;i++)changes+=px[i]!=px[i-1];assert(changes>100);
    gp_pause(1);assert(gp_frame()==0);gp_audio_read(out,740);for(unsigned i=0;i<1480;i++)assert(out[i]==0);
    gp_pause(0);assert(gp_frame()==1);
    while(gp_audio_queued()+740<=4096)assert(gp_frame());
    unsigned frames=gp_frame_count();assert(gp_frame()==0);assert(gp_frame_count()==frames);
    gp_audio_read(out,740);assert(gp_frame());
    gp_reset();assert(gp_frame_count()==0);
    printf("PASS: cartridge validation, MBC2/large save RAM, input mapping, 1000 frames, exact audio timing, pause and backpressure (%lu samples).\n",total);
    return 0;
}
