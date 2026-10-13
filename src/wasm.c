#include "gb_port.h"
static uint8_t upload[8*1024*1024];
static int16_t output[2048*2];
uint8_t *gp_upload(void) {return upload;}
int gp_load_upload(uint32_t bytes) {if(bytes>sizeof upload)return GP_ROM_SIZE;return gp_load(upload,bytes);}
int16_t *gp_render_audio(uint32_t frames) {
    if(frames>2048)frames=2048;
    gp_audio_read(output,frames);return output;
}
