#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include "../firmware/boot_brand.h"
#include "../firmware/master_volume.h"
static uint16_t guarded[240*216+2];
int main(void){
    guarded[0]=0x1234;guarded[240*216+1]=0x5678;
    for(unsigned ms=0;ms<=2000;ms+=7){gd_splash_draw(guarded+1,ms);assert(guarded[0]==0x1234&&guarded[240*216+1]==0x5678);}
    gd_splash_draw(guarded+1,UINT32_MAX);assert(guarded[0]==0x1234&&guarded[240*216+1]==0x5678);
    assert(gd_splash_y(0)<0&&gd_splash_y(500)==84&&gd_splash_y(580)<84&&gd_splash_y(800)==84);
    int peak=0;long sum=0;unsigned nonzero=0;
    for(unsigned p=0;p<GD_DING_FRAMES;p++){
        int s=gd_ding(p);if(abs(s)>peak)peak=abs(s);sum+=s;if(s)nonzero++;
        assert(gb_master_sample(s,0)==0);assert(abs(s)<=1536);
    }
    assert(gd_ding(0)==0&&gd_ding(GD_DING_FRAMES)==0&&gd_ding(UINT32_MAX)==0);
    assert(nonzero>20000&&peak>300&&labs(sum)<GD_DING_FRAMES*5);
    printf("PASS splash clipping, bounce/settle, chime envelope, quiet peak %d and Master mute.\n",peak);
    return 0;
}
