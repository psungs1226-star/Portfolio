// @vitest-environment jsdom
/**
 * BirthInputs / SizePreview 렌더 스모크(jsdom).
 *
 * 검증:
 * - 생년월일은 숫자 마스킹 텍스트 입력(YYYY.MM.DD), 회색 예시 플레이스홀더.
 * - 시간 입력 모드가 기본(timeUnknown=false면 `<input type="time">` 노출).
 * - "모름" 옵션이 기본 off일 때 시간 입력이 보이고, on이면 숨는다.
 * - 변경 시 onChange(patch)로 올려보낸다(저장 안 함 — 호출부 책임).
 * - SizePreview는 size를 바꾸면 미리보기에 반영된다(data-size).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import type { ReactElement } from 'react';
import { BirthInputs } from '..';

function renderUI(ui: ReactElement) {
  return render(<TDSMobileAITProvider>{ui}</TDSMobileAITProvider>);
}

afterEach(() => cleanup());

describe('BirthInputs', () => {
  it('생년월일은 숫자 마스킹 텍스트 입력 + 회색 예시 플레이스홀더다(#3)', () => {
    renderUI(
      <BirthInputs
        birthDate=""
        birthTime=""
        timeUnknown={false}
        isLunar={false}
        onChange={() => {}}
        maxDate="2026-06-16"
      />,
    );
    const dateInput = screen.getByLabelText('생년월일') as HTMLInputElement;
    expect(dateInput.type).toBe('text');
    expect(dateInput.inputMode).toBe('numeric');
    expect(dateInput.placeholder).toBe('예: 1990.01.01');
  });

  it('숫자를 입력하면 YYYY.MM.DD로 포맷한다(202512 → 2025.12, 배치 보정)', () => {
    renderUI(
      <BirthInputs
        birthDate=""
        birthTime=""
        timeUnknown={false}
        isLunar={false}
        onChange={() => {}}
        maxDate="2026-06-16"
      />,
    );
    const dateInput = screen.getByLabelText('생년월일') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '202512' } });
    expect(dateInput.value).toBe('2025.12');
    fireEvent.change(dateInput, { target: { value: '19900101' } });
    expect(dateInput.value).toBe('1990.01.01');
  });

  it('시간 입력 모드가 기본(timeUnknown=false면 오전/오후 탭 + 시·분 숫자 노출, #3)', () => {
    renderUI(
      <BirthInputs
        birthDate=""
        birthTime=""
        timeUnknown={false}
        isLunar={false}
        onChange={() => {}}
      />,
    );
    // 오전/오후 탭 + 시·분 숫자 입력(#3 — type=time 대신).
    expect(screen.getByRole('button', { name: '오전' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '오후' })).toBeInTheDocument();
    expect(screen.getByLabelText('태어난 시(1~12)')).toBeInTheDocument();
    expect(screen.getByLabelText('태어난 분(0~59)')).toBeInTheDocument();
    // "모름" 옵션은 존재하되 off 상태로 시작.
    expect(screen.getAllByLabelText('태어난 시간을 몰라요').length).toBeGreaterThan(0);
  });

  it('오전/오후 탭 + 시 입력 시 onChange가 HH:mm(24h)으로 합성한다(#3)', () => {
    const onChange = vi.fn();
    renderUI(
      <BirthInputs
        birthDate=""
        birthTime=""
        timeUnknown={false}
        isLunar={false}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '오후' }));
    fireEvent.change(screen.getByLabelText('태어난 시(1~12)'), { target: { value: '1' } });
    // 오후 1시 → 13:00.
    expect(onChange).toHaveBeenLastCalledWith({ birthTime: '13:00' });
  });

  it('"모름"이 켜지면 시간 입력이 숨는다', () => {
    renderUI(
      <BirthInputs
        birthDate=""
        birthTime=""
        timeUnknown={true}
        isLunar={false}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByLabelText('태어난 시(1~12)')).toBeNull();
  });

  it('생년월일 변경 시 onChange(patch)로 올려보낸다', () => {
    const onChange = vi.fn();
    renderUI(
      <BirthInputs
        birthDate=""
        birthTime=""
        timeUnknown={false}
        isLunar={false}
        onChange={onChange}
        maxDate="2026-06-16"
      />,
    );
    fireEvent.change(screen.getByLabelText('생년월일'), {
      target: { value: '1990-05-15' },
    });
    expect(onChange).toHaveBeenCalledWith({ birthDate: '1990-05-15' });
  });

  it('유효하지 않은 날짜면 에러 문구를 보여준다', () => {
    renderUI(
      <BirthInputs
        birthDate="1990-13-40"
        birthTime=""
        timeUnknown={false}
        isLunar={false}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('생년월일을 다시 확인해주세요.')).toBeInTheDocument();
  });
});
