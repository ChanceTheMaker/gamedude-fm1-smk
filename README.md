# GameDude - FM-1 / SMK37

Play original Game Boy cartridges in your browser, then prepare and flash an FM-1 with your own ROM.

**[Play GameDude](https://chancethemaker.github.io/gamedude-fm1-smk/)** | **[Source](https://github.com/ChanceTheMaker/gamedude-fm1-smk)**

## Browser player

Drop in a `.gb` file or a ZIP containing one `.gb`. ROM processing and firmware preparation happen in your browser. No game files are uploaded to a server. Nine licensed homebrew games/apps and an original diagnostic cartridge are included; commercial game ROMs and Nintendo boot ROMs are not.

Choose **FM-1**, **SMK-37 Pro**, **SMK-37 Elite**, or **Game Boy** in the Simulator selector. The Game Boy option adds a classic gray handheld shell, green display and magenta A/B buttons. FM-1 and SMK37 offer clickable instrument keys and pads. Switching layouts keeps the current game running.

The colorful GameDude logo drops, bounces, releases a burst of colored pixels and finishes with a travelling sparkle. A quiet three-note chime plays on landing when sound is enabled. The 1.5-second intro respects reduced motion in the browser (still logo with chime). Volume starts at 25%. WASD or arrow keys move. Space is B, Enter is A, P is Start, and Shift is Select. Z/X remain alternate B/A keys; actions depend on the game. On-screen controls also work. Cartridge RAM saves automatically in this browser, with `.sav` import/export for games with RAM.

## Flash FM-1

1. Open the site in Chrome or Edge and load a cartridge.
2. Choose FM-1, then **Prepare firmware**. ROMs must be 32-512 KiB.
3. Connect the FM-1 by USB and choose **Connect FM-1**, allowing MIDI access.
4. Review the prepared cartridge and choose **Install / resume**. Keep USB connected through verification and restart.

The installer includes the Sloop discovery and recovery fixes: it probes MIDI outputs while listening across input ports, handles mismatched port names and slow/busy ports, and closes temporary connections. It supports the FM-1 staged loader, Doom FM-1 v7+ RAM updater, and resuming an active loader. A generic `ota-FM-1` identity requires confirmation of the physical model because some SMK loaders share that name.

Open **Install progress & recovery** for progress and a downloadable log. Interrupted transfers offer **Retry install / resume**, which discovers the current device state again; programming is never retried automatically. Keep power connected, follow the displayed reconnect instructions, and close other MIDI applications. Completion requires the expected firmware identity after restart. Firmware without a responding USB updater needs the recovery adapter.

Every browser-prepared ROM package retains the complete firmware template. Before and after packing, GameDude checks hashes of all application bytes outside the cartridge slot and the USB loader, along with the package layout and identity. Missing USB metadata or changed code blocks preparation.

Flashing replaces the current device application. Device cartridge saves last until restart or power loss. Start with Master down and raise it gradually. PLAY is Start/pause; RECORD is Select. Master controls game audio and the startup ding.

The FM-1 template is experimental version **FM-1_937**, including grouped piano-key light feedback, the inner Left/Right keys, white 14 for B, the CPU1 display worker and the USB updater. It uses the dual-core implementation physically tested in 934, where the owner confirmed picture, controls and sound and diagnostics confirmed increasing CPU1 jobs with no faults or fallback. Version 935 added input mappings; 936 makes matching piano-key LEDs go dark while their action is held. Version 937 adds the bouncing splash, pixel burst and quiet landing chime. The exact 937 package has passed host control tests, FM-1/SMK compilation, USB symbol checks, cartridge-packing integrity checks and simulated install/restore. Physical confirmation of the new splash/chime, added keys and LED feedback, plus longer stability testing, remain pending. The public package contains only the original diagnostic cartridge; your ROM is inserted locally.

**SMK37 flashing is not enabled.** Its firmware compiles and its controls pass host tests, but device installation and physical key/pad behavior remain unverified.

## Instrument controls

Count white and black keys separately from the left. Assigned keys/pads light up. On physical FM-1 firmware 936, pressing a piano key turns off every piano-key LED mapped to the same action. They relight when the last matching key is released; unrelated keys stay lit. This applies to both Left keys, both Right keys, both Up keys, and the other assigned piano keys. The simulator retains its existing press effect.

These mappings are in the simulator and public FM-1_935 and later firmware. Older 930/934 packages do not include the added inner Left/Right keys. Reload the site and prepare your ROM again, then confirm **FM-1_937** in the preparation review before installing.

| Action | FM-1 | SMK37 |
| --- | --- | --- |
| Left | White 1 or 2 | White 4 or 5 |
| Down | White 3 | White 6 |
| Right | White 4 or 5 | White 7 or 8 |
| Up | Black 2 or 3 | Black 4 or 5 |
| A | White 16 | White 20 |
| B | White 14 | White 22 |
| Start / Select | PLAY / RECORD (also white 8 / 7) | PLAY / RECORD |
| Pad directions | - | Bottom 1 / 2 / 3 = Left / Down / Right; top 2 = Up |
| Pad B / A | - | Bottom 7 / 8 |

## Run and build

The checked-in browser assets can be served directly:

```sh
python tools/serve.py --port 8805 --rom-dir /path/to/your/roms
```

Open `http://localhost:8805/`. The optional local library is read-only and served only on loopback. File selection also works without a library.

Rebuilding requires Python 3, Node 22+ and Zig. Native firmware additionally needs WSL and the JieLi pi32v2 toolchain. Override the existing development-machine paths:

```sh
python tools/build.py web --zig /path/to/zig
python tools/build.py test --zig /path/to/zig
npm test
python tools/build.py smk37 --toolchain /path/to/jieli/toolchain
python tools/build.py fm1 --rom /path/to/game.gb --rom-capacity 524288
python tools/package_fm1.py --sdk /path/to/ac79-sdk
python tools/make_site.py
```

`ZIG` and `JIELI_TOOLCHAIN` also override build defaults. `tools/package_fm1.py` verifies pinned SDK inputs, loader placement, compression, package round trips and simulated flash behavior. It currently requires the development restore package for its bidirectional recovery tests. `tools/public_template.py` builds the original diagnostic template and verifies that the remaining cartridge capacity is erased padding. Private cartridge builds stay under ignored `build/`; never publish them.

`tools/make_site.py` creates `build/site/` from an explicit asset list, checks the diagnostic and template hashes, and includes all license texts. Publish that directory on the `gh-pages` branch. `npm test` covers ROM packing, protected USB code, install/restore handoffs, interrupted transfers, MIDI discovery and progress reporting; it needs no commercial ROMs. Optional `npm run test:library` uses a local catalog generated by `tools/catalog.py`.

## Limits

GB/DMG only; dual-mode games run in monochrome. No GBC-only/GBA games, link cable, rumble or save states. Browser RTC state does not persist while closed. Some games may have timing, visual or audio inaccuracies.

Hardware embeds one cartridge per install. The enlarged hardware display is 240 x 216, centered on the 240 x 240 panel. FM-1 LCD refresh targets roughly 10 updates per second while CPU/audio retain Game Boy timing. Hardware save RAM is volatile.

## Sources and licenses

GPL-3.0-only integration with retained third-party notices. See [LICENSE](LICENSE), [upstream notices](vendor/felucca/LICENSING.md), and [source provenance](vendor/provenance.json).

- Peanut-GB and MiniGB APU: Mahyar Koshkouei, Alex Baines and credited contributors including Lior Halphon; MIT. Pinned Peanut-GB revision `d0bcca771c83a2638c93a9ae61f3d51f226dc905`.
- Felucca: Leo Kuroshita and Huegelton Instruments; GPL-3.0-only. SMK/MusicCoach adaptations by Chance Roth / ChanceTheMaker. Retained file hashes record the imported local reference sources.
- Browser packaging/updater: retained from ChanceTheMaker/sloop-smk, with original copyright notices and hashes in provenance.
- Three unmodified JieLi AC79 SDK package files: JieLi Technology; Apache-2.0. License and attribution accompany the public template.
- Original GameDude pixel logo, startup animation and diagnostic cartridge are project assets. Game Boy and Nintendo are trademarks of Nintendo. This independent project is not affiliated with Nintendo.

The browser simulator offers illustrated FM-1, SMK-37 Pro, SMK-37 Elite and classic Game Boy layouts. Lit device controls are playable. Enlarge screen moves the same running display above the hardware panel without resetting the game. Device artwork is retained under `vendor/illustrations` and generated with `python tools/make_device_art.py`.

Restore original firmware: connect the FM-1, expand the restore section, and press **Restore M-VAVE firmware**. GameDude downloads the verified official release automatically; there is no file picker. M-VAVE lists V15 (2026-07-30) as its latest FM-1 release, checked 2026-10-13. Because its download server does not allow browser cross-origin fetches, an unmodified copy is served with the site. The complete file hash and layout are checked before any MIDI transfer; the updater verifies the `FM-1_015` restart identity. The original manufacturer binary retains its own ownership and is not GPL-licensed GameDude code. Source URL and integrity metadata are in `web/firmware/original.json`. SMK restoration is not enabled. Maintainers can refresh the checked copy with `node tools/fetch_original.mjs`; a changed upstream release fails verification until reviewed.

Dual-core hardware trial: FM-1_934 was installed and verified responding over USB. CPU1 now completes immutable-frame scaling while CPU0 retains GB/APU emulation, audio interrupts, controls and USB. Initial hardware samples confirmed core ID 1, an increasing completed-job count, and no CPU1 faults or fallbacks. This corrects the earlier assumption that CPU1 never started: trial 933 reached its worker loop but fell back before accepting a frame. Build 934 fixes late-completion timeout handling and removes per-pixel division from the scaler. Host tests, FM-1/SMK builds and simulated install/restore pass. The owner confirmed normal picture, controls and sound. Longer stability testing remains pending. The public flasher now serves FM-1_937, which retains this CPU1 implementation and includes the inner directional keys and grouped LED feedback. See [CPU1 trial notes](docs/CPU1_TRIAL.md).

The site uses a classic handheld-inspired theme: warm gray plastic, green LCD surfaces, blue labels and berry action buttons. One large molded console shell surrounds the content; the individual panels and device simulator shapes are retained.

The hero tour shows one instrument at a time, then zooms into its screen: FM-1 with Block Drop, SMK-37 Pro with Super Pixel, and SMK-37 Elite with Pocket Tennis. Pause or choose a device using the tour controls. Reduced-motion preferences start the tour paused. The screens are original AI-generated retro-style mock game illustrations, not commercial screenshots or included playable games. No commercial ROM is distributed.

Restore validation: `node tests/restore.mjs <official-FM-1-V15.fwsc>` exercises package rejection and install/resume routing without opening MIDI. The retained loader simulator also passed GameDude-to-original-V15 restoration with preservation of the boot region and writes restricted to the expected ranges. This does not substitute for a physical original-firmware restore test.


## Included homebrew

The Choose panel offers Tobu Tobu Girl, GB-Wordyl (English), 2048, Libbet and the Magic Floor, Breakout, Tic-Tac-Toe, Game of Life, Bytewave and Gamepad Tester. Select a cartridge and press **Play this cartridge**, then optionally prepare it for FM-1. Each install contains one game; this is not an on-device multicart menu.

`web/homebrew/catalog.json` records upstream versions, hashes, licenses and sources. Full notices are in `web/homebrew/NOTICE.txt` and the site's Credits page. Original ROM bytes are retained; GB-Wordyl's GPL corresponding source archive is served alongside its ROM. A free download alone is not redistribution permission: only explicitly licensed cartridges are bundled.

`npm run test:homebrew` checks every bundled cartridge's identity, starts it in the shipped WebAssembly core, exercises controls for 1,800 frames and prepares FM-1 firmware while verifying the protected USB updater. This is smoke coverage, not complete gameplay or physical hardware testing. Bytewave uses timing-sensitive wave-channel synthesis; its audio is approximate. Browser battery RAM persists locally; FM-1 cartridge RAM is lost at restart.

The public staging tool only copies manifest-listed homebrew files after verifying their ROM/source hashes, licenses, DMG compatibility and 512 KiB hardware size limit. Private local libraries remain excluded.

The top navigation includes an Install link to the firmware panel. The footer links to SMKLAB, Doom, Felucca SMK, Sloop SMK and Melodee SMK, matching the project family navigation.
