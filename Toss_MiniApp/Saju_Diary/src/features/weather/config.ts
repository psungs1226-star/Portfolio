// Evry Times — 날씨 공공 API 설정 (인증키 주입형, 하드코딩 금지)
//
// CLAUDE.md CRITICAL #1/#2: 외부 호출은 읽기 전용 공공 API(data.go.kr)만.
// 인증키(serviceKey)는 소스에 하드코딩하지 않는다 — 보안·유출 방지.
//
// 키 주입 방식(둘 중 택1):
//   1) 빌드/배포 시 환경 변수로 주입 → import.meta.env.VITE_DATA_GO_KR_KEY
//   2) 런타임에 setWeatherApiKey(key) 호출(예: 원격 설정에서 받아 주입)
//
// 키가 없어도 빌드·테스트는 통과한다. 키 부재 시 client는 캐시 폴백을 시도하고,
// 캐시도 없으면 명시적 에러(missing-key)를 던진다(위젯에서 안내 처리).

/**
 * data.go.kr 발급 인증키(serviceKey). 절대 하드코딩하지 마세요.
 *
 * ⚠️ 반드시 `import.meta.env.VITE_DATA_GO_KR_KEY`를 **그대로** 읽는다.
 * `import.meta?.env?.…`처럼 옵셔널 체이닝을 끼우면 Vite의 env 정적 치환이 일어나지 않아
 * 런타임에 undefined가 되어 키가 비어버린다(과거 "키 없음" 버그 원인).
 */
let serviceKey: string = import.meta.env.VITE_DATA_GO_KR_KEY ?? '';

/**
 * 런타임에 data.go.kr 인증키를 주입한다.
 * 배포 환경에서 키를 코드 밖(환경 변수·원격 설정)에서 받아 1회 설정한다.
 */
export function setWeatherApiKey(key: string): void {
  serviceKey = key ?? '';
}

/** 현재 설정된 인증키를 반환한다(없으면 빈 문자열). */
export function getWeatherApiKey(): string {
  return serviceKey;
}

/** 인증키가 설정되어 있는지 여부. */
export function hasWeatherApiKey(): boolean {
  return serviceKey.trim().length > 0;
}

/**
 * 공공 API 엔드포인트(읽기 전용, 비밀 아님).
 * 호출 도메인 `apis.data.go.kr`은 granite.config.ts 허용 목록에 등록한다.
 */
export const WEATHER_ENDPOINTS = {
  /** 기상청 단기예보 조회(getVilageFcst). */
  shortForecast:
    'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',
  /** 에어코리아 시도별 실시간 측정정보(미세먼지). */
  airQuality:
    'https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty',
  /** 기상청 생활기상지수 자외선지수(getUVIdxV4). */
  uv: 'https://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4',
} as const;

/** 허용 호출 도메인(granite.config.ts 등록용 참고). */
export const WEATHER_ALLOWED_DOMAIN = 'https://apis.data.go.kr';
