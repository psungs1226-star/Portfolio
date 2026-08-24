// diary-image 단위 테스트 — canvas 미지원(node) 환경에서 안전 폴백.
// 실제 PNG 픽셀 검증은 범위 밖(브라우저/기기). 여기선 크래시 0 + 폴백 계약만 본다.

import { describe, it, expect } from 'vitest';
import { buildDiaryPng, saveDiaryImage } from './diary-image';

const INPUT = { date: '2026-06-16', title: '좋은 하루', mood: 4, text: '오늘은 산책했다.' };

describe('diary-image', () => {
  it('canvas 미지원(node)에서는 buildDiaryPng가 null이다(크래시 0)', () => {
    expect(buildDiaryPng(INPUT)).toBeNull();
  });

  it('saveDiaryImage는 미지원 환경에서 "unsupported"를 반환한다(throw 없음)', async () => {
    await expect(saveDiaryImage(INPUT)).resolves.toBe('unsupported');
  });
});
