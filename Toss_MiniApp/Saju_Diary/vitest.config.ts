import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 기본 환경은 node(기존 순수 로직 테스트 영향 없음).
// 렌더 스모크 테스트(*.test.tsx)는 각 파일 상단의 `// @vitest-environment jsdom`로
// jsdom을 지역 적용한다. setupFiles는 jest-dom 매처 등록·DOM 정리만 하므로
// node 환경 테스트에는 영향이 없다(가드 처리됨).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/__smoke__/setup.ts'],
  },
});
