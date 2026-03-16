# Release Build and Security Notes

This extension now uses a secure release pipeline.

## 1) Install build dependencies

```powershell
npm install
```

## 2) Create a production build

Set your Chrome Web Store extension ID(s) so the release build is runtime-locked:

```powershell
$env:ALLOWED_EXTENSION_IDS="your_extension_id_here"
npm run build:prod
```

If you support multiple signed IDs, separate with commas:

```powershell
$env:ALLOWED_EXTENSION_IDS="id_one,id_two"
npm run build:prod
```

## 3) Publish only the `dist` folder

Upload the files from `dist` to Chrome Web Store.

## Important limitations

- Browser extension code is always client-side, so it cannot be made fully secret.
- Obfuscation and minification raise the difficulty of copying/reusing code.
- For strong protection, move sensitive logic to a backend API with authentication.
