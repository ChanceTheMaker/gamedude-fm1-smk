#include <assert.h>
#include <stdio.h>
#include <string.h>
#include "../src/cartridge_validate.h"
static unsigned char rom[524288];
static void checksum(void){unsigned char s=0;for(unsigned i=0x134;i<0x14d;i++)s=s-rom[i]-1;rom[0x14d]=s;}
int main(void){
 for(unsigned size=0;size<4;size++){rom[0x148]=size;for(unsigned mapper=0;mapper<256;mapper++){rom[0x147]=mapper;checksum();int supported=mapper<=3||mapper==5||mapper==6||mapper==8||mapper==9||(mapper>=15&&mapper<=19)||(mapper>=25&&mapper<=30);assert((!gd_validate_rom(rom,32768u<<size))==supported);} }
 rom[0x147]=0;rom[0x148]=0;checksum();assert(!gd_validate_rom(rom,32768));rom[0x14d]^=1;assert(gd_validate_rom(rom,32768));checksum();assert(gd_validate_rom(rom,32767));assert(gd_validate_rom(rom,65536));rom[0x143]=0xc0;checksum();assert(gd_validate_rom(rom,32768));rom[0x143]=0;rom[0x148]=4;checksum();assert(gd_validate_rom(rom,524288));memcpy(rom,"NES\032",4);memset(rom+0x134,0,0x1a);assert(gd_validate_rom(rom,32768));assert(gd_validate_rom(0,32768));puts("PASS: GB mapper/header/size validation, GBC-only, NES and malformed rejection");}
