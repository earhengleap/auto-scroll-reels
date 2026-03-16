# Instagram Reels Auto-Advance

A Chrome Extension that automatically advances to the next Instagram Reel when the current video finishes, with a polished popup UI and secure production build pipeline.

## Highlights

- Smooth auto-advance behavior near end-of-playback
- Professional, minimalist extension popup UI
- Runtime status indicator (`Active`, `Ready`, `Not on IG`, `Locked`)
- Production hardening support:
  - Minification
  - JavaScript obfuscation
  - Optional extension ID runtime lock

## Project Structure

```text
.
|-- src/                # Source files used for release builds
|   |-- content.js
|   |-- popup.js
|   |-- popup.html
|   `-- manifest.json
|-- dist/               # Generated build output
|-- build.mjs           # Build script (dev + prod modes)
|-- content.js          # Local/runtime copy for unpacked dev
|-- popup.js
|-- popup.html
|-- manifest.json
|-- RELEASE.md          # Release/security notes
`-- package.json
```

## Quick Start (Local Development)

1. Install dependencies:

```powershell
npm install
```

2. Build development output:

```powershell
npm run build
```

3. Load extension in Chrome:
- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select this project folder (or `dist` if you want build output)

## Production Build (Recommended for Release)

Set your real extension ID(s), then build:

```powershell
$env:ALLOWED_EXTENSION_IDS="YOUR_REAL_EXTENSION_ID"
npm run build:prod
```

For multiple allowed IDs:

```powershell
$env:ALLOWED_EXTENSION_IDS="id_one,id_two"
npm run build:prod
```

Publish the generated `dist` folder to Chrome Web Store.

## Security Notes

- Browser extensions are client-side, so code cannot be fully hidden.
- This project uses obfuscation/minification and optional runtime ID lock to increase resistance to reuse.
- For stronger protection, move sensitive logic to a backend service with authenticated API calls.

## Permissions Scope

The extension is scoped to Instagram Reels paths:

- `https://www.instagram.com/reels/*`
- `https://www.instagram.com/reel/*`

## License

Add your preferred license before public release.
