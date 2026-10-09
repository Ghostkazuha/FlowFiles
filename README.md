<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ffa3eee5-c74c-4276-b818-8bb7305a6951

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Filesystem modes

- Browser preview uses an in-memory demo filesystem.
- The Windows desktop app (`npx tauri dev`) lists Windows drives and reads real directories through the Rust backend.
- Native filesystem access is read-only for now; creating, copying, moving, renaming, and deleting files are not implemented.

## Windows desktop builds

From the project root, use these commands to run or build the Tauri desktop app:

```sh
npm run build
npx tauri dev
npx tauri build
```

`npx tauri build` creates the Windows desktop application and installer.
