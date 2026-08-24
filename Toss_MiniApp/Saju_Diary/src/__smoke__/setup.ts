/**
 * vitest 전역 setup — 렌더 스모크 테스트 지원.
 *
 * - @testing-library/jest-dom 매처(toBeInTheDocument 등) 등록.
 * - 각 테스트 후 마운트된 DOM 정리(누수/상호 간섭 방지).
 *
 * 이 파일은 모든 테스트에 적용되지만, jest-dom은 expect만 확장하고
 * cleanup은 document가 있을 때(jsdom 환경)만 동작하므로 node 환경
 * 순수 로직 테스트에는 영향을 주지 않는다.
 */
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ── jsdom 환경 폴리필 (테스트 전용, 런타임 코드 무변경) ──
// jsdom은 브라우저 API 일부를 구현하지 않는다. TDS 컴포넌트(Provider·Switch·SegmentedControl 등)는
// 마운트 시 matchMedia·ResizeObserver·canvas/애니메이션 API를 호출하므로, 실제 WebView에선
// 정상이지만 jsdom에선 마운트가 깨진다 → 표준 폴리필로 환경 격차를 메운다.
if (typeof window !== 'undefined') {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (typeof window.ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
  }

  // TDS 애니메이션 엔진이 canvas 2D 컨텍스트를 init한다(jsdom은 getContext가 null).
  if (typeof HTMLCanvasElement !== 'undefined') {
    const proto = HTMLCanvasElement.prototype as unknown as {
      getContext?: (...args: unknown[]) => unknown;
    };
    if (proto.getContext == null) {
      proto.getContext = () => null;
    }
  }

  // TDS Switch는 GSAP로 터치 애니메이션을 한다. GSAP는 getComputedStyle().transform을
  // 행렬로 파싱하는데(`str.match(...).map(...)`), jsdom이 돌려주는 transform 값이 파싱
  // 패턴과 안 맞으면 `null.map` 크래시가 난다. transform 계열을 'none'으로 정규화해
  // GSAP의 항등행렬 빠른경로를 타게 한다(테스트 환경 한정).
  const TRANSFORM_PROPS = new Set([
    'transform',
    'webkitTransform',
    'WebkitTransform',
    'MozTransform',
    'msTransform',
    'OTransform',
  ]);
  // TDS는 mono 아이콘 SVG를 fetch로 지연 로드한다(IconButton·Tabbar 등). jsdom엔 fetch가
  // 없거나 상대 URL을 거부해 "Wrong URL"이 비동기로 던져진다 → 빈 SVG로 폴백(테스트 한정).
  const stubFetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      json: () => Promise.resolve({}),
    }),
  ) as unknown as typeof fetch;
  window.fetch = stubFetch;
  (globalThis as { fetch?: unknown }).fetch = stubFetch;

  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
    const style = originalGetComputedStyle(el, pseudo ?? undefined);
    return new Proxy(style, {
      get(target, prop, receiver) {
        // jsdom은 transform을 행렬로 계산하지 않고 입력 문자열을 그대로 돌려준다.
        // GSAP의 행렬 파서는 이를 처리하지 못하므로 항상 'none'으로 정규화해
        // 항등행렬 빠른경로를 강제한다(애니메이션 최종 위치는 테스트에서 무의미).
        if (typeof prop === 'string' && TRANSFORM_PROPS.has(prop)) {
          return 'none';
        }
        if (prop === 'getPropertyValue') {
          return (name: string) => {
            if (/(^|-)transform$/i.test(name)) {
              return 'none';
            }
            return target.getPropertyValue(name);
          };
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }) as typeof window.getComputedStyle;
}

afterEach(async () => {
  // jsdom 환경에서만 RTL cleanup 수행. node 환경에서는 document가 없어 건너뛴다.
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});
