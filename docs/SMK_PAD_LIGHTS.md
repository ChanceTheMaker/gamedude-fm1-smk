# SMK pad-light stability check

GameDude SMK 952: the owner observed that the pads dimmed on first touch and
that moving Fader 2 scrambled the lights. GameDude Color 984 and NESynth 970
contain byte-identical LED encoder and transport headers; this establishes
shared code, not a reproduced hardware failure on those two firmwares.

The prior encoder sent 36 zero bytes followed by the color data. It depended
on GPIO delays outside the SPI transfer to latch/reset the LEDs. The driver
keeps SPI routed to the LED pin during this transition, so GPIO OUT and a
software delay alone do not guarantee a low signal at the pad LEDs.

Candidate 953 adopts Doom 24's tested framing: 512 zero bytes before and after
all 16 pad colors, within one DMA transfer. The pad mappings, cyan/magenta
palette, startup brightness of 150 and Fader 2 behavior are unchanged. A fixed
read-only USB status query (GL 7, SMK only) reports brightness, raw Fader 2,
held pads, last light state, write count and transfer errors. It cannot write
memory or change the device state.

Validation before installation:
- All 256 brightness levels and 16 held-pad positions encode correctly; both
  reset regions remain zero. DMA ordering, LCD state restoration and timeout
  cleanup pass the host test with address/undefined-behavior sanitizers.
- Existing brightness/deadband and native USB transport tests pass.
- The exact packet passes the RAM updater simulation with boot and tail
  preservation. Package round-trip and protected-byte checks pass.
- Firmware fits its existing application and RAM limits, contains no private
  calibration, and retains the same game-library layout and Bluetooth code.

The candidate was installed from SMK-37_952 and restarted as SMK-37_953.
The library contained only the bundled Wordyl game added for this check; it
was re-uploaded after installation and its CRC verified. The settled game
advanced frames/audio with CPU1 active and no emulator error. Idle telemetry
showed brightness 150, raw Fader 2 299, and zero LED transfer errors.
The first diagnostic immediately after the upload timed out during restart;
a fresh connection after restart succeeded. This is not counted as a passed
continuous-connection test.

A subsequent 60-second idle capture recorded 588 samples: brightness remained
150, Fader 2 raw readings ranged 299..301, no held pads were captured, and LED
write/error counts stayed 1/0. Game frames and audio advanced with CPU1 active.
This capture did not exercise the fader or pads.

The owner reported "works better" after the Fader 2 test. A subsequent
read-only check found brightness 63 at raw Fader 2 259, 142 completed LED
updates and zero reported LED errors; gameplay and audio advanced with CPU1
active and no emulator error. That sample was taken after the interaction,
so it does not record the complete fader sweep. The owner then explicitly confirmed: "Colors stay correct; brightness works."
This confirms the GameDude 953 physical pad/fader check on this SMK Pro. No live
installer was changed. Color and NESynth have not been flashed in this check.
The first-touch dimming is not separately explained until the physical check
and corresponding brightness readings establish what changed.

Application SHA-256: `db3ed0d31ff9287a62dc45c992533b11ffeae9e6453db4a646e98a3f4bb774a2`.
Application bytes: 172304. Free application space: 44496 bytes.
