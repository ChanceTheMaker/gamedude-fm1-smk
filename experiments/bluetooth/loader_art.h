/* SPDX-License-Identifier: GPL-3.0-only */
/* Original GameDude adaptation of NESynth pixel artwork. Render clipped strips into the existing LCD
 * workspace; no bitmap, new framebuffer, allocation, or cartridge space. */
#ifndef NP_LOADER_ART_H
#define NP_LOADER_ART_H
#include <stdint.h>
#include "../../firmware/boot_brand.h"
typedef struct {uint16_t *pixels;unsigned top,height;} np_art;
static void np_art_box(np_art *a,unsigned x,unsigned y,unsigned w,unsigned h,uint16_t rgb){
    unsigned right=x+w,bottom=y+h;
    if(right>240)right=240;
    if(bottom>a->top+a->height)bottom=a->top+a->height;
    if(y<a->top)y=a->top;
    uint16_t wire=(uint16_t)((rgb>>8)|(rgb<<8));
    for(;y<bottom;y++)for(unsigned col=x;col<right;col++)a->pixels[(y-a->top)*240+col]=wire;
}
static void np_art_text(np_art *a,unsigned x,unsigned y,const char *s,unsigned scale,uint16_t color){
    for(;*s;s++,x+=4*scale){
        unsigned c=(unsigned char)*s,k=c>='0'&&c<='9'?c-'0':c>='A'&&c<='Z'?c-'A'+10:99;
        if(k>=36)continue;
        for(unsigned r=0;r<5;r++)for(unsigned col=0;col<3;col++)
            if(np_font[k][r]&(4u>>col))np_art_box(a,x+col*scale,y+r*scale,scale,scale,color);
    }
}
static void np_art_center(np_art *a,unsigned y,const char *s,unsigned scale,uint16_t color){
    unsigned n=0;while(s[n])n++;
    unsigned width=n?((n*4-1)*scale):0;
    np_art_text(a,width<240?(240-width)/2:0,y,s,scale,color);
}
static void np_art_logo(np_art *a){
    /* Same 5x7 letters, four-pixel cells and rainbow colors as the website SVG
     * and boot splash. Draw through the strip clipper, without a framebuffer. */
    for(unsigned letter=0;letter<8;letter++)for(unsigned row=0;row<7;row++)
        for(unsigned col=0;col<5;col++)if(gd_letters[letter][row]&(16u>>col))
            np_art_box(a,26+letter*24+col*4,24+row*4,4,4,gd_colors[letter]);
}
static void np_loader_art(uint16_t *pixels,unsigned top,unsigned height,const char *status,unsigned percent,unsigned state){
    np_art a={pixels,top,height};
    const uint16_t bg=0x1083,red=0xe9e8,white=0xef5c,gray=0x9cf3,dark=0x2945,blue=0x45bf;
    np_art_box(&a,0,top,240,height,bg);
    np_art_logo(&a);
    /* Original pocket handheld: LCD, D-pad and B/A buttons. */
    np_art_box(&a,82,72,82,88,dark);np_art_box(&a,76,68,82,88,gray);
    np_art_box(&a,83,75,68,44,dark);np_art_box(&a,89,81,56,31,0x9d50);
    np_art_text(&a,106,89,"GB",3,0x18e3);
    np_art_box(&a,88,126,8,22,dark);np_art_box(&a,81,133,22,8,dark);
    np_art_box(&a,124,136,9,9,red);np_art_box(&a,140,128,9,9,red);
    np_art_box(&a,105,148,10,3,dark);np_art_box(&a,119,148,10,3,dark);
    /* Radio waves frame the cartridge. */
    for(unsigned i=0;i<3;i++){
        np_art_box(&a,47-i*8,88+i*5,3,18-i*5,blue);
        np_art_box(&a,190+i*8,88+i*5,3,18-i*5,blue);
    }
    np_art_center(&a,168,"GAME LOADER",2,gray);
    np_art_center(&a,231,"REC LIBRARY",1,gray);
    /* Only this lower 64-row strip is refreshed while the radio runs. */
    uint16_t accent=state==5?red:state==4?0x5e8e:blue;
    np_art_center(&a,190,status,3,state==5?red:white);
    np_art_box(&a,20,216,200,8,dark);
    if(percent>100)percent=100;
    if(percent)np_art_box(&a,20,216,percent*2,8,accent);
    else for(unsigned x=108;x<132;x+=9)np_art_box(&a,x,218,5,4,accent);
}
#endif
