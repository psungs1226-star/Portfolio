/**
 * element-palette — 오행(5행) → 캐릭터 컬러. 파스텔 base + 진한 line + 볼터치.
 * serene 톤(라벤더/골드 위에 떠 보이는 부드러운 파스텔)과 어울리게 채도 적당히.
 */
import type { WuXing } from '../../types';

export interface ElementColors {
  /** 몸 베이스(밝은). */
  base: string;
  /** 윤곽선/그림자(진한). */
  deep: string;
  /** 볼터치/포인트. */
  cheek: string;
}

// 일반인 직관 우선(사람들이 바로 알아보게): 나무=초록, 불=빨강, 흙=땅 갈색, 쇠=금(골드), 물=파랑.
// (전통 정색의 金=백·水=흑은 직관과 어긋나 혼동 → 金=골드, 水=파랑, 土=갈색으로.)
export const ELEMENT_PALETTE: Record<WuXing, ElementColors> = {
  木: { base: '#A8D5B5', deep: '#4F8A65', cheek: '#F4A79C' }, // 나무=초록
  火: { base: '#EE7A5E', deep: '#C0432A', cheek: '#FBD79E' }, // 불=빨강
  土: { base: '#C79A5B', deep: '#85622F', cheek: '#E59683' }, // 흙=땅 갈색
  金: { base: '#EBC23C', deep: '#B0891C', cheek: '#E8A4B6' }, // 쇠=금(골드)
  水: { base: '#5BA3E0', deep: '#2E6BB0', cheek: '#F2AEC2' }, // 물=파랑
};

/** 공통 골드(소품 라인). */
export const CHAR_GOLD = '#C5A358';

/** 오행 → 쉬운 한글 이름(한자 X — 일반 사용자용). */
export const WUXING_KO: Record<WuXing, string> = { 木: '나무', 火: '불', 土: '흙', 金: '쇠', 水: '물' };

/** 오행 → 이모지(라벨/칩용). */
export const WUXING_EMOJI: Record<WuXing, string> = { 木: '🌳', 火: '🔥', 土: '⛰️', 金: '🪙', 水: '💧' };
