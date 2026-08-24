/**
 * DiaryScreen — 일기 탭 (PRD §6.5).
 *
 * 하루 1개(date가 키). 기분 별점(TDS Rating) + 본문 작성/수정.
 * 디자인: **이쁜 일기장에 동글동글 손글씨로 적는 느낌**(사용자 요청) — 연분홍 배경 위에 거의
 *   흰빛(최대한 연한) 페이지를 살짝 액자느낌(흰 라이너 + 분홍 매트)으로 끼우고, 본문은 물결무늬
 *   괘선 위에 동글동글 손글씨(Dongle)로 적는다. 그날의 기록(날씨·운세)은 짧게 위에 적는다.
 * 차별점: 작성 시 그날 날씨·운세를 헤더에 **자동 박제**(스냅샷 복사 저장).
 *   - 날씨 스냅샷 = 캐시된 WeatherBundle 요약(loadWeatherCache — 네트워크 강제 X).
 *   - 운세 스냅샷 = settings.saju로 산출한 그날 운세 요약(fortune 모듈 재사용, 메모리 계산).
 *
 * 저장은 storage loadDiaries/saveDiaries 접근자만(CRITICAL #1). 일기=민감정보 → 외부 전송 0.
 * 상태 변형·스냅샷 빌드는 순수 diary-ops로 분리. 별점=TDS Rating 재사용(재구현 금지, CRITICAL #5).
 * 손글씨는 .handwriting 클래스(App.css, 전역 Jua를 #root 특이도로 덮어씀). 웹 React + inline style.
 */
import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { Top } from '@toss/tds-mobile';
import { palette, spacing, radius } from '../../theme/tokens';

// ── 일기장 팔레트 [라벤더 정합: 연라벤더/순백 한 가족 + 보라 포인트, 손글씨 감성 유지] ──
/** 보라 포인트 — 날짜 제목/저장 버튼/액센트(홈 CTA와 같은 가족). */
const CLAY = '#9A77D6';
/** 헤더(날짜·날씨·운세) 폰트 — 이미지 저장의 헤더와 동일한 둥근 Jua(디폴트). 손글씨 글씨체 선택과 무관하게 고정. */
const HEADER_FONT = "'Jua', 'Pretendard', sans-serif";
/** 종이(페이지) 표면 — 순백. */
const PAPER = '#FFFFFF';
/** 연한 라벤더(이미지 저장 버튼). */
const PAPER_DEEP = '#E7DEF6';
/** 물결 괘선 색(아주 옅은 라벤더, SVG stroke용 hex). */
const WAVE_HEX = '#E1D7F2';
/** 보조 보라 포인트(날짜 꼬리표/체크/별점 링크). */
const MARGIN_LINE = 'rgba(154, 119, 214, 0.50)';
/** 액자 매트(프레임) 색 — 연한 라벤더. */
const FRAME_MAT = '#EFEAF9';
/** 안쪽 점선 스티치 액자 색 — 중간 라벤더(장식 테두리, 너무 진하지 않게). */
const STITCH = 'rgba(154, 119, 214, 0.36)';
/** 일기 화면 배경(메모지 뒤) — 순백. */
const DIARY_BG = '#ffffff';
/** 손글씨 잉크(부드러운 진한 플럼 — 가독+귀여움). */
const INK = '#3A2F4A';
/** 보조 잉크(날짜/캡션). */
const INK_SOFT = '#A99FC0';
/** 줄 간격(px) — 손글씨 lineHeight와 동일. */
const RULE_H = 34;
/** 종이 모서리 둥글기. */
const PAGE_RADIUS = 18;

