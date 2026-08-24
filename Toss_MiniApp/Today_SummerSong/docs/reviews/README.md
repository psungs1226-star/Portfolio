# Phase Review Records

이 폴더는 `reviewer_agents.md`의 `summer-song-phase-reviewer`(`gpt-5.4-mini`) 기준으로 작성한 phase별 리뷰 결과를 저장한다.

## 파일명

- `phase-0-review.md`
- `phase-1-review.md`
- `phase-2-review.md`
- `phase-3-review.md`
- `phase-4-review.md`
- `phase-5-review.md`
- `phase-6-review.md`
- `phase-7-review.md`

## 리뷰 결과 형식

```md
# Phase N Review

## Verdict

PASS / PASS_WITH_FIXES / FAIL

## Blocking Issues

- ...

## Major Issues

- ...

## Minor Issues

- ...

## Policy/Risk Check

- ...

## Target Fit Check

- ...

## Required Fixes

- ...

## Reviewer Notes

- ...
```

## 진행 규칙

- `FAIL`: 다음 phase 진행 금지
- `PASS_WITH_FIXES`: blocking issue가 없을 때만 다음 phase 진행 가능
- `PASS`: 다음 phase 진행 가능

