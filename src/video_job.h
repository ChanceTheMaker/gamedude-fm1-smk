/* SPDX-License-Identifier: GPL-3.0-only
 * One immutable source frame per request. CPU0 owns source/request; CPU1 owns
 * output/completion until acknowledged. The display DMA is idle before submit. */
#ifndef GB_VIDEO_JOB_H
#define GB_VIDEO_JOB_H
#include <stdint.h>
#ifndef GB_VIDEO_RAM
#define GB_VIDEO_RAM
#endif
#ifndef GB_VIDEO_BARRIER
#define GB_VIDEO_BARRIER() __asm__ volatile("" ::: "memory")
#endif
#define GB_VIDEO_PIXELS (160u*144u)
typedef struct {
 volatile uint32_t request,request_inverse,complete,complete_inverse,error,hash;
} gb_video_job_t;
static GB_VIDEO_RAM uint32_t gb_video_hash(const uint16_t *p){
 uint32_t h=2166136261u;
 for(unsigned i=0;i<GB_VIDEO_PIXELS;i++)h=(h^p[i])*16777619u;
 return h;
}
static GB_VIDEO_RAM void gb_video_scale(const uint16_t *src,uint16_t *out){
 /* Two source pixels become three output pixels: A, A, B. Avoid a
    hardware divide for every output pixel on the pi32v2 target. */
 for(unsigned y=0;y<216;y++){
  const uint16_t *row=src+(y*2/3)*160;
  uint16_t *dst=out+y*240;
  for(unsigned x=0;x<160;x+=2){
   uint16_t a=row[x],b=row[x+1];
   a=(uint16_t)((a>>8)|(a<<8));b=(uint16_t)((b>>8)|(b<<8));
   *dst++=a;*dst++=a;*dst++=b;
  }
 }
}
static GB_VIDEO_RAM int gb_video_work(gb_video_job_t *job,const uint16_t *src,uint16_t *out){
 uint32_t sequence=job->request;GB_VIDEO_BARRIER();
 if(!sequence||sequence==job->complete)return 0;
 if(job->request_inverse!=~sequence||gb_video_hash(src)!=job->hash){job->error=1;GB_VIDEO_BARRIER();return -1;}
 gb_video_scale(src,out);GB_VIDEO_BARRIER();
 job->complete_inverse=~sequence;GB_VIDEO_BARRIER();job->complete=sequence;GB_VIDEO_BARRIER();return 1;
}
/* CPU0 polls without blocking emulation. Timeout is supplied in timer ticks. */
static int gb_video_poll(const gb_video_job_t *job,uint32_t pending,uint32_t elapsed,uint32_t limit,int fault){
 if(!pending)return 0;
 if(fault||job->error)return -1;
 if(job->complete==pending&&job->complete_inverse==~pending){GB_VIDEO_BARRIER();return 1;}
 /* CPU0 may be busy emulating a frame when completion arrives. A valid
    completed buffer is safe even if CPU0 polls after the timeout interval. */
 return elapsed>limit?-1:0;
}
#endif