/** 물결 괘선 배경(반복 SVG, 그라데이션/직선 아님 — 사용자 요청). 한 타일 = 40 × RULE_H. */
const WAVE_TILE = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='${RULE_H}'><path d='M0 ${RULE_H - 3} q10 -2.5 20 0 t20 0' fill='none' stroke='${WAVE_HEX}' stroke-width='1'/></svg>`;
const WAVE_BG = `url("data:image/svg+xml,${encodeURIComponent(WAVE_TILE)}")`;

/** 제목 글자 크기(작게/보통/크게) → px. */
const TITLE_SIZE_PX: Record<DiaryTitleSize, number> = {
  small: 22,
  medium: 28,
  large: 34,
};
import type { Diary, DiaryTitleSize, DiaryFont, Memo, Dday, Settings, SajuInput, TarotCard } from '../../types';

/** 일기 손글씨 글씨체 선택지(자체 호스팅 OFL). label은 각 폰트로 렌더해 미리보기. */
const DIARY_FONTS: { id: DiaryFont; label: string; css: string }[] = [
  { id: 'dongle', label: '동글', css: "'Dongle'" },
  { id: 'poorstory', label: '푸어스토리', css: "'PoorStory'" },
  { id: 'himelody', label: '하이멜로디', css: "'HiMelody'" },
  { id: 'gaegu', label: '개구', css: "'Gaegu'" },
];
const DEFAULT_DIARY_FONT: DiaryFont = 'dongle';
function fontCss(id: DiaryFont): string {
  return DIARY_FONTS.find((f) => f.id === id)?.css ?? "'PoorStory'";
}
import { loadDiaries, saveDiaries, loadSettings, saveSettings, loadMemos, loadTarotPick, loadDdays } from '../../features/storage';
import { loadWeatherCache } from '../../features/weather';
import { todayDateString } from '../../features/fortune/manse';
import { pickTarotAt } from '../../features/fortune/phrases';
import { completedTodosForDate, memosForDate } from '../../widgets/memo-ops';
import { ddayLabel, daysUntil } from '../../widgets/dday-calc';
import { computeTodayFortune } from '../../widgets/fortune-today';
import { runAfterAd } from '../../features/ads';
import {
  buildWeatherSnapshot,
  buildFortuneSnapshot,
  upsertDiary,
  diaryForDate,
  type WeatherSnapshot,
  type FortuneSnapshot,
} from './diary-ops';
import { saveDiaryImage } from './diary-image';

// ── 날짜 유틸(로컬, Date 객체는 화면 내부에서만 — 저장은 항상 YYYY-MM-DD) ──

/** `YYYY-MM-DD`에서 하루 이동한 날짜 문자열(UTC 자정 기준 — 타임존 안전). */
function shiftDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + deltaDays * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** 사람이 읽는 날짜 라벨(예: '6월 14일 토요일'). */
function dateLabelLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 ${wd}요일`;
}

/** 오늘/어제 꼬리표(없으면 빈 문자열). */
function relativeTag(date: string, today: string): string {
  if (date === today) return '오늘';
  if (date === shiftDate(today, -1)) return '어제';
  return '';
}

export interface DiaryScreenProps {
  /** 기준 '오늘' `YYYY-MM-DD`. 테스트/미리보기 주입. 기본 오늘(로컬). */
  today?: string;
  /** 탭 패널 임베드 모드 — 자체 Top 헤더/배경 제거(상위가 AppBar+SegTabs 제공). */
  embedded?: boolean;
}

