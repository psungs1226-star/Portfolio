/**
 * SajuMascot — 사주 캐릭터(PNG 마스코트).
 *
 * 종류(kind)당 **단일 완성 PNG 한 장**만 로드한다: `public/mascots/char-{kind}.png`.
 *   (레퍼런스 정합 — 오행/색 변형 폐기. 사용자는 토끼/고양이/강아지/수달 중 "종류"만 고른다.)
 * 외부/크롤링/라이선스 이미지 아님 — 자체 생성 에셋(CLAUDE.md #2/#5 준수).
 */
import type { CSSProperties } from 'react';
import type { CharacterKind } from '../../types';

/** 종류 → 한글 이름(aria). */
const KIND_KO: Record<CharacterKind, string> = { rabbit: '토끼', cat: '고양이', dog: '강아지', otter: '수달' };

/** char-{kind}.png — 종류별 단일 완성본. */
export function mascotSrc(kind: CharacterKind): string {
  return `/mascots/char-${kind}.png`;
}

export interface SajuMascotProps {
  /** 캐릭터 종류(토끼/고양이/강아지/수달). 기본 rabbit. */
  kind?: CharacterKind;
  /**
   * 크기(정사각). 숫자=px, 문자열=CSS 길이(반응형 `clamp(...)` 등). 기본 96.
   * 문자열일 땐 width/height 속성은 생략하고 style로만 크기를 잡는다.
   */
  size?: number | string;
  /** 사용자가 올린 커스텀 사진(data URL). 있으면 종류 PNG 대신 원형 크롭으로 보여준다. */
  photoUrl?: string;
  style?: CSSProperties;
}

export function SajuMascot({ kind = 'rabbit', size = 96, photoUrl, style }: SajuMascotProps) {
  // 숫자 크기일 때만 width/height HTML 속성 부여(문자열 clamp는 style로만).
  const dim = typeof size === 'number' ? { width: size, height: size } : {};
  if (photoUrl != null && photoUrl !== '') {
    return (
      <img
        src={photoUrl}
        {...dim}
        draggable={false}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '50%', display: 'block', flexShrink: 0, ...style }}
        role="img"
        aria-label="내 사주 캐릭터 — 직접 올린 사진"
      />
    );
  }
  return (
    <img
      src={mascotSrc(kind)}
      {...dim}
      draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flexShrink: 0, ...style }}
      role="img"
      aria-label={`내 사주 캐릭터 — ${KIND_KO[kind]}`}
    />
  );
}
