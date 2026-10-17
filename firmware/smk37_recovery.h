/* SPDX-License-Identifier: GPL-3.0-only */
/* Adapted from NESynth/Felucca: bounded RAM loader owns every firmware write. */
#include <string.h>
#include "fm1_timer.h"
#include "nes_loader_image.h"
#define FELUCCA_OTA 1
#define FELUCCA_SYSEX 1
#define FELUCCA_CDC 0
#define FELUCCA_UAC 0
#define RING_PUBLISH() __asm__ volatile("csync" ::: "memory")
#include "../vendor/smk-updater/usb.c"
static uint8_t recovery_ready;
static uint32_t ota_now_ms(void){static uint32_t last,acc,ms;uint32_t now=fm1_ticks();acc+=now-last;last=now;ms+=acc/24000u;acc%=24000u;return ms;}
static void ota_idle(void){fm1_wdt_feed();}
extern void gb_isr_usb(void);
void gb_usb_irq(void){fm1_timer5_ack();usb_poll();}
static void recovery_init(void){usb_start();FM1_T5_CON=0x4000u;FM1_T5_CNT=0;FM1_T5_PRD=3000u;fm1_irq_attach(FM1_IRQ_TIMER5,gb_isr_usb,2);recovery_ready=1;FM1_T5_CON=0x4019u;}
static void recovery_enter(void){
 display_stop();video_retire();audio_stop();fm1_irq_off();FM1_T5_CON=0x4000u;usb_detach();fm1_delay_ms(100);
 volatile uint8_t *dst=(volatile uint8_t*)0x01c0a800u;for(unsigned i=0;i<sizeof np_loader_image;i++)dst[i]=np_loader_image[i];
 __asm__ volatile("csync" ::: "memory");void (*volatile enter)(void)=(void(*)(void))0x01c0a800u;enter();for(;;);
}
static void recovery_service(void){
 if(!recovery_ready)return;uint32_t now_ms=ota_now_ms();
 if(!usb.up&&!usb.detached){FM1_T5_CON=0x4000u;usb_retry(now_ms);FM1_T5_CNT=0;FM1_T5_CON=0x4019u;}
 mi_r=mi_w;const uint8_t *p;uint32_t n;static const uint8_t query[]={0,0x32,0x45,0,0,0,0x40,0x7f};
 if(ota_frame_get(&p,&n)){int identity=n==sizeof query&&!memcmp(p,query,n);ota_frame_done();if(identity)ota_wire_send(np_identity_wire,sizeof np_identity_wire);}
 if(usb.ota_req){usb.ota_req=0;gb_bootguard.pending=0;recovery_enter();}
 if(usb.uboot_req){display_stop();video_retire();audio_stop();gb_bootguard.pending=0;fm1_enter_uboot();}
}
