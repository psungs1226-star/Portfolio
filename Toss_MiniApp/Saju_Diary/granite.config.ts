import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "today-morning",
  brand: {
    displayName: "사주 다이어리", // 화면에 노출될 앱 이름
    primaryColor: "#534AB7", // 포인트 보라 (TECH_STACK 테마 토큰)
    icon: "/logo-512.png", // 리스팅 아이콘 (public 자산 → 빌드 시 루트로 복사). 콘솔 업로드 시에도 이 512×512 PNG 사용.
  },
  web: {
    // 샌드박스(폰) 테스트 시: 아래 host를 `npm run dev`가 출력하는 "Network" IP로 바꾸세요.
    // (폰과 같은 Wi-Fi 필요. localhost는 같은 PC 브라우저 전용.)
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite --host", // --host: LAN 노출(샌드박스 앱이 접속 가능하게)
      build: "vite build",
    },
  },
  // 날씨: 현재 위치 → 격자 변환에 위치 권한 필요(ARCHITECTURE §6).
  permissions: [{ name: "geolocation", access: "access" }],
  // 날씨 공공 API 호출 도메인(읽기 전용·비밀 아님):
  //   https://apis.data.go.kr — 기상청 단기예보 · 에어코리아 미세먼지 · 생활기상지수 자외선.
  // (이 web-framework config에는 네트워크 도메인 allowlist 필드가 없다.
  //  외부 호출 도메인 등록은 앱인토스 콘솔/배포 설정에서 처리한다. 키도 코드 밖에서 주입.
  //  도메인 상수는 src/features/weather/config.ts WEATHER_ALLOWED_DOMAIN 단일 출처.)
  outdir: "dist",
});
