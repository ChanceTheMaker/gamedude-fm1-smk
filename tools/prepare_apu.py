"""Generate a minimal variable-frame-count MiniGB APU adaptation; vendor stays intact."""
from pathlib import Path
def prepare(root):
    text=(root/'vendor/peanut-gb/minigb_apu.c').read_text()
    text=text.replace('const bool ch2)', 'const bool ch2, unsigned frames)')
    for name in ('wave','noise'):
        text=text.replace(f'update_{name}(struct minigb_apu_ctx *ctx, audio_sample_t *samples)',
                          f'update_{name}(struct minigb_apu_ctx *ctx, audio_sample_t *samples, unsigned frames)')
    assert text.count('i < AUDIO_NSAMPLES')==3
    text=text.replace('i < AUDIO_NSAMPLES', 'i < frames * 2u')
    text=text.replace('void minigb_apu_audio_callback(struct minigb_apu_ctx *ctx,\n\t\taudio_sample_t *stream)',
                      'void minigb_apu_render(struct minigb_apu_ctx *ctx,\n\t\taudio_sample_t *stream, unsigned frames)')
    text=text.replace('AUDIO_SAMPLES_TOTAL * sizeof(audio_sample_t)', 'frames * 2u * sizeof(audio_sample_t)')
    text=text.replace('update_square(ctx, stream, 0);', 'update_square(ctx, stream, 0, frames);')
    text=text.replace('update_square(ctx, stream, 1);', 'update_square(ctx, stream, 1, frames);')
    text=text.replace('update_wave(ctx, stream);', 'update_wave(ctx, stream, frames);')
    text=text.replace('update_noise(ctx, stream);', 'update_noise(ctx, stream, frames);')
    text+='\nvoid minigb_apu_audio_callback(struct minigb_apu_ctx *ctx, audio_sample_t *stream) { minigb_apu_render(ctx, stream, AUDIO_SAMPLES); }\n'
    path=root/'build/minigb_apu.c';path.parent.mkdir(exist_ok=True)
    path.write_text(text)
    return path
