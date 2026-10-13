#include <assert.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include "video_job.h"
static uint16_t src[GB_VIDEO_PIXELS],out[240*216+2];
static void submit(gb_video_job_t *j,uint32_t n){j->hash=gb_video_hash(src);j->request_inverse=~n;j->request=n;}
int main(void){
 gb_video_job_t j={0};assert(gb_video_work(&j,src,out+1)==0);
 for(unsigned i=0;i<GB_VIDEO_PIXELS;i++)src[i]=(uint16_t)(i*37u+19u);
 out[0]=0x1234;out[240*216+1]=0x5678;submit(&j,1);
 assert(gb_video_work(&j,src,out+1)==1);assert(j.complete==1&&j.complete_inverse==~1u);
 for(unsigned y=0;y<216;y++)for(unsigned x=0;x<240;x++){
  uint16_t p=src[(y*144/216)*160+x*160/240];assert(out[1+y*240+x]==(uint16_t)((p<<8)|(p>>8)));
 }
 assert(out[0]==0x1234&&out[240*216+1]==0x5678);
 src[0]^=1;assert(gb_video_work(&j,src,out+1)==0); /* same request never re-renders */
 submit(&j,2);j.request_inverse=2;assert(gb_video_work(&j,src,out+1)==-1&&j.complete==1);
 j.error=0;submit(&j,3);src[800]^=1;assert(gb_video_work(&j,src,out+1)==-1&&j.complete==1);
 j.error=0;submit(&j,0xffffffffu);assert(gb_video_work(&j,src,out+1)==1);
 submit(&j,1);assert(gb_video_work(&j,src,out+1)==1); /* sequence wrap skips idle zero */
 assert(gb_video_poll(&j,1,240000u,240000u,0)==1);
 assert(gb_video_poll(&j,2,0,240000u,0)==0);
 assert(gb_video_poll(&j,2,240001u,240000u,0)==-1);
 assert(gb_video_poll(&j,1,0,240000u,1)==-1);
 j.complete_inverse=1;assert(gb_video_poll(&j,1,0,240000u,0)==0);
 j.error=1;assert(gb_video_poll(&j,1,0,240000u,0)==-1);
 puts("PASS: exact 1.5x scale/byte order, buffer bounds, single-consumption requests, torn request and corrupt snapshot refusal, sequence wrap, timeouts, faults and torn completion.");
}
