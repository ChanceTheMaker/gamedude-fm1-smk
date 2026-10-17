/* SPDX-License-Identifier: GPL-3.0-only */
#pragma once
#include <stdint.h>
static int gd_validate_rom(const uint8_t *r,uint32_t n){
 if(!r||n<32768u||n>262144u||r[0x143]==0xc0||r[0x148]>3||n!=(32768u<<r[0x148])||r[0x149]>5)return 1;
 uint8_t sum=0;for(unsigned i=0x134;i<0x14d;i++)sum=(uint8_t)(sum-r[i]-1);if(sum!=r[0x14d])return 2;
 switch(r[0x147]){case 0:case 1:case 2:case 3:case 5:case 6:case 8:case 9:case 15:case 16:case 17:case 18:case 19:case 25:case 26:case 27:case 28:case 29:case 30:return 0;default:return 3;}
}
