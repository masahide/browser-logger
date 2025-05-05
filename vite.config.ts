import { defineConfig, type UserConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { crx, defineManifest, type ManifestV3Export, } from '@crxjs/vite-plugin';


const defaultManifest: ManifestV3Export = {
  manifest_version: 3,
  name: "browser Logger",
  description: "A Chrome extension with browser logging capabilities",
  version: "1.0.0",
  permissions: ["sidePanel", "webRequest"],
  host_permissions: ["<all_urls>",],
  background: {
    service_worker: "src/background.ts",

  },
  content_scripts: [
    {
      matches: ["https://*.slack.com/*"],
      js: ["src/content_scripts/slack.ts"],
      run_at: "document_idle",
    },
  ],

  action: {
    default_popup: "index.html",
  },
  side_panel: {
    default_path: "index.html",
  },
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
};

const devManifest: ManifestV3Export = defineManifest({
  ...defaultManifest,
  name: `${defaultManifest.name} (dev)`,
  host_permissions: ["<all_urls>",],
});

const defaultViteConfig: UserConfig = {
  plugins: [svelte(), crx({ manifest: defaultManifest })],
  legacy: { skipWebSocketTokenCheck: true, },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5174 },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
};

const devViteConfig: UserConfig = {
  ...defaultViteConfig,
  plugins: [svelte(), crx({ manifest: devManifest })],
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  if (command === "serve") {
    return devViteConfig;
  }
  return defaultViteConfig;
});