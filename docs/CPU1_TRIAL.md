# CPU1 trial - 2026-10-13

## Hardware evidence

FM-1_933 installed from a responding FM-1_930 over USB; the updater verified its restart identity. Three read-only diagnostic samples showed stage 4 (worker loop reached), core ID 1, no CPU1 exception, zero accepted video jobs and one fallback. The game continued at approximately 60 frames/sec with approximately 10 LCD updates/sec. A single audio underrun was recorded at startup and did not increase across those samples. Master remained at zero.

These markers disprove the earlier inference that the 932/933 fallback necessarily meant CPU1 never started. The 933 packet did not distinguish startup timeout from first-job timeout; no exact retirement cause has yet been measured.

## Candidate 934

- Accept a valid completed frame before checking elapsed time. CPU0 can be busy emulating a Game Boy frame when CPU1 completes; delayed polling must not reject an otherwise valid completed buffer.
- Preserve rejection of explicit worker faults, corrupt snapshots, torn sequence/completion words and genuinely incomplete timed-out jobs.
- Scale each source pixel pair to three destination pixels (A, A, B), retaining identical 1.5x nearest-neighbor output and RGB565 byte order while eliminating per-pixel integer division.
- Check the actual hardware core ID before enabling CPU1. Startup markers, launch readiness, retirement reason/time, worker job count and maximum job duration are exposed through the existing private GameDude diagnostic protocol.

Retirement reasons: 0 = none, 1 = startup not ready, 2 = CPU1 exception, 3 = job integrity error, 4 = incomplete job timeout. Timing fields use the 24 MHz counter (24 ticks per microsecond). Protocol versions 1 and 2 keep their original field counts. Version 3 in 934 adds these five fields after the 933 startup/fault fields: launch readiness, retirement reason, retirement ticks, worker jobs, maximum worker ticks.

The assembly entry remains in XIP; the worker and scaling code remain in SRAM. Private stacks, timeout retirement and USB-update shutdown remain intact. No unrelated clock or bootloader changes were made.

## Validation and pending hardware check

Passed: host emulator and input tests; exact scaler output and bounds; late-completion regression; invalid requests, timeouts and faults; FM-1 and SMK37 linking; required USB symbols; package identity/CRC/encryption round trips; simulated OTA install and reverse restore with boot-region preservation.

The private Tetris 934 package has SHA-256 `6653b5151369054233a6fe473af1abf55d3aa8e045c767e0c2a45943d4e3972b`; its application has SHA-256 `cae0e55b05c597cdd566a237b3537514aea0381c51e2fed50a8995140da2ddf9`. ROM-containing artifacts remain outside source control.

The 934 installer refused to write when the device unexpectedly reported MusicCoach `FM-1_903`. Three subsequent identity queries confirmed 903. Device ownership must be clarified before continuing the physical trial. Neither sustained CPU1 operation nor the exact cause of the observed fallback is claimed yet. The public browser template remains FM-1_930.
