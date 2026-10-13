/* SPDX-License-Identifier: GPL-3.0-only
 * Entry and interrupt convention from Felucca by Leo Kuroshita / Hugelton. */
.section .text.crt0,"ax",@progbits
.globl _start
_start:
    goto 1f
    rts
1:
    cli
    sp = _ustack_top
    ssp = _sstack_top
    call gb_cstart
    goto .
.macro GB_ISR name, target
.section .text.\name,"ax",@progbits
.globl \name
\name:
    [--sp] = {psr, rets, reti}
    [--sp] = {r3-r0}
    call \target
    {r3-r0} = [sp++]
    {psr, rets, reti} = [sp++]
    csync
    rti
.endm
GB_ISR gb_isr_audio, gb_audio_irq
GB_ISR gb_isr_scan, gb_scan_irq
