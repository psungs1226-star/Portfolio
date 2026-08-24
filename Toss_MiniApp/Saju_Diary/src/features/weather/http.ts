// Evry Times — 날씨 공공 API HTTP 경유 단일 시임(seam)
//
// 모든 네트워크 호출은 이 모듈 한 곳을 통과한다(테스트에서 mock 주입 가능).
// 웹 React(@apps-in-toss/web-framework) 환경에서는 표준 fetch가 곧 앱 WebView의
// 네트워크 경로다. 별도 http 모듈 export가 없으므로 fetch를 단일 어댑터로 래핑한다.
// (RN 환경이라면 여기서만 SDK http로 교체하면 되도록 격리.)
//
// CRITICAL #1/#2: 읽기 전용 공공 API(data.go.kr) GET만 사용. 데이터 전송 없음.

/** GET 응답(JSON 파싱 전 원문 + 상태). */
export interface HttpResponse {
  ok: boolean;
  status: number;
  /** 응답 본문(JSON 문자열). */
  text: string;
}

/** HTTP 어댑터. GET URL → 응답. 테스트에서 메모리 mock으로 교체한다. */
export interface HttpAdapter {
  get(url: string): Promise<HttpResponse>;
}

/** 기본 어댑터 = 전역 fetch(웹 WebView 네트워크). */
const defaultAdapter: HttpAdapter = {
  async get(url: string): Promise<HttpResponse> {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  },
};

let adapter: HttpAdapter = defaultAdapter;

/** HTTP 어댑터를 교체한다(테스트 전용). 인자 없이 호출하면 기본으로 복귀. */
export function setHttpAdapter(next?: HttpAdapter): void {
  adapter = next ?? defaultAdapter;
}

/** URL 쿼리스트링을 만든다(값은 encodeURIComponent). */
export function buildQuery(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/**
 * 공공 API GET 호출 후 JSON 파싱. 비-2xx·파싱 실패는 throw.
 * @throws Error 네트워크 실패·HTTP 에러·JSON 파싱 실패 시.
 */
export async function getJson<T>(url: string): Promise<T> {
  const res = await adapter.get(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    // data.go.kr은 키 오류 시 XML/HTML을 반환하기도 한다 → JSON 아님.
    throw new Error('INVALID_JSON');
  }
  return parsed as T;
}
