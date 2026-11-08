// Types for our .env variables. Vite's own fields (MODE, DEV, PROD, BASE_URL)
// come from "vite/client" in tsconfig.app.json; we add ours on top.
interface ImportMetaEnv {
  readonly VITE_OLA_MAPS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
