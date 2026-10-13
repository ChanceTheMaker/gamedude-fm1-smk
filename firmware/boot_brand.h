/* SPDX-License-Identifier: GPL-3.0-only. Original GameDude pixel wordmark. */
#pragma once
#include <stdint.h>
static const uint8_t gd_letters[8][7]={
 {14,17,16,23,17,17,14},{14,17,17,31,17,17,17},
 {17,27,21,21,17,17,17},{31,16,16,30,16,16,31},
 {30,17,17,17,17,17,30},{17,17,17,17,17,17,14},
 {30,17,17,17,17,17,30},{31,16,16,30,16,16,31}
};
static const uint16_t gd_colors[8]={0x2f3f,0x65fe,0xbfb3,0xff0b,0xfbd1,0xeabc,0xb47f,0x6e7f};
static inline uint16_t gd_wire(uint16_t c){return (uint16_t)((c>>8)|(c<<8));}
static inline void gd_logo_draw(uint16_t *screen,int y){
    for(unsigned i=0;i<240*216;i++)screen[i]=gd_wire(0x0843);
    for(unsigned letter=0;letter<8;letter++)for(unsigned row=0;row<7;row++)
        for(unsigned col=0;col<5;col++)if(gd_letters[letter][row]&(16u>>col))
            for(unsigned dy=0;dy<4;dy++)for(unsigned dx=0;dx<4;dx++){
                int py=y+(int)row*4+(int)dy;unsigned x=26+letter*24+col*4+dx;
                if(py>=0&&py<216)screen[(unsigned)py*240+x]=gd_wire(gd_colors[letter]);
            }
}
#define GD_DING_FRAMES 8820u
static inline int32_t gd_triangle(uint32_t phase){
    phase&=65535u;return (int32_t)(phase<32768u?phase:65535u-phase)-16384;
}
static inline int16_t gd_ding(uint32_t sample){
    if(sample>=GD_DING_FRAMES)return 0;
    uint32_t phase=sample*(1959u*65536u/44100u);
    int32_t wave=gd_triangle(phase)/16+gd_triangle(phase*2u)/32;
    uint32_t envelope=(GD_DING_FRAMES-sample)*1024u/GD_DING_FRAMES;
    envelope=envelope*envelope/1024u;
    return (int16_t)(wave*(int32_t)envelope/1024);
}
