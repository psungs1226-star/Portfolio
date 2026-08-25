# 동일 프롬프트 A/B/C 원샷 비교

같은 자기소개 콘텐츠와 입력 이미지, 동일한 프롬프트·모델·effort를 사용하고 적용 스킬만 바꿔 생성한 비교 결과입니다.

- 스킬 제작·개선: Claude Code
- A/B/C 생성: Claude Code · Sonnet 5 · High effort
- 별도 결과 검수: GPT-5.6 · High / Gemini 3.1 Pro

| 구분 | 조건 | 결과물 |
|---|---|---|
| A | 스킬 미사용 | [`A-no-skill/index.html`](A-no-skill/index.html) |
| B | GitHub `taste-skill` 사용 | [`B-taste-skill/index.html`](B-taste-skill/index.html) |
| C | `Design Fieldbook Skill` 사용 | [`C-fieldbook/index.html`](C-fieldbook/index.html) |

- 세 결과 모두 원샷으로 생성했습니다.
- 비교가 성립하도록 콘텐츠와 입력 이미지는 동일하게 유지했습니다.
- 이 실험은 단일 사례의 정성 비교이며 통계적 우위를 의미하지 않습니다.
- 이미지와 기타 자산은 각 결과 폴더와 `shared-assets/`에 함께 보관했습니다.

## 별도 모델 검수 결과

| 검수 모델 | A | B | C | 종합 순위 |
|---|---:|---:|---:|---|
| GPT-5.6 · High | 81/100 | 88/100 | **93/100** | **C > B > A** |
| Gemini 3.1 Pro | 8.5/10 | 9.5/10 | **9.8/10** | **C > B > A** |

평가 척도가 다르므로 두 점수를 평균 내거나 합산하지 않았습니다. 평가 화면 원본은 [Design Fieldbook Skill README](../../README.md#검수-원본)에 공개했습니다.
