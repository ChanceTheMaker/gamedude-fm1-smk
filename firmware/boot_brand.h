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
#define GD_SPLASH_LAND_MS 500u
#define GD_SPLASH_END_MS 1500u
static inline int gd_splash_y(uint32_t ms){
    if(ms<500u)return -36+(int)(120u*ms*ms/250000u);
    if(ms<660u){uint32_t u=ms-500u;return 84-(int)(48u*u*(160u-u)/25600u);}
    if(ms<800u){uint32_t u=ms-660u;return 84-(int)(16u*u*(140u-u)/19600u);}
    return 84;
}
static inline void gd_pixel(uint16_t *screen,int x,int y,uint16_t color){
    if(x>=0&&x<240&&y>=0&&y<216)screen[(unsigned)y*240+(unsigned)x]=gd_wire(color);
}
static inline void gd_splash_draw(uint16_t *screen,uint32_t ms){
    gd_logo_draw(screen,gd_splash_y(ms));
    if(ms>=500u&&ms<1100u){
        static const int8_t dx[12]={16,14,8,0,-8,-14,-16,-14,-8,0,8,14};
        static const int8_t dy[12]={0,8,14,16,14,8,0,-8,-14,-16,-14,-8};
        unsigned t=ms-500u,reach=18u+t*58u/600u;
        /* Shrinking confetti keeps the landing bright without a full-screen flash. */
        for(unsigned i=0;i<12;i++){
            int x=120+dx[i]*(int)reach/10,y=98+dy[i]*(int)reach/16;
            for(unsigned a=0;a<(t<350?3u:1u);a++)for(unsigned b=0;b<(t<350?3u:1u);b++)
                gd_pixel(screen,x+(int)a,y+(int)b,gd_colors[i%8]);
        }
    }
    if(ms>=850u&&ms<1350u){
        unsigned t=ms-850u;int x=26+(int)(t*188u/500u);
        for(int d=-4;d<=4;d++){gd_pixel(screen,x+d,72,gd_colors[t*8u/500u]);gd_pixel(screen,x,72+d,gd_colors[t*8u/500u]);}
        gd_pixel(screen,x,72,0xffff);
    }
}
/* Quiet C6/E6/G6 arpeggio. Master gain is applied by the normal audio IRQ. */
#define GD_DING_FRAMES 30870u
static inline int32_t gd_triangle(uint32_t phase){
    phase&=65535u;return (int32_t)(phase<32768u?phase:65535u-phase)-16384;
}
static inline int16_t gd_ding(uint32_t sample){
    static const uint32_t starts[3]={0u,3969u,8820u},steps[3]={1555u,1959u,2330u};
    if(sample>=GD_DING_FRAMES)return 0;
    int32_t mix=0;
    for(unsigned i=0;i<3;i++){
        if(sample<starts[i])continue;
        uint32_t p=sample-starts[i];if(p>=22050u)continue;
        uint32_t phase=p*steps[i]+16384u; /* Begin at zero amplitude. */
        int32_t wave=gd_triangle(phase)/40+gd_triangle(phase*2u)/160;
        uint32_t envelope=(22050u-p)*1024u/22050u;
        envelope=envelope*envelope/1024u;
        if(p<265u)envelope=envelope*p/265u; /* Six-millisecond attack avoids a click. */
        mix+=wave*(int32_t)envelope/1024;
    }
    return (int16_t)mix;
}
