import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "node:path";
import AutoImport from "unplugin-auto-import/vite";
import { VitePWA } from "vite-plugin-pwa";

const base = process.env.BASE_PATH || "/";
const isPreview = process.env.IS_PREVIEW ? true : false;
// The plain SPA shell, emitted next to index.html. scripts/prerender.mjs
// overwrites index.html with the prerendered home page, so everything that
// needs the empty shell (hub/proposal routes via vercel.json, the service
// worker's navigation fallback) points at app.html instead.
const appShell = (): Plugin => ({
  name: "huna-app-shell",
  apply: "build",
  enforce: "post",
  generateBundle(_, bundle) {
    const index = bundle["index.html"];
    if (index && index.type === "asset") {
      this.emitFile({ type: "asset", fileName: "app.html", source: index.source });
    }
  },
});

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  define: {
    __BASE_PATH__: JSON.stringify(base),
    __IS_PREVIEW__: JSON.stringify(isPreview),
    __READDY_PROJECT_ID__: JSON.stringify(process.env.PROJECT_ID || ""),
    __READDY_VERSION_ID__: JSON.stringify(process.env.VERSION_ID || ""),
    __READDY_AI_DOMAIN__: JSON.stringify(process.env.READDY_AI_DOMAIN || ""),
  },
  plugins: [
    react(),
    AutoImport({
      imports: [
        {
          react: [
            "React",
            "useState",
            "useEffect",
            "useContext",
            "useReducer",
            "useCallback",
            "useMemo",
            "useRef",
            "useImperativeHandle",
            "useLayoutEffect",
            "useDebugValue",
            "useDeferredValue",
            "useId",
            "useInsertionEffect",
            "useSyncExternalStore",
            "useTransition",
            "startTransition",
            "lazy",
            "memo",
            "forwardRef",
            "createContext",
            "createElement",
            "cloneElement",
            "isValidElement",
          ],
        },
        {
          "react-router-dom": [
            "useNavigate",
            "useLocation",
            "useParams",
            "useSearchParams",
            "Link",
            "NavLink",
            "Navigate",
            "Outlet",
          ],
        },
        // React i18n
        {
          "react-i18next": ["useTranslation", "Trans"],
        },
      ],
      dts: true,
    }),
    !isSsrBuild && appShell(),
    !isSsrBuild && VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon-32x32.png'],
      manifest: {
        name: 'Sentro Hub',
        short_name: 'Sentro',
        description: 'Huna Creatives agency operations hub',
        theme_color: '#6366f1',
        background_color: '#f8faff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/hub/login',
        scope: '/',
        icons: [
          { src: '/favicon-32x32.png',   sizes: '32x32',   type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        // index.html is rewritten after this manifest is built (prerender);
        // the worker serves app.html for navigations instead.
        globIgnores: ['index.html'],
      },
      devOptions: { enabled: false },
    }),
  ],
  base,
  build: {
    sourcemap: !isSsrBuild,
    outDir: isSsrBuild ? "out-ssr" : "out",
    // The SSR bundle only feeds scripts/prerender.mjs; public/ belongs in out/.
    copyPublicDir: !isSsrBuild,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    host: "0.0.0.0",
  },
}));
