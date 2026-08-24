# Evry Times — Architecture

> 함께 보기: [PRD.md](./PRD.md) · [TECH_STACK.md](./TECH_STACK.md) · SDK 레퍼런스 [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)

## 1. 런타임 환경 (기획 원안 v0.1 / 중간 RN 가정 모두 정정)
- ❗ **웹 React 미니앱.** `@apps-in-toss/web-framework`(React 18 + react-dom + Vite). React Native 아님 — `<div>` + inline style / `@emotion/react`. 토스앱 내 WebView로 호스팅, 빌드 산출물 `.ait`를 콘솔 업로드.
- 스캐폴드 `npx create-ait-app evrytimes --inline --tds --skills --ai claude`. 엔트리 `src/main.tsx`(`createRoot` + `TDSMobileAITProvider`) → `src/App.tsx`.
- 빌드 `npm run build`(=`ait build`) / 개발 `npm run dev`(=`granite dev`) / 배포 `ait deploy`.

## 2. 검증된 SDK 매핑 (원안 5.1 검증 5종 전부 해소)
SDK는 `@apps-in-toss/web-framework`에서 import. (정확한 export·시그니처는 앱인토스 개발자센터 및 bedrock 레퍼런스로 구현 시 확정.)
| 요구 | SDK | 결정 |
|---|---|---|
| 위치 | `getCurrentLocation` (웹). `useGeolocation`은 RN 전용이라 **미사용** | 실패 시 도시 직접 선택 폴백 |
| 저장 | `Storage`(setItem/getItem/removeItem/clearItems) | **로컬만**(서버 없음). AIT 브리지 부재 시(브라우저 등) **기기 로컬 폴백**: 1회 프로브 후 localStorage→인메모리로 자동 전환(외부 전송 0, CRITICAL #1) |
| 외부 API | 네트워크 `http` 모듈 | 기상청·에어코리아 호출 |
| 공유 | `share`(텍스트)·`getTossShareLink`·`contactsViral` | 텍스트+링크+초대 = AU 엔진 |
| 알림 | `requestNotificationAgreement`(동의만) | **푸시 이번 제외**(실발송은 서버 필요) |
| 화면 | safe-area, `openURL`, `closeView` | 레이아웃·외부링크 |

## 3. 프로젝트 구조 (create-ait-app 산출 + 우리가 추가)
```
granite.config.ts            # appName(evrytimes)/brand/permissions(위치)/web/outdir, 외부 도메인 허용
index.html  vite.config.ts  tsconfig*.json  eslint.config.js
src/
  main.tsx                   # createRoot + TDSMobileAITProvider (스캐폴드 제공)
  App.tsx / 라우팅            # 하단 탭 4: 오늘·일기·돌아보기·위젯(편집) — TDS Tabbar
  screens/
    onboarding/              # STEP1 위젯선택 → STEP2 크기 → (운세시)생년월일
    today/ diary/ review/ widgets/
  widgets/                   # WeatherWidget, FortuneWidget, DdayWidget, MemoWidget
  features/
    storage/                 # Storage 래퍼: settings/diaries/memos/ddays/saju 캐시
    weather/                 # 격자변환 + 기상청/에어코리아 http 클라
    fortune/                 # lunar-javascript 통합 + 해석엔진 + 문구뱅크(JSON)
    share/                   # 공유 텍스트 빌더 + getTossShareLink + contactsViral
  components/                # TDS 래핑 공통 컴포넌트 (Rating·BarChart 등은 TDS 직접 사용)
  theme/                     # tds-colors 기반 토큰 매핑
  types/                     # 도메인 타입 단일 출처 + lunar-javascript.d.ts
data/
  fortune-phrases.json       # 운세 문구뱅크   tarot.json  # 메이저22
```
- UI는 **`@toss/tds-mobile` 우선**: 별점=`Rating`, 기분그래프=`BarChart`, 하단탭=`Tabbar`, 리스트=`ListRow`, 입력=`TextField`, 모달=`useBottomSheet`/`useDialog`/`useToast`. 색/타이포=`@toss/tds-colors`.

## 4. 데이터 모델 (로컬 Storage, 원안 5.3 기반)
```
settings: { widgets:[{type,enabled,size,order}],
            weather:{regions:[{name,lat,lon,nx,ny}]},   // 최대 2
            saju:{ birthDate, birthTime?, isLunar, cached:{ dayGan, dayWuXing, ... } } }
diaries: [{ date, mood, weatherSnapshot, fortuneSnapshot, text }]
memos:   [{ id, date, text, checked, isTodo }]
ddays:   [{ id, title, targetDate, size }]
```
Storage 래퍼 한 곳에서 직렬화/버전 마이그레이션 관리. 사주는 산출값 캐시(매번 재계산 X).

## 5. 사주 운세 엔진 (간판 핵심)
정적 운세표는 매일 안 바뀌고 generic해지는 함정 → **실제 만세력으로 일간×일진 계산** + 정적 문구 레이어.

### 의존성
**`lunar-javascript`(6tail, MIT, 순수 JS·무의존)** — 간지·팔자(八字)·오행·십신·절기·길신 방위(재신/희신) 계산 전담. RN/granite 번들 안전, 외부호출/서버 0, IP 0. (정확한 메서드 시그니처는 6tail.cn/calendar/api 로 구현 시 확정.)

### 파이프라인 (부억扶抑 + 월령 중심 — 사람마다 길흉이 갈린다)
> v1까지는 모든 사람에게 동일 계열 점수표(인성=길·관성=흉…)를 써 개인 사주를 무시했다.
> 이제 **그 사람 사주의 신강/신약(부억) → 희신/기신(喜忌) 기준**으로 환산해, 같은 오늘 일진이라도 사람마다 길흉이 달라진다. 모든 함수는 결정론·순수(`src/features/fortune/engine.ts`).

1. **사주 산출(온보딩 1회 → 캐시):** 생년월일+(선택)시간+양/음력 → `Solar.fromYmdHms(...).getLunar().getEightChar()` → 년·월·일·시주 간지, **일간=본질**, 일간 오행, 십신. 음력은 라이브러리가 변환. 시간 미입력 시 시주 생략.
2. **오늘 일진(매일):** `Solar.fromDate(today).getLunar()` → 일진 간지·오늘 천간/지지 오행 + 그날 재신/희신 방위.
3. **오행 세력(부억의 기반) `elementPower`:** 일간(我)을 제외한 8자(시주 없으면 7자)를 오행으로 환산해 **가중 합산**. 가중치(우리 디폴트, 캘리브레이션 대상): **월지 ×3 · 일지 ×2 · 년지·시지 ×1.5 · 천간(년·월·시) ×1.0**. 지지 오행은 **본기(本氣)만** 사용(v1 단순화 — 지장간 여기/중기 미반영; 후속 여지).
4. **신강/신약 `dayMasterStrength`:** 扶(我편)=비겁+인성, 抑(異편)=식상+재성+관성. `ratio = 扶/(扶+抑)`. 월령(월지 계열)이 我편이면 得令(강 쪽), 아니면 失令(약 쪽). 임계(상수, 캘리브레이션 대상): strong if `ratio ≥ 0.55`(得令이면 0.50), weak if `ratio ≤ 0.45`(失令이면 0.50), 그 외 balanced.
5. **희신/기신(喜忌) `favorableGroups`:** strong → favor{식상,재성,관성}·avoid{비겁,인성}; weak → favor{비겁,인성}·avoid{식상,재성,관성}; balanced → 중립(충합 위주).
6. **총운 별점(1~5, 결정론적) `totalScore`:** 오늘 천간 계열(=일간×오늘천간 십신 계열)이 그 사람에게 **喜(4)/忌(2)/中(3)** → 일지×오늘 지지 충(−1)/합(+1) 가감 → clamp. **신강·신약에 따라 같은 일진이 반대 점수**가 된다.
7. **세부운 `subFortunes`(각 base 3):** 재물=오늘이 재성이면 (재성∈favor?+1:−1). 애정=성별 target(남 재성/여 관성)이 오늘 들어오면 (target∈favor?+1:−1). 건강·안정=오늘이 인성/비겁이면 (그 계열∈favor?+1:−1). 공통 충(−1)/합(+1), clamp.
8. **행운색 `luckyColor`(개인화):** 신약/중화 → 일간을 生하는 오행(印星)→색; 신강 → 일간이 剋하는 오행(財星, 我剋)→색. 색표(木초록·火빨강·土노랑·金흰색·水검정). **행운방향=그날 재신/희신 방위 직접 사용.**
9. **점수 근거 `fortuneBasis`(노출용):** `{ dayGan, dayWuXing, monthZhi, monthWuXing, strength, todayGroup, todayStance }`를 구조화해 `FortuneResult.basis`로 포함 → 위젯이 "신약 사주라 오늘 인성이 喜" 같은 한 줄 근거를 만들 수 있다.
10. **문구(반복 회피):** 상태키 `(관계5×오행5×항목)`×문구뱅크 4~6개, 일일 선택 = `seed(생년월일+오늘날짜)` 해시 → 같은 날 동일·날마다 신선. + 오늘의 일진 교육 한 줄 + 한 줄 조언. 전부 정적 JSON(런타임 LLM/서버 0).
11. **타로 보조:** 메이저 22장 + 정/역, 일일 seed 1장.
12. **시간대별 기운(四正 왕지 모델 + 일진 혼합) `fortuneDetail`(해석 레이어):** 자세한 운세를 위해 하루를 4블록(아침 卯木·낮 午火·저녁 酉金·밤 子水)으로 나누고, 각 블록의 대표 기운을 **사정(四正) 왕지의 오행**으로 고정한다. 각 블록 입장(stance)은 **체질 희기 ± 오늘 일진 지지와의 합충**으로 정한다: 블록 오행 계열(`wuXingToGroup`)이 본인 희기(`favorableGroups`)에서 喜면 +1·忌면 −1·中 0(체질 base) → 거기에 블록 왕지와 **오늘 일진 지지의 六合(+1)/同(+1)/六沖(−1)/무(0)** 보정(`branchRelation`, 기존 `ZHI_HE`/`ZHI_CHONG` 표 재사용)을 더해, score>0 favor·score<0 avoid·0 neutral. **따라서 같은 사람도 오늘 일진 지지에 따라 충(沖)이 들어온 시간대가 매일 뒤집혀 시간대 흐름이 날마다 변동된다.** 각 블록은 그 관계를 `dayBranch`(he/chong/same/none)로 노출한다. 근거는 **부억/희기 × 六合/六沖**에서만 파생 — 새 유파·임의 길시/흉시표·삼합/방합은 도입하지 않는다. 같이 산출하는 **조심 포인트 `dailyCaution`** 의 `cautionPart`는 이제 이 일진-변동 segments의 忌(avoid) 첫 블록이라 자연히 매일 달라진다(avoidGroup·chong 근거는 동일: 기신 + 일지×오늘 지지 충). 전문가 표기 근거로 `FortuneBasis`에 **정확한 십신 `todayTenGod`(일간×오늘 천간 정/편 구분)** 과 **월령 득실 `deLing`(得令/失令)** 을 함께 노출한다. 이는 만세력 정밀 산출(시주 계산)이 아니라 **결정론적 해석 레이어**이며 운명 단정이 아니다. **土는 사정 시간대에 없으므로 시간 흐름에 미표현**(의도된 단순화). 한국어 문구는 위젯 레이어에서 조립한다(엔진은 구조만).

### 유파 명시 & 한계 (CRITICAL #3: 디폴트 채택 + 근거 노출 + 캘리브레이션)
- **방법 = 부억론(扶抑)·월령 최우선**(주류 명리 디폴트). 가중치·임계값은 코드 상수로 명시했고 캘리브레이션(주류 만세력 대조)으로 보정한다. "우리만 다르다"가 나오지 않게 디폴트를 따르되, basis로 근거를 노출해 결과를 설명 가능하게 한다.
- **v1 한계(후속 여지):** ① 지지 오행 본기만 — 지장간 여기/중기 미반영. ② 회합·형충파해의 세력 변동, 통근(通根) 정밀화 미반영(별점 보정은 일지×오늘지지 충/합만). ③ balanced(중화)는 喜忌 중립 처리 — 조후(調候)·격국 미반영. 이 단순화는 캘리브레이션 픽스처로 영향 폭을 검증한다.

### 표준 정합 (★ 확정 지침: "남들과 똑같이 나와야 한다")
운세앱은 "쟤네만 사주가 다르다"는 말이 나오면 신뢰가 끝난다. **무조건 디폴트·다수파 구성**으로 맞춘다.
- **모두 동의(자동 일치):** 입춘 기준 년주 · 절기 기준 월주 · 60갑자 연속 일주 · 음력/윤달 변환 → `lunar-javascript`가 그대로 제공. 우리 운세 핵심(내 일간 × 오늘 일진)은 **논쟁 없는 60갑자 일주**이고 오늘 일진은 시간 무관 → 대부분 케이스 어느 앱과도 동일.
- **유파 갈리는 3곳 = 주류 소비자 만세력(포스텔러·플러스만세력) 디폴트에 정합:**
  1. **야자시(23~24시 출생):** 라이브러리 유파(sect) 옵션을 주류 디폴트에 맞춰 명시 설정.
  2. **진태양시 경도보정:** 소비자 "오늘의 운세" 다수가 표준시(KST) 그대로 → **기본 OFF.**
  3. **역사적 서머타임**(1948~51·55~60·87~88): 해당 기간 출생만 입력 시각 보정.
- **검증(말로 안 하고 강제):** 캘리브레이션 픽스처 — 동일 생일·날짜 10여 개를 포스텔러/플러스만세력 결과와 **글자 단위 대조**(입춘 전후·절기 경계·23시 출생·윤달·윤년 포함). 출시 전 통과 필수. 주류끼리 갈리면 다수파 채택·문서 기록.

## 6. 날씨 파이프라인
- `getCurrentLocation`(실패 시 도시 선택) → **위경도→기상청 격자(nx,ny) 변환**(Lambert Conformal Conic 고정 상수 공식 1함수) → 단기예보(getVilageFcst, 3시간) + 미세먼지(에어코리아) + 자외선(생활기상지수)를 SDK `http`로 호출.
- 인증키는 data.go.kr 발급, 호출 도메인을 `granite.config.ts`에 허용. nx/ny는 region에 캐시.

## 7. AU / 공유 엔진
share 텍스트 전용 → **텍스트 요약 + `getTossShareLink`(미니앱 링크) + `contactsViral`(초대 리워드)**. 운세·월간회고를 진입점으로. 푸시 부재를 공유 유입+일진 일일 갱신으로 보완.

## 8. 리스크
- 16일 풀 라인업 → 운세·날씨(간판) 우선 완성, 나머지 동작 우선. 막히면 6/30엔 골격+간판 제출 후 7월 AU기간 중 업데이트.
- 기상청 키 발급/격자 변환이 최대 시간 변수 → 1~2일차 PoC 선검증.
