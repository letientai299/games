/// <reference types="vite/client" />

declare module "*.ttf" {
  const url: string;
  export default url;
}

declare module "*.wav" {
  const url: string;
  export default url;
}
