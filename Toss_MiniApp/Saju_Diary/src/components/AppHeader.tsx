/**
 * AppHeader — 앱 상단 로고 + 워드마크("사주 다이어리").
 *
 * 사용자 피드백 #10("로고랑 어플 이름 상단에 왜 안넣어놔")을 반영해 탭 화면 상단에 고정 노출한다.
 * 로고는 웹 `<img>`로만 렌더한다(CRITICAL #5 — RN `Image` 금지). 새 라이브러리/폰트 미사용.
 * 색·간격은 theme/tokens(cute/BRAND) 참조. safe-area 상단 패딩 고려.
 *
 * sticky 헤더라 콘텐츠가 가려지지 않으며, 온보딩/운세 오버레이(자체 상단 보유)에는 쓰지 않는다.
 */
import type { CSSProperties, ReactNode } from 'react';
import { BRAND, spacing, warm } from '../theme/tokens';

/** 헤더 높이(px, safe-area 제외). 작고 깔끔하게. */
export const APP_HEADER_HEIGHT = 52;

export interface AppHeaderProps {
  /** 오른쪽 액션 슬롯(선택) — 설정/공유 버튼 등. */
  right?: ReactNode;
}

export function AppHeader({ right }: AppHeaderProps = {}) {
  const barStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 90,
    display: 'flex',
    alignItems: 'center',
    height: APP_HEADER_HEIGHT,
    // 상단 여백 확보(#1): safe-area 위에 항상 최소 여백을 더해 상태바/노치에 붙지 않게 한다.
    // 브라우저(safe-area=0)에서도 상단이 답답하지 않다.
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
    paddingLeft: spacing.xl,
    paddingRight: spacing.xl,
    // 파스텔 그라데이션 위에 떠 있는 프로스티드(반투명+블러) 바 — 스크롤 시 내용이 비쳐 흐른다.
    backgroundColor: warm.headerGlass,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxSizing: 'content-box',
  };

  const brandStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
  };

  const wordmarkStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: -0.2,
    // 단색 토프(그라데이션 없음, 사용자 요청).
    color: BRAND.primary,
  };

  return (
    <header style={barStyle} aria-label="앱 헤더">
      <div style={brandStyle}>
        <img
          src="/logo-192.png"
          width={28}
          height={28}
          alt="사주 다이어리 로고"
          style={{ borderRadius: 8, display: 'block' }}
        />
        <span style={wordmarkStyle}>사주 다이어리</span>
      </div>
      {right != null && <div style={{ marginLeft: 'auto' }}>{right}</div>}
    </header>
  );
}