export function DiaryScreen({ today = todayDateString(), embedded = false }: DiaryScreenProps) {
  const [diaries, setDiaries] = useState<Diary[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [ddays, setDdays] = useState<Dday[]>([]);
  const [viewDate, setViewDate] = useState(today);

  // 편집 폼 상태(viewDate에 종속).
  const [mood, setMood] = useState(3);
  // 기분 별점은 맨 아래 "오늘 평가하기"를 눌러야 펼친다(#6). 이미 작성한 날은 펼친 상태로 시작.
  const [showRating, setShowRating] = useState(false);
  const [title, setTitle] = useState('');
  // 제목 글자 크기 기본은 '작게'(#5). 이미 작성한 날은 저장된 값으로 동기화.
  const [titleSize, setTitleSize] = useState<DiaryTitleSize>('small');
  // 손글씨 글씨체(사용자 선택, settings.diary.font에 저장). 기본 푸어스토리.
  const [font, setFont] = useState<DiaryFont>(DEFAULT_DIARY_FONT);
  const [text, setText] = useState('');
  // 첨부 사진 1장(다운스케일 JPEG dataURL). 로컬 전용 — 앱 기록 삭제 시 사라짐(이미지 저장 안내).
  const [photo, setPhoto] = useState<string | null>(null);
  // 작성 시점 스냅샷(아직 저장 전 미리보기 + 저장에 그대로 복사).
  const [weatherSnap, setWeatherSnap] = useState<WeatherSnapshot | null>(null);
  const [fortuneSnap, setFortuneSnap] = useState<FortuneSnapshot | null>(null);
  // 타로 카드 객체(이미지 경로용 index 포함). 일기 기록 표시에선 타로 제외(사용자 요청).
  const [tarotCard, setTarotCard] = useState<TarotCard | null>(null);
  const [saved, setSaved] = useState(false);
  // 이미지 저장 결과 안내(일시).
  const [imgMsg, setImgMsg] = useState<string | null>(null);

  // 로컬 Storage 로드(접근자만 — 네트워크 0).
  useEffect(() => {
    let alive = true;
    Promise.all([loadDiaries(), loadSettings(), loadMemos(), loadDdays()])
      .then(([list, s, m, d]) => {
        if (!alive) return;
        setDiaries(list);
        setSettings(s);
        setMemos(m);
        setDdays(d);
        setFont(s.diary?.font ?? DEFAULT_DIARY_FONT);
      })
      .catch(() => {
        if (!alive) return;
        setDiaries([]);
        setSettings(null);
        setMemos([]);
        setDdays([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const existing = useMemo(
    () => (diaries == null ? null : diaryForDate(diaries, viewDate)),
    [diaries, viewDate],
  );

  // 그날 타로(가벼운 연동, #13): 저장된 pick의 date가 viewDate와 같고 생일이 있으면 카드명을 보여준다.
  useEffect(() => {
    const clear = () => {
      setTarotCard(null);
    };
    if (settings == null) {
      clear();
      return;
    }
    const saju = settings.saju;
    if (saju == null || saju.birthDate === '') {
      clear();
      return;
    }
    let alive = true;
    loadTarotPick()
      .then((p) => {
        if (!alive) return;
        if (p != null && p.date === viewDate) {
          try {
            const c = pickTarotAt(saju.birthDate, viewDate, p.pickedIndex);
            setTarotCard(c);
          } catch {
            clear();
          }
        } else {
          clear();
        }
      })
      .catch(() => alive && clear());
    return () => {
      alive = false;
    };
  }, [settings, viewDate]);

  // 그날 "한 일"(완료한 메모). 설정에서 끄면(showDoneList===false) 일기/이미지에서 숨긴다(#8).
  const doneTodos = useMemo(() => completedTodosForDate(memos, viewDate), [memos, viewDate]);
  const showDone = settings?.diary?.showDoneList !== false;
  // 그날 "남은 할 일"(해당 날짜 메모 중 미완료 할 일) — 일기에 연동(사용자 요청).
  const remainingTodos = useMemo(
    () => memosForDate(memos, viewDate).filter((m) => m.isTodo && m.checked !== true),
    [memos, viewDate],
  );
  // 다가오는 디데이(viewDate 기준 오늘 이후, 가까운 순 3개) — 일기에 연동(사용자 요청).
  const upcomingDdays = useMemo(
    () =>
      ddays
        .map((d) => ({ d, diff: daysUntil(d.targetDate, viewDate) }))
        .filter((x) => !Number.isNaN(x.diff) && x.diff >= 0)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 3)
        .map((x) => x.d),
    [ddays, viewDate],
  );

  // viewDate가 바뀌면 폼을 그날 일기(있으면)로 동기화.
  useEffect(() => {
    if (diaries == null) return;
    const found = diaryForDate(diaries, viewDate);
    if (found != null) {
      setMood(found.mood);
      setText(found.text);
      setTitle(found.title ?? '');
      setTitleSize(found.titleSize ?? 'small');
      setShowRating(true); // 이미 평가한 날은 기분 별점을 펼쳐 보여준다.
      setWeatherSnap((found.weatherSnapshot as WeatherSnapshot | undefined) ?? null);
      setFortuneSnap((found.fortuneSnapshot as FortuneSnapshot | undefined) ?? null);
      setPhoto(found.photo ?? null);
    } else {
      setMood(3);
      setText('');
      setTitle('');
      setTitleSize('small');
      setShowRating(false); // 새 날은 "오늘 평가하기"를 눌러야 펼친다.
      setWeatherSnap(null);
      setFortuneSnap(null);
      setPhoto(null);
    }
    setSaved(false);
  }, [diaries, viewDate]);

  // 자동 헤더: 아직 스냅샷이 없는(새 작성) 날에만 그날 날씨·운세를 박제 준비.
  // 운세는 메모리 계산(fortune 재사용), 날씨는 캐시만(네트워크 강제 X). 실패는 헤더 생략.
  useEffect(() => {
    if (diaries == null || settings == null) return;
    // 이미 저장된 스냅샷이 있으면(과거 일기) 손대지 않는다(불변).
    if (existing?.weatherSnapshot != null || existing?.fortuneSnapshot != null) return;

    let alive = true;

    // 운세 스냅샷(메모리 계산).
    const saju: SajuInput | undefined = settings.saju;
    if (saju != null && saju.birthDate !== '') {
      try {
        const f = computeTodayFortune(saju, viewDate);
        if (alive) setFortuneSnap(buildFortuneSnapshot(f.result));
      } catch {
        if (alive) setFortuneSnap(null);
      }
    }

    // 날씨 스냅샷(캐시만). 첫 지역 캐시 사용. 그날 캐시가 아니면(다른 날) 생략.
    const region = settings.weather.regions[0];
    if (region != null) {
      loadWeatherCache(region.nx, region.ny)
        .then((bundle) => {
          if (!alive) return;
          // 캐시가 viewDate의 예보를 담고 있을 때만 박제(다른 날 캐시는 헤더 생략).
          const fc = bundle?.forecast;
          if (fc != null && fc.current.date === viewDate) {
            setWeatherSnap(buildWeatherSnapshot(bundle));
          }
        })
        .catch(() => {
          /* 캐시 실패 → 날씨 헤더 생략. */
        });
    }

    return () => {
      alive = false;
    };
  }, [diaries, settings, viewDate, existing]);

  // 세부 점수 백필 — 옛 일기의 운세 스냅샷에는 scores가 없다(나중에 추가된 필드).
  // 이미지 운세 '(연애·금전·직장)'를 보여주려면 그날 운세를 다시 계산해 scores만 채워 넣는다
  // (다른 스냅샷 값은 그대로 유지, 결정론적이라 동일한 날엔 같은 결과).
  useEffect(() => {
    if (settings == null || fortuneSnap == null || fortuneSnap.scores != null) return;
    const saju = settings.saju;
    if (saju == null || saju.birthDate === '') return;
    try {
      const f = computeTodayFortune(saju, viewDate);
      setFortuneSnap((prev) =>
        prev != null && prev.scores == null ? { ...prev, scores: { ...f.result.scores } } : prev,
      );
    } catch {
      /* 계산 실패 → 세부 점수 생략(나머지는 정상). */
    }
  }, [settings, fortuneSnap, viewDate]);

  const persist = (next: Diary[]) => {
    setDiaries(next);
    saveDiaries(next).catch(() => {
      /* 저장 실패는 무시(메모리 상태 유지). 외부 전송 없음. */
    });
  };

  const handleSave = () => {
    if (diaries == null) return;
    const next = upsertDiary(diaries, {
      date: viewDate,
      mood,
      text,
      title,
      titleSize,
      weatherSnapshot: weatherSnap,
      fortuneSnapshot: fortuneSnap,
      photo,
    });
    persist(next);
    setSaved(true);
  };

  // 사진 첨부 — 기기에서 1장 선택 → 캔버스로 다운스케일(긴 변 1280, JPEG 0.72)해 dataURL 저장.
  // 외부 전송 0(CRITICAL #1): 파일은 메모리에서만 읽어 로컬 Storage에 base64로 보관.
  const handlePickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (file == null) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (src === '') return;
      const img = new Image();
      img.onload = () => {
        const MAX = 1280;
        const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cx = cv.getContext('2d');
        if (cx == null) {
          setPhoto(src); // 다운스케일 불가 시 원본(드묾)
        } else {
          cx.drawImage(img, 0, 0, w, h);
          try {
            setPhoto(cv.toDataURL('image/jpeg', 0.72));
          } catch {
            setPhoto(src);
          }
        }
        setSaved(false);
      };
      img.onerror = () => setImgMsg('사진을 불러올 수 없어요');
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setSaved(false);
  };

  // 일기를 이미지(PNG) 한 장으로 저장(기기 저장 또는 다운로드, 외부 전송 0).
  // 앱 일기 헤더와 동일하게 날씨 이모지·운세 별/행운색 점·타로 카드 그림을 캔버스에 반영한다.
  const handleSaveImage = async () => {
    // 날씨: 이모지 없이 상태 + 최저/최고 기온만(현재기온 생략 → 짧게, 둘 다 보이게). 사용자 요청.
    const weather = (() => {
      if (weatherSnap == null) return undefined;
      const tMin = weatherSnap.temp.match(/최저\s*(-?\d+)/)?.[1];
      const tMax = weatherSnap.temp.match(/최고\s*(-?\d+)/)?.[1];
      const tempStr = tMin != null && tMax != null ? `최저 ${tMin}° 최고 ${tMax}°` : weatherSnap.temp;
      return { emoji: '', text: `${weatherSnap.condition} · ${tempStr}` };
    })();
    const fortune =
      fortuneSnap != null
        ? {
            overall: fortuneSnap.overall,
            scores: fortuneSnap.scores,
            luckyColor: fortuneSnap.luckyColor,
            luckyColorHex: LUCKY_COLOR_HEX[fortuneSnap.luckyColor] ?? INK_SOFT,
          }
        : undefined;
    const tarot =
      tarotCard != null
        ? {
            imageSrc: `/tarot/face-${String(tarotCard.index).padStart(2, '0')}.png`,
            label: `오늘의 타로 · ${tarotCard.name} · ${tarotCard.reversed ? '역방향' : '정방향'}`,
          }
        : undefined;
    const doneItems = showDone ? doneTodos.map((m) => m.text) : undefined;
    const todoItems = remainingTodos.length > 0 ? remainingTodos.map((m) => m.text) : undefined;
    const ddayItems =
      upcomingDdays.length > 0
        ? upcomingDdays.map((d) => `${ddayLabel(d.targetDate, viewDate).text}  ${d.title}`)
        : undefined;
    const res = await saveDiaryImage({ date: viewDate, title, mood, text, weather, fortune, tarot, doneItems, todoItems, ddayItems, fontFamily: fontCss(font), photo: photo ?? undefined });
    setImgMsg(
      res === 'saved'
        ? '갤러리에 저장했어요'
        : res === 'downloaded'
          ? '이미지를 내려받았어요'
          : '이미지를 만들 수 없어요',
    );
  };

  // 글씨체 선택 — 즉시 적용 + settings.diary.font 저장(로컬 전용, CRITICAL #1).
  const chooseFont = (id: DiaryFont) => {
    setFont(id);
    const base: Settings = settings ?? { widgets: [], weather: { regions: [] } };
    const next: Settings = { ...base, diary: { ...base.diary, font: id } };
    setSettings(next);
    saveSettings(next).catch(() => {
      /* 저장 실패는 무시(메모리 상태 유지). */
    });
  };

  const goPrev = () => setViewDate((d) => shiftDate(d, -1));
  const goNext = () => setViewDate((d) => shiftDate(d, 1));
  const goToday = () => setViewDate(today);
  const isToday = viewDate === today;
  const isFuture = viewDate >= today; // 미래 이동 막기(다음 버튼 비활성).

  if (diaries == null) {
    return (
      <div>
        {!embedded ? <Top title={<Top.TitleParagraph size={22}>📖 일기</Top.TitleParagraph>} /> : null}
        <div style={{ padding: spacing.xl, color: palette.textTertiary, fontSize: 14 }}>
          불러오는 중…
        </div>
      </div>
    );
  }

  const hasRecord = weatherSnap != null || fortuneSnap != null;

  return (
    <div style={{ background: embedded ? 'transparent' : DIARY_BG, minHeight: embedded ? undefined : '100vh', ['--diary-font' as string]: fontCss(font) } as CSSProperties}>
      {!embedded ? <Top title={<Top.TitleParagraph size={22}>📖 일기</Top.TitleParagraph>} /> : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md, padding: `0 ${spacing.md}px ${spacing.xl}px` }}>
        {/* 글씨체 고르기 — 각 칩을 해당 폰트로 렌더해 미리보기. 선택 즉시 저장. */}
        <FontPicker value={font} onChange={chooseFont} />

        {/* 날짜 네비게이션(페이지 넘기기) */}
        <DateNav
          label={dateLabelLong(viewDate)}
          tag={relativeTag(viewDate, today)}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          canNext={!isFuture}
          isToday={isToday}
        />

        {/* ── 일기장 한 페이지(크림 줄노트 + 빨강 여백선 + 제본 구멍) ── */}
        <DiaryPage>
          {/* 날짜 — 날짜는 크게, 요일은 작게+굵게(Jua, 이미지 헤더와 동일 폰트). */}
          {(() => {
            const dl = dateLabelLong(viewDate);
            const dm = dl.match(/^(.*?)(\S*요일)\s*$/);
            const datePart = (dm ? dm[1] : dl).trim();
            const dow = dm ? dm[2] : '';
            const tag = relativeTag(viewDate, today);
            return (
              <div style={{ fontFamily: HEADER_FONT, display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 28, color: INK, lineHeight: 1.1, WebkitTextStroke: `0.4px ${INK}` }}>{datePart}</span>
                {dow !== '' && (
                  <span style={{ fontSize: 17, color: INK, WebkitTextStroke: `0.7px ${INK}` }}>{dow}</span>
                )}
                {tag !== '' && <span style={{ fontSize: 15, color: MARGIN_LINE }}>· {tag}</span>}
              </div>
            );
          })()}

          {/* 그날의 기록(날씨·운세·타로) — 기본 폰트로 고정(메타 정보라 손글씨 X) */}
          {hasRecord && (
            <RecordLines weather={weatherSnap} fortune={fortuneSnap} />
          )}

          <Stitch />

          {/* 제목(손글씨) + 글자 크기 칩 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm }}>
            <input
              className="handwriting"
              type="text"
              value={title}
              aria-label="일기 제목"
              placeholder="제목"
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                border: 'none',
                background: 'transparent',
                color: INK,
                fontSize: TITLE_SIZE_PX[titleSize],
                lineHeight: 1.2,
                outline: 'none',
                padding: 0,
              }}
            />
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {(['small', 'medium', 'large'] as DiaryTitleSize[]).map((s) => {
                const on = titleSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    aria-label={`제목 ${s === 'small' ? '작게' : s === 'medium' ? '보통' : '크게'}`}
                    onClick={() => {
                      setTitleSize(s);
                      setSaved(false);
                    }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      border: `1px solid ${on ? INK : FRAME_MAT}`,
                      background: on ? 'rgba(59,52,80,0.10)' : 'transparent',
                      color: on ? INK : INK_SOFT,
                      fontSize: s === 'small' ? 11 : s === 'medium' ? 13 : 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    가
                  </button>
                );
              })}
            </div>
          </div>

          {/* 본문 — 줄노트 위에 손글씨. native textarea(줄 정렬 위해, TDS로는 불가). */}
          <textarea
            className="handwriting"
            aria-label="오늘의 일기"
            placeholder="오늘 하루를 적어 보세요."
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.max(t.scrollHeight, RULE_H * 6)}px`;
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginTop: spacing.sm,
              minHeight: RULE_H * 6,
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: INK,
              fontSize: 21,
              lineHeight: `${RULE_H}px`,
              padding: 0,
              // 물결무늬 괘선(사용자 요청) — 반복 SVG 타일. 글씨가 물결 위에 앉도록 lineHeight=RULE_H.
              background: WAVE_BG,
              backgroundSize: `40px ${RULE_H}px`,
              backgroundRepeat: 'repeat',
              backgroundAttachment: 'local',
            }}
          />

          {/* 사진 첨부(1장) — 로컬 저장. 기록 삭제 시 사라지니 이미지로 저장 권장(안내). */}
          <Stitch />
          {photo != null ? (
            <div>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${FRAME_MAT}` }}>
                <img src={photo} alt="첨부 사진" style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="사진 삭제"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(58,47,74,0.62)',
                    color: '#fff',
                    fontSize: 17,
                    lineHeight: 1,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, fontSize: 12.5, color: INK_SOFT, lineHeight: 1.45 }}>
                <span aria-hidden>⚠️</span>
                <span>앱 기록을 삭제하면 사진도 함께 사라져요. <b style={{ color: CLAY }}>‘이미지로 저장’</b>으로 사진까지 담아 보관하세요.</span>
              </div>
            </div>
          ) : (
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                alignSelf: 'flex-start',
                padding: '9px 16px',
                borderRadius: radius.pill,
                border: `1.5px dashed ${MARGIN_LINE}`,
                background: 'transparent',
                color: CLAY,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span aria-hidden>📷</span> 사진 추가
              <input type="file" accept="image/*" onChange={handlePickPhoto} style={{ display: 'none' }} />
            </label>
          )}

          {/* 오늘 한 일·남은 할 일(왼) / 다가오는 날(오) — 2단(이미지와 동일 구성, 사용자 요청) */}
          {((showDone && doneTodos.length > 0) || remainingTodos.length > 0 || upcomingDdays.length > 0) && (
            <>
              <Stitch />
              <div style={{ display: 'flex', gap: 16 }}>
                {/* 왼쪽 열 */}
                <div className="handwriting" style={{ flex: 1, minWidth: 0 }}>
                  {showDone && doneTodos.length > 0 && (
                    <>
                      <div style={{ fontSize: 20, color: '#1A1A1A', WebkitTextStroke: '0.5px #1A1A1A', marginBottom: 3 }}>오늘 한 일</div>
                      {doneTodos.map((m) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 20, lineHeight: `${RULE_H}px`, color: INK }}>
                          <span aria-hidden style={{ color: '#22A75A' }}>✓</span>
                          <span style={{ textDecoration: 'line-through', textDecorationColor: 'rgba(110,100,134,0.5)' }}>{m.text}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {remainingTodos.length > 0 && (
                    <>
                      <div style={{ fontSize: 20, color: '#1A1A1A', WebkitTextStroke: '0.5px #1A1A1A', marginBottom: 3, marginTop: showDone && doneTodos.length > 0 ? 8 : 0 }}>남은 할 일</div>
                      {remainingTodos.map((m) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 20, lineHeight: `${RULE_H}px`, color: INK }}>
                          <span aria-hidden style={{ color: MARGIN_LINE }}>▢</span>
                          <span>{m.text}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {/* 오른쪽 열 */}
                <div className="handwriting" style={{ flex: 1, minWidth: 0 }}>
                  {upcomingDdays.length > 0 && (
                    <>
                      <div style={{ fontSize: 20, color: '#1A1A1A', WebkitTextStroke: '0.5px #1A1A1A', marginBottom: 3 }}>다가오는 날</div>
                      {upcomingDdays.map((d) => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 20, lineHeight: `${RULE_H}px`, color: INK }}>
                          <span aria-hidden style={{ color: MARGIN_LINE }}>📅</span>
                          <span style={{ fontWeight: 700, color: CLAY }}>{ddayLabel(d.targetDate, viewDate).text}</span>
                          <span>{d.title}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 오늘의 기분(별점) — 페이지 하단, 손글씨 캡션 + TDS Rating */}
          <Stitch />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' }}>
            <span className="handwriting" style={{ fontSize: 21, color: INK }}>오늘 하루의 기분은</span>
            {showRating ? (
              <div style={{ display: 'flex', gap: 4 }} role="group" aria-label="오늘 기분 하트">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={`기분 ${v}점`}
                    onClick={() => { setMood(v); setSaved(false); }}
                    style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', fontSize: 30, lineHeight: 1, color: v <= mood ? '#F2789F' : '#E6DCEE' }}
                  >
                    {v <= mood ? '♥' : '♡'}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowRating(true)}
                aria-label="오늘 평가하기"
                className="handwriting"
                style={{ background: 'none', border: 'none', color: MARGIN_LINE, fontSize: 21, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                기분 하트 남기기 ›
              </button>
            )}
          </div>
        </DiaryPage>

        {/* 저장 / 이미지로 저장 */}
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SaveButton onClick={handleSave} saved={saved} isEdit={existing != null} />
          </div>
          <button
            type="button"
            onClick={() => runAfterAd(() => { void handleSaveImage(); })}
            aria-label="일기를 이미지로 저장"
            style={{
              flex: 1,
              minWidth: 0,
              padding: `${spacing.md}px`,
              borderRadius: radius.pill,
              border: `1px solid ${FRAME_MAT}`,
              background: PAPER_DEEP,
              color: INK,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span aria-hidden>🖼️ </span>이미지로 저장
          </button>
        </div>
        {imgMsg != null ? (
          <span style={{ fontSize: 13, color: CLAY, textAlign: 'center' }}>{imgMsg}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 일기장 한 페이지(종이 표면)
// ─────────────────────────────────────────────────────────────

function DiaryPage({ children }: { children: ReactNode }) {
  // 액자느낌(사용자 요청 "테두리 더 꾸미기") — 흰 라이너 + 분홍 매트 링 + 안쪽 점선 스티치 액자.
  // 스크랩북/저널 느낌의 점선 프레임을 한 겹 더 둘러 귀엽게(기존 Stitch 구분선과 같은 어휘).
  return (
    <div
      style={{
        position: 'relative',
        background: PAPER,
        borderRadius: PAGE_RADIUS,
        border: `1px solid ${FRAME_MAT}`,
        boxShadow: `inset 0 0 0 5px #FFFFFF, inset 0 0 0 6px ${FRAME_MAT}, 0 10px 24px rgba(120, 95, 175, 0.16)`,
        padding: `${spacing.xl}px ${spacing.lg + 4}px`,
        overflow: 'hidden',
      }}
    >
      {/* 안쪽 점선 스티치 액자(장식, 클릭 통과). */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: PAGE_RADIUS - 6,
          border: `1.6px dashed ${STITCH}`,
          pointerEvents: 'none',
        }}
      />
      {/* 모서리 하트 장식 4개 — 액자 코너 포인트. */}
      {[
        { top: 4, left: 8 },
        { top: 4, right: 8 },
        { bottom: 4, left: 8 },
        { bottom: 4, right: 8 },
      ].map((pos, i) => (
        <span
          key={i}
          aria-hidden
          style={{ position: 'absolute', ...pos, fontSize: 12, color: CLAY, opacity: 0.85, lineHeight: 1 }}
        >
          ♥
        </span>
      ))}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

/** 글씨체 고르기 — 칩을 각 폰트로 렌더해 미리보기(선택 즉시 저장). */
function FontPicker({ value, onChange }: { value: DiaryFont; onChange: (id: DiaryFont) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        padding: `0 ${spacing.xs}px`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 800, color: INK_SOFT, flexShrink: 0 }}>✏️ 글씨체</span>
      {DIARY_FONTS.map((f) => {
        const on = f.id === value;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            aria-label={`글씨체 ${f.label}`}
            onClick={() => onChange(f.id)}
            // .handwriting + --diary-font 로 칩 라벨을 해당 글씨체로 렌더(전역 Pretendard !important를
            // 이기려면 인라인 fontFamily로는 안 되고 #root .handwriting 특이도가 필요).
            className="handwriting"
            style={{
              flexShrink: 0,
              padding: '5px 14px',
              borderRadius: radius.pill,
              border: `1.5px solid ${on ? CLAY : FRAME_MAT}`,
              background: on ? 'rgba(154, 119, 214, 0.14)' : '#FFFFFF',
              color: on ? CLAY : INK,
              ['--diary-font' as string]: f.css,
              fontSize: 19,
              lineHeight: 1.1,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: on ? '0 2px 8px rgba(242, 120, 157, 0.18)' : 'none',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/** 점선 스티치 구분선(일기장 섹션 구분). */
function Stitch() {
  return (
    <div
      aria-hidden
      style={{
        height: 0,
        borderTop: `1.5px dashed ${FRAME_MAT}`,
        margin: `${spacing.sm}px 0`,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// 날짜 네비게이션(페이지 넘기기)
// ─────────────────────────────────────────────────────────────

function DateNav({
  label,
  tag,
  onPrev,
  onNext,
  onToday,
  canNext,
  isToday,
}: {
  label: string;
  tag: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  canNext: boolean;
  isToday: boolean;
}) {
  const arrow: CSSProperties = {
    background: 'rgba(255,255,255,0.7)',
    border: `1px solid ${FRAME_MAT}`,
    borderRadius: radius.pill,
    width: 36,
    height: 36,
    fontSize: 16,
    color: INK_SOFT,
    cursor: 'pointer',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
      <button type="button" style={arrow} onClick={onPrev} aria-label="이전 날">
        ‹
      </button>
      <button
        type="button"
        onClick={onToday}
        disabled={isToday}
        aria-label={label}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: -0.3,
          color: CLAY,
          cursor: isToday ? 'default' : 'pointer',
        }}
      >
        {label}{tag !== '' ? ` · ${tag}` : ''}
      </button>
      <button
        type="button"
        style={{ ...arrow, opacity: canNext ? 1 : 0.35, cursor: canNext ? 'pointer' : 'default' }}
        onClick={canNext ? onNext : undefined}
        disabled={!canNext}
        aria-label="다음 날"
      >
        ›
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 그날의 기록(날씨·운세) — 손글씨 라인
// ─────────────────────────────────────────────────────────────

/** 행운색 → 스와치 hex(FortuneWidget과 동일 팔레트). */
const LUCKY_COLOR_HEX: Record<string, string> = {
  초록: '#22C55E',
  빨강: '#EF4444',
  노랑: '#EAB308',
  흰색: '#E5E7EB',
  검정: '#374151',
};

function RecordLines({
  weather,
  fortune,
}: {
  weather: WeatherSnapshot | null;
  fortune: FortuneSnapshot | null;
}) {
  // 날씨/운세를 '날씨:' '오늘의 운세:' 라벨 + 값으로(타로는 제외). 기본 폰트(HEADER_FONT) 고정.
  const line: CSSProperties = { fontSize: 15, lineHeight: 1.7, color: INK };
  const to100 = (v: number) => Math.round(Math.max(0, Math.min(5, v)) * 20);
  const scoreColor = (s: number) => (s >= 70 ? '#1FA055' : s >= 50 ? '#D99400' : '#E0413F');
  const Score = ({ v }: { v: number }) => <span style={{ color: scoreColor(to100(v)), fontWeight: 700 }}>{to100(v)}점</span>;

  let wTemp = weather?.temp ?? '';
  if (weather != null) {
    const mn = weather.temp.match(/최저\s*(-?\d+)/)?.[1];
    const mx = weather.temp.match(/최고\s*(-?\d+)/)?.[1];
    if (mn != null && mx != null) wTemp = `최저 ${mn}° 최고 ${mx}°`;
  }

  const Label = ({ t }: { t: string }) => <span style={{ fontWeight: 800, color: INK, marginRight: 6 }}>{t}</span>;

  return (
    <div style={{ fontFamily: HEADER_FONT, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {weather != null && (
        <div style={line}>
          <Label t="날씨:" />
          {weather.condition} · {wTemp}
        </div>
      )}
      {fortune != null && (
        <div style={{ ...line, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Label t="오늘의 운세:" />
          <span style={{ fontWeight: 700 }}>
            <Score v={fortune.overall} />
            <span style={{ color: '#1A1A1A' }}>/100점</span>
          </span>
          {fortune.scores != null && (
            <span style={{ fontSize: 13, color: '#6E6678' }}>
              (연애 <Score v={fortune.scores.love} /> · 금전 <Score v={fortune.scores.wealth} /> · 직장 <Score v={fortune.scores.health} />)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 저장 버튼
// ─────────────────────────────────────────────────────────────

function SaveButton({ onClick, saved, isEdit }: { onClick: () => void; saved: boolean; isEdit: boolean }) {
  const label = saved ? '저장됨 💗' : isEdit ? '수정 저장' : '저장';
  const style: CSSProperties = {
    width: '100%',
    padding: `${spacing.md}px`,
    borderRadius: radius.pill,
    border: 'none',
    background: saved ? PAPER_DEEP : CLAY,
    color: saved ? INK_SOFT : '#FFFFFF',
    fontSize: 15,
    fontWeight: 800,
    boxShadow: saved ? 'none' : `0 6px 16px rgba(242, 120, 157, 0.30)`,
    cursor: 'pointer',
  };
  return (
    <button type="button" style={style} onClick={onClick}>
      {label}
    </button>
  );
}
