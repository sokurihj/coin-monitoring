---
name: update-docs
description: 코드 변경 후 ARCHITECTURE.md와 CLAUDE.md를 현재 코드 상태와 비교해 달라진 부분만 업데이트하는 스킬. 사용자가 /update-docs를 입력하거나 "문서 업데이트", "아키텍처 문서 갱신", "ARCHITECTURE.md 업데이트", "CLAUDE.md 최신화" 등을 요청할 때 사용. 코딩 작업이 끝난 후 문서가 코드와 달라진 것 같을 때 반드시 사용.
---

# 문서 동기화 스킬

코드베이스를 스캔해서 ARCHITECTURE.md와 CLAUDE.md가 현재 코드와 다른 부분을 찾아 해당 부분만 수정한다.
전체 재작성이 아니라 외과적 수정이 목표다 — 문서의 스타일·포맷·주석은 그대로 유지하고 사실이 달라진 부분만 고친다.

## 프로세스

### 1단계: 현재 문서 읽기

`ARCHITECTURE.md`와 `CLAUDE.md` 전체를 읽는다.
각 섹션이 어떤 코드 영역을 설명하는지 머릿속에 지도를 그린다.

### 2단계: 코드베이스 스캔

아래 파일들을 읽어 현재 실제 상태를 파악한다. 필요한 것만 읽되, 관련 있는 건 빠짐없이 읽는다.

| 스캔 대상 | ARCHITECTURE.md 섹션 연관 |
|-----------|--------------------------|
| `src/app/api/` (라우트 파일들) | Route Handlers |
| `src/hooks/` | 클라이언트 폴링 hooks |
| `src/store/` | 상태 관리 |
| `src/components/` (계층 구조) | 컴포넌트 계층 |
| `src/lib/ict.ts` | ICT 분석 |
| `src/lib/ict-primitives.ts` | ICT 분석 |
| `src/lib/okx/` | 데이터 흐름 상단 |
| `src/lib/whale-detector.ts` | 핵심 로직 — 고래 감지 |
| `scripts/whale-notifier.ts` | 텔레그램 알림 |
| `src/lib/constants.ts` | CLAUDE.md — 모니터링 대상 코인 |
| `package.json` (scripts 섹션) | CLAUDE.md — 명령어 |
| `fly.toml`, `Dockerfile` | 텔레그램 알림 배포 정보 |

환경변수 레퍼런스는 `src/` 전체에서 `process.env.`를 grep해서 실제 사용 변수를 확인한다.

### 3단계: 비교 — 달라진 부분 찾기

코드에서 읽은 사실과 문서에 적힌 내용을 섹션별로 비교한다.

달라진 것의 예:
- 새 API 라우트가 추가됐는데 문서에 없음
- 폴링 주기가 바뀜 (예: 15s → 30s)
- 컴포넌트가 추가/삭제/이동됨
- ICT 로직 파라미터가 바뀜 (예: lookback, MIN_FVG_RATIO, confluence 기준)
- store 설명이 현재 동작과 다름
- 환경변수가 추가/삭제됨
- 명령어가 바뀜
- 모니터링 코인 목록이 바뀜

달라지지 않은 부분은 건드리지 않는다.

### 4단계: 변경사항 있을 때만 수정

변경이 필요한 부분이 있으면:
- 해당 라인만 Edit 도구로 수정
- 기존 문서의 주석 스타일(`# 주석`, `— 설명`) 그대로 유지
- 인접한 관련 없는 줄은 수정하지 않음

변경이 없으면: "문서가 코드와 일치합니다. 업데이트 불필요합니다." 라고 알린다.

### 5단계: 요약 리포트

수정한 내용을 간단히 보고한다:

```
업데이트 완료:
- ARCHITECTURE.md: [변경된 섹션 목록]
- CLAUDE.md: [변경된 섹션 목록]

변경 없음:
- [그대로인 섹션 목록]
```

## 이 프로젝트의 문서 구조 참고

**ARCHITECTURE.md** 주요 섹션:
- 데이터 흐름 (OKX API → okx/client → public-api → smartmoney-api)
- ICT 분석 (ict.ts, ict-primitives.ts 동작 방식 및 파라미터)
- Next.js Route Handlers (API 엔드포인트 목록)
- 클라이언트 폴링 hooks (폴링 주기 포함)
- 상태 관리 stores
- 텔레그램 알림 (notifier 동작 방식, 임계값, 배포)
- 컴포넌트 계층 (트리 구조)
- 핵심 로직 (고래 감지, Rate limit, SmartMoney)

**CLAUDE.md** 주요 섹션:
- 명령어 (npm scripts, fly 명령어)
- 환경변수 표 (변수명, 기본값, 설명)
- 모니터링 대상 코인
- UI 스타일

## 주의사항

- 문서의 한국어 주석 스타일과 코드 블록 포맷을 그대로 유지할 것
- ARCHITECTURE.md의 ASCII 트리 구조(└──, ├──)는 기존 포맷 유지
- 파라미터 수치(lookback=15, MIN_FVG_RATIO=0.003 등)는 실제 코드와 정확히 일치시킬 것
- 추측으로 쓰지 말 것 — 반드시 코드를 읽고 확인 후 수정
