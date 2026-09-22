# 피성환 포트폴리오 랜딩

BD 중심의 짧은 개인 포트폴리오. V3-A 활자 방향을 실제 웹페이지로 구현했다. 그룹바이 제안의 `관찰 → 사업 구조 → 실행 자료`를 GSAP ScrollTrigger의 단일 고정 장면과 내부 가로 이동으로 보여준다.

## 실행

```sh
npm install
npm run dev
```

`http://127.0.0.1:5173/`. 배포용 빌드: `npm run build`.

## 구조와 자료

- 첫 화면: Noto Serif KR 600 + Pretendard Bold의 줄 단위 대비. 히어로에서 역할·연락·그룹바이 대표 작업을 함께 확인할 수 있다.
- 그룹바이: 첫 화면의 포트폴리오용 표지는 HTML/CSS로 새로 만든 시각 표현. 원본 제안서나 실제 PDF 페이지가 아니다. 실제 제안서·세일즈 1페이저는 PDF 링크로 확인한다. 16:9 문서 페이지는 랜딩 화면에 넣지 않는다.
- 스크롤 이야기: `서류로는 보이지 않는다 → 응시료보다 채용 연결 → 첫 검증은 20곳부터`의 세 판단을 화면 전체 폭의 장면으로 만들었다. 데스크톱에서 세로 스크롤이 고정된 구간의 가로 이동을 제어하고, 0·0.5·1 지점에 짧게 맞춰 멈춘다. 두 번째 장면의 매출 지점과 세 번째 장면의 실행 산출물은 가로 장면 진입에 동기화한다.
- 제품 구현: 사주 다이어리 홈과 인사ON 근거 검증 화면은 저장소의 실제 캡처를 복사해 사용한다. 사주 다이어리 이미지는 데모 데이터 캡처다.
- 1100px 이하, 높이 720px 미만, 모션 감소 설정에서는 GSAP pin을 만들지 않고 세로 장면으로 보여준다.
- 근거 경로: `../Groupby_BD/`, `../Toss_MiniApp/Saju_Diary/`, `../Chatbot/chat_bot_insaon/`, `../AI_Proficiency_Report/`, `../resume.html`.

폰트 라이선스는 `public/fonts/OFL-NotoSerifKR.txt`, `public/fonts/OFL-Pretendard.txt`에 동봉했다. Pretendard: [공식 저장소](https://github.com/orioncactus/pretendard); Noto Serif KR: [SIL OFL](https://github.com/google/fonts/tree/main/ofl/notoserifkr).

## 내용의 경계

그룹바이는 공개자료 기반 독립 제안으로 실제 운영 성과가 없다. `약 72%`는 분석한 채용 공고 1,000건 표본의 비개발 직군 비중이다. 매출 수치는 랜딩에서 주장하지 않는다. 앱 출시와 실제 AU 증가도 구분한다.
