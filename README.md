<img src="assets/icons/icon.png" alt="logo" align="right" height="60px" width="60px" />

# Feishin (simaolavos fork)

A personal, trimmed-down fork of [Feishin](https://github.com/jeffvli/feishin), the desktop client for Navidrome, Jellyfin and OpenSubsonic servers. It is built for my own use and tracks upstream loosely.

---

## What is different from upstream

- **Click a track number to play it.** The hover popup (play now / next / last) is gone. Right-click a row for those options and more.
- **Play song and rest of list.** New setting (Settings > Controls) that queues the rest of the list after the song you play.
- **Translucent window.** Frameless bar styles use a transparent window, with translucent sidebar, sticky headers, settings, modals and mobile layout.
- **Google Cast.** The cast button in the player bar plays to Chromecast, Google Home / Nest devices and speaker groups. It replaces upstream's DLNA casting, so Sonos and other DLNA-only renderers are not supported.
- **Less bloat.** Genre browsing, internet radio and the home carousel are removed.

Everything else (MPV and web player backends, scrobbling, lyrics, smart playlist editor for Navidrome) is inherited from upstream.

## Screenshots

Screenshots in `media/` are from upstream and do not show this fork's UI.

## Getting started

There are no published releases for this fork. Build it locally.

```sh
pnpm install
pnpm dev            # run from source
pnpm package:dev    # unpacked app in dist/ (macOS needs Xcode 26+ for the default icon)
```

On macOS without Xcode, override the icon and skip signing:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --dir --mac --arm64 -c.mac.icon=resources/icon.png
```

Then copy `dist/mac-arm64/Feishin.app` to `/Applications`. The app is unsigned, so right-click > Open on first launch.

### First run

1. Set the path to your MPV binary when prompted (get MPV from [mpv.io](https://mpv.io/installation/)), then restart.
2. Open the menu > `Manage servers` > `Add server`, and enter the full server URL including protocol and port (e.g. `http://192.168.0.1:4533`).

For Navidrome, tick "Save password" and raise `SessionTimeout` in the Navidrome config (e.g. `72h`).

### Casting

Click the cast icon in the player bar, pick a device, and playback moves to it at the current position. Disconnect to continue on the computer.

- Desktop app only. On macOS, allow the "find devices on your local network" prompt the first time.
- The device fetches the stream itself, so the server URL must be reachable from it. `localhost` and LAN-only `http` hostnames are rewritten to IP addresses; a LAN-only `https` hostname will not work.
- MP3, AAC, FLAC, Opus, Vorbis and WAV play directly. Enable transcoding in playback settings for anything else (ALAC, WMA, DSD).
- No gapless playback or playback speed control on the device.

More docs: [custom themes](docs/CUSTOM_THEMES.md), [settings via environment variables](docs/ENV_SETTINGS.md).

## Development

Node `v23.11.0`, built on [electron-vite](https://github.com/alex8088/electron-vite). See `package.json` for all scripts.

- `pnpm dev` - development server
- `pnpm build` - build the app
- `pnpm typecheck` - type check
- `pnpm lint` / `pnpm lint:fix` - lint

Contribution and commit conventions are in `CONTRIBUTING.md` and `docs/agents/`.

## Credits and license

All credit for the app goes to [jeffvli](https://github.com/jeffvli) and the Feishin contributors. This fork stays under the same license: [GNU General Public License v3.0](LICENSE).
