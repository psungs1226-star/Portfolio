/**
 * features/ads — 앱인토스 전면(인터스티셜) 광고 게이트.
 *
 * 정책(출시 버전): 특정 액션 진입 시 **스킵 가능한 전면광고**를 한 번 띄우고, 닫히면(또는 실패/미지원 시)
 *   원래 액션을 그대로 진행한다. 광고가 기능을 인질로 잡지 않는다(저장/이동은 항상 성공).
 *
 * 트리거(현재 3곳): ① 오늘의 운세 보러가기 ② 일기 이미지 저장 ③ 날씨 상세 보기.
 *
 * 가드:
 *  - `GoogleAdMob.showAppsInTossAdMob.isSupported()`가 true인 토스 런타임에서만 동작. 그 외(로컬 dev/웹)엔 즉시 통과.
 *  - 광고 그룹 ID 미설정(`AD_GROUP_ID===''`)이면 즉시 통과.
 *  - **빈도캡**: 직전 광고 후 COOLDOWN_MS 이내면 광고 없이 통과(매 액션마다 광고 X).
 *  - 안전 타임아웃: 광고가 안 뜨면 ACTION_TIMEOUT_MS 후 액션 강제 진행(막히지 않게).
 *
 * 광고 ID는 앱인토스 콘솔에서 발급받은 광고 그룹 ID를 `VITE_AIT_AD_GROUP_ID`(빌드 env)로 주입한다.
 * (코드 밖 주입 — 비밀은 아니지만 환경별로 다름. 미주입이면 광고는 자동 비활성.)
 */
import { GoogleAdMob } from '@apps-in-toss/web-framework';

/** 콘솔 발급 광고 그룹 ID. 미설정이면 광고 비활성(앱은 정상 동작). */
const AD_GROUP_ID: string =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env?.VITE_AIT_AD_GROUP_ID) || '';

/** 광고 간 최소 간격(빈도캡) — 매 액션마다 광고가 뜨지 않게. */
const COOLDOWN_MS = 90_000;
/** 광고가 안 뜰 때 액션을 강제로 진행시키는 안전 타임아웃. */
const ACTION_TIMEOUT_MS = 8_000;
/** 빈도캡 타임스탬프 저장 키(기기 로컬, 광고 표시 시각만 — 개인정보 아님). */
const LAST_SHOWN_KEY = 'evrytimes:ad:lastShownAt';

function isSupported(): boolean {
  try {
    return GoogleAdMob.showAppsInTossAdMob.isSupported() === true;
  } catch {
    return false;
  }
}

function withinCooldown(): boolean {
  try {
    const last = Number(window.localStorage.getItem(LAST_SHOWN_KEY) ?? '0');
    return Number.isFinite(last) && Date.now() - last < COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
  } catch {
    /* localStorage 미지원 런타임 — 캡 없이 동작(무해) */
  }
}

/**
 * 광고를 한 번 띄우고(스킵 가능) 닫히면 `action`을 실행한다.
 * 미지원/ID없음/쿨다운/오류/타임아웃 어떤 경우에도 `action`은 **정확히 한 번** 실행된다.
 */
export function runAfterAd(action: () => void): void {
  let done = false;
  const proceed = () => {
    if (done) return;
    done = true;
    try {
      action();
    } catch {
      /* 액션 자체 오류는 광고와 무관 — 호출부에서 처리 */
    }
  };

  // 광고를 띄울 수 없는 모든 상황 → 즉시 진행.
  if (AD_GROUP_ID === '' || !isSupported() || withinCooldown()) {
    proceed();
    return;
  }

  markShown();
  const timer = setTimeout(proceed, ACTION_TIMEOUT_MS);
  const finish = () => {
    clearTimeout(timer);
    proceed();
  };

  // 미리 불러온 뒤(loaded) 바로 노출. 닫히거나(dismissed) 실패하면 액션 진행.
  let cleanupShow: () => void = () => {};
  const cleanupLoad = GoogleAdMob.loadAppsInTossAdMob({
    options: { adGroupId: AD_GROUP_ID },
    onEvent: (event) => {
      if (event.type !== 'loaded') return;
      cleanupShow = GoogleAdMob.showAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (e) => {
          if (e.type === 'dismissed' || e.type === 'failedToShow') {
            finish();
            cleanupShow();
            cleanupLoad();
          }
        },
        onError: () => finish(),
      });
    },
    onError: () => finish(),
  });
}
