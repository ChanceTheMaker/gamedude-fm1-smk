# GameDude - FM-1 / SMK37 — v2.0

**Now with Bluetooth and Multi-game storage.**

- Install the core once, then add games over Bluetooth or USB.
- Keep multiple games installed across power cycles, select them on the device, and see remaining space.
- Manage the same game library from either connection, including play and delete.
- Separate **Install firmware** and **Add games** tabs, with automatic firmware selection and drag-and-drop games.

The public release name is v2.0; internal USB firmware build numbers remain unchanged for device compatibility. Cartridge save RAM remains volatile.


Play original Game Boy cartridges in your browser or send them to the FM-1 / SMK game library.

**[Play GameDude](https://chancethemaker.github.io/gamedude-fm1-smk/)** | **[Source](https://github.com/ChanceTheMaker/gamedude-fm1-smk)**

## Browser player

Drop in a `.gb` file or a ZIP containing one `.gb`. ROM processing and firmware preparation happen in your browser. No game files are uploaded to a server. Nine licensed homebrew games/apps and an original diagnostic cartridge are included; commercial game ROMs and Nintendo boot ROMs are not.

Choose **FM-1**, **SMK-37 Pro**, **SMK-37 Elite**, or **Game Boy** in the Simulator selector. The Game Boy option adds a classic gray handheld shell, green display and magenta A/B buttons. FM-1 and SMK37 offer clickable instrument keys and pads. Switching layouts keeps the current game running.

The colorful GameDude logo drops, bounces, releases a burst of colored pixels and finishes with a travelling sparkle. A quiet three-note chime plays on landing when sound is enabled. The 1.5-second intro respects reduced motion in the browser (still logo with chime). Volume starts at 25%. WASD or arrow keys move. Space is B, Enter is A, P is Start, and Shift is Select. Z/X remain alternate B/A keys; actions depend on the game. On-screen controls also work. Cartridge RAM saves automatically in this browser, with `.sav` import/export for games with RAM.

## Install and load games

1. Open **Install firmware**, choose FM-1 or the exact SMK model, connect USB, and install GameDude. No ROM or firmware file selection is required.
2. Open **Add games**. Choose a licensed homebrew or drop a `.gb` / `.zip` cartridge onto the picker or simulator.
3. Choose the instrument and Bluetooth or USB. Both transports use the same persistent game library.
4. On the device, hold PLAY + REC for two seconds to return to the library. Directional keys/pads select a game; REC or A starts it. PLAY opens Bluetooth loading. REC returns from loading to the library.

Individual games are limited to 256 KiB. FM-1 has 360 KiB of library storage and SMK has 392 KiB; the device and website show free space. CRC checks and redundant catalogs protect completed games during interrupted additions/deletions. Battery save RAM is still volatile. Installing firmware replaces the library.

Internal builds are FM-1_938 and SMK-37_938; the release name is **v2.0**. The older 937 single-cartridge template remains only as a packaging/test fixture.

### Local preview and Windows USB

Run `python tools/serve.py --port 8890` and open http://localhost:8890/. Local SMK installation uses short-lived native USB stages to avoid the Windows legacy MIDI handoff hang. This requires the local MIDI Python dependencies and verified stock package under ignored `build/`; the helper accepts only the pinned core or verified stock restore. Hosted GitHub Pages still uses browser MIDI: the native helper does not fix Chrome's Windows legacy MIDI driver there.

This owner's SMK needs the previously verified, device-specific RF calibration fallback. `--owner-firmware` installs the private build from `build/library-smk-owner/`, guarded by a matching factory identity. Private calibration and private packages must never enter `web/` or Git. Public cores read each device's own valid RF calibration. SMK Elite packaging is tested; physical validation uses SMK-37 Pro.

### Builds and checks

`python tools/build_bluetooth_probe.py --loader --board fm1 --output-dir build/library-fm1-public`

`python tools/build_bluetooth_probe.py --loader --board smk37 --output-dir build/library-smk-public`

The builder uses the pinned Hortator/AC79 SDK dependencies retained under the neighboring NESynth project. `python tools/public_library_firmware.py` stages only hash-verified calibration-free cores. `python tools/make_site.py` stages the explicit public asset allowlist; neither command publishes.

## Instrument controls

Count white and black keys separately from the left. Assigned keys/pads light up. On physical FM-1 firmware 936, pressing a piano key turns off every piano-key LED mapped to the same action. They relight when the last matching key is released; unrelated keys stay lit. This applies to both Left keys, both Right keys, both Up keys, and the other assigned piano keys. The simulator retains its existing press effect.

These mappings are in the simulator and v2.0 firmware (internal build 938). B and A occupy the final two white keys, with no skipped white key. Select is to the left of Start: PLAY selects and RECORD starts. Install the v2.0 core to update older device mappings.

| Action | FM-1 | SMK37 |
| --- | --- | --- |
| Left | White 1 or 2 | White 4 or 5 |
| Down | White 3 | White 6 |
| Right | White 4 or 5 | White 7 or 8 |
| Up | Black 2 or 3 | Black 4 or 5 |
| A | White 16 (far right) | White 22 (far right) |
| B | White 15 | White 21 |
| Select / Start | PLAY / RECORD (also white 7 / 8) | PLAY / RECORD |
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

Hardware retains multiple cartridges in its game library, with a 256 KiB limit per game. The enlarged hardware display is 240 x 216, centered on the 240 x 240 panel. LCD refresh targets roughly 10 updates per second while CPU/audio retain Game Boy timing. Hardware save RAM is volatile.

## Sources and licenses

GPL-3.0-only integration with retained third-party notices. See [LICENSE](LICENSE), [upstream notices](vendor/felucca/LICENSING.md), and [source provenance](vendor/provenance.json).

- Peanut-GB and MiniGB APU: Mahyar Koshkouei, Alex Baines and credited contributors including Lior Halphon; MIT. Pinned Peanut-GB revision `d0bcca771c83a2638c93a9ae61f3d51f226dc905`.
- Felucca: Leo Kuroshita and Huegelton Instruments; GPL-3.0-only. SMK/MusicCoach adaptations by Chance Roth / ChanceTheMaker. Retained file hashes record the imported local reference sources.
- Browser packaging/updater: retained from ChanceTheMaker/sloop-smk, with original copyright notices and hashes in provenance.
- Three unmodified JieLi AC79 SDK package files: JieLi Technology; Apache-2.0. License and attribution accompany the public template.
- Original GameDude pixel logo, startup animation and diagnostic cartridge are project assets. Game Boy and Nintendo are trademarks of Nintendo. This independent project is not affiliated with Nintendo.

The browser simulator offers illustrated FM-1, SMK-37 Pro, SMK-37 Elite and classic Game Boy layouts. Lit device controls are playable. Enlarge screen moves the same running display above the hardware panel without resetting the game. Device artwork is retained under `vendor/illustrations` and generated with `python tools/make_device_art.py`.

Restore original firmware: connect the FM-1, expand the restore section, and press **Restore M-VAVE firmware**. GameDude downloads the verified official release automatically; there is no file picker. M-VAVE lists V15 (2026-07-30) as its latest FM-1 release, checked 2026-10-13. Because its download server does not allow browser cross-origin fetches, an unmodified copy is served with the site. The complete file hash and layout are checked before any MIDI transfer; the updater verifies the `FM-1_015` restart identity. The original manufacturer binary retains its own ownership and is not GPL-licensed GameDude code. Source URL and integrity metadata are in `web/firmware/original.json`. SMK restoration uses the selected Pro or Elite factory package and verifies its model and hash before writing. Maintainers can refresh the checked copy with `node tools/fetch_original.mjs`; a changed upstream release fails verification until reviewed.

Dual-core hardware trial: FM-1_934 was installed and verified responding over USB. CPU1 now completes immutable-frame scaling while CPU0 retains GB/APU emulation, audio interrupts, controls and USB. Initial hardware samples confirmed core ID 1, an increasing completed-job count, and no CPU1 faults or fallbacks. This corrects the earlier assumption that CPU1 never started: trial 933 reached its worker loop but fell back before accepting a frame. Build 934 fixes late-completion timeout handling and removes per-pixel division from the scaler. Host tests, FM-1/SMK builds and simulated install/restore pass. The owner confirmed normal picture, controls and sound. Longer stability testing remains pending. The v2.0 flasher serves build 938, retaining CPU1 scaling, the inner directional keys and grouped LED feedback on FM-1, with CPU1 also enabled on SMK. See [CPU1 trial notes](docs/CPU1_TRIAL.md).

The site uses a classic handheld-inspired theme: warm gray plastic, green LCD surfaces, blue labels and berry action buttons. One large molded console shell surrounds the content; the individual panels and device simulator shapes are retained.

The hero tour shows one instrument at a time, then zooms into its screen: FM-1 with Block Drop, SMK-37 Pro with Super Pixel, and SMK-37 Elite with Pocket Tennis. Pause or choose a device using the tour controls. Reduced-motion preferences start the tour paused. The screens are original AI-generated retro-style mock game illustrations, not commercial screenshots or included playable games. No commercial ROM is distributed.

Restore validation: `node tests/restore.mjs <official-FM-1-V15.fwsc>` exercises package rejection and install/resume routing without opening MIDI. The retained loader simulator also passed GameDude-to-original-V15 restoration with preservation of the boot region and writes restricted to the expected ranges. This does not substitute for a physical original-firmware restore test.


## Included homebrew

The Choose panel offers Tobu Tobu Girl, GB-Wordyl (English), 2048, Libbet and the Magic Floor, Breakout, Tic-Tac-Toe, Game of Life, Bytewave and Gamepad Tester. Select a cartridge and press **Play this cartridge**, then send it to the device library over Bluetooth or USB. Multiple games stay installed.

`web/homebrew/catalog.json` records upstream versions, hashes, licenses and sources. Full notices are in `web/homebrew/NOTICE.txt` and the site's Credits page. Original ROM bytes are retained; GB-Wordyl's GPL corresponding source archive is served alongside its ROM. A free download alone is not redistribution permission: only explicitly licensed cartridges are bundled.

`npm run test:homebrew` checks every bundled cartridge's identity, starts it in the shipped WebAssembly core, exercises controls for 1,800 frames and prepares FM-1 firmware while verifying the protected USB updater. This is smoke coverage, not complete gameplay or physical hardware testing. Bytewave uses timing-sensitive wave-channel synthesis; its audio is approximate. Browser battery RAM persists locally; FM-1 cartridge RAM is lost at restart.

The public staging tool only copies manifest-listed homebrew files after verifying their ROM/source hashes, licenses and DMG compatibility. The device library accepts games up to 256 KiB; the older single-cartridge packaging fixtures cover up to 512 KiB. Private local libraries remain excluded.

The top navigation includes an Install link to the firmware panel. The footer links to SMKLAB, Doom, Felucca SMK, Sloop SMK and Melodee SMK, matching the project family navigation.

The website, simulator and build 939 firmware share a solid italic GameDude wordmark. The small-screen artwork is generated from the same glyphs as the SVG logos; game storage capacity is unchanged.
