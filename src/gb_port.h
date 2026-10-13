/* SPDX-License-Identifier: GPL-3.0-only */
#pragma once
#include <stdint.h>
#include <stddef.h>
#define GB_PORT_RATE 44100u
#define GB_PORT_WIDTH 160u
#define GB_PORT_HEIGHT 144u
#define GB_PORT_SAVE_MAX 131072u
/* Pressed bits, matching Peanut-GB: A B SELECT START RIGHT LEFT UP DOWN. */
enum { GP_A=1, GP_B=2, GP_SELECT=4, GP_START=8, GP_RIGHT=16,
       GP_LEFT=32, GP_UP=64, GP_DOWN=128 };
enum { GP_OK=0, GP_SHORT=1, GP_COLOR=2, GP_ROM_SIZE=3, GP_RAM_SIZE=4,
       GP_CHECKSUM=5, GP_MAPPER=6, GP_CPU=7, GP_TIMEOUT=8 };
int gp_load(const uint8_t *rom, uint32_t size);
int gp_frame(void);
void gp_buttons(uint32_t pressed);
void gp_pause(uint32_t paused);
void gp_reset(void);
void gp_palette(uint32_t palette);
void gp_volume(uint32_t volume); /* 0..100 */
uint16_t *gp_pixels(void);       /* native RGB565, 160x144 */
uint8_t *gp_save_data(void);
uint32_t gp_save_size(void);
uint32_t gp_save_dirty(void);
void gp_save_clean(void);
void gp_audio_read(int16_t *out, uint32_t frames);
uint32_t gp_audio_queued(void);
uint32_t gp_error(void);
uint32_t gp_frame_count(void);
const char *gp_title(void);
uint32_t gp_input_keys(uint32_t lo, uint32_t hi);
