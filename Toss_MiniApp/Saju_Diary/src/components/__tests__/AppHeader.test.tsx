// @vitest-environment jsdom
/**
 * AppHeader 렌더 스모크(jsdom).
 *
 * 검증:
 * - throw 없이 마운트되고 로고 `<img>`(웹 img, RN 금지)와 워드마크("Evry Times")가 뜬다.
 * - right 슬롯을 넘기면 함께 렌더된다.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import type { ReactElement } from 'react';
import { AppHeader } from '..';

function renderUI(ui: ReactElement) {
  return render(<TDSMobileAITProvider>{ui}</TDSMobileAITProvider>);
}

afterEach(() => {
  cleanup();
});

describe('AppHeader', () => {
  it('로고 img + 워드마크가 throw 없이 렌더된다', () => {
    expect(() => renderUI(<AppHeader />)).not.toThrow();
    expect(screen.getByText('사주 다이어리')).toBeInTheDocument();
    const logo = document.querySelector('img[src="/logo-192.png"]');
    expect(logo).not.toBeNull();
  });

  it('right 슬롯을 넘기면 함께 렌더된다', () => {
    renderUI(<AppHeader right={<span>설정</span>} />);
    expect(screen.getByText('설정')).toBeInTheDocument();
  });
});
