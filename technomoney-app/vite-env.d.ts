/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare module "jwt-decode" {
  const jwtDecode: (token: string) => any;
  export default jwtDecode;
}
