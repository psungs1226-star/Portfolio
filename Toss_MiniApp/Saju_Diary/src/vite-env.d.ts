/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** data.go.kr 발급 인증키(serviceKey). .env의 VITE_DATA_GO_KR_KEY로 주입. */
  readonly VITE_DATA_GO_KR_KEY?: string;
}

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
