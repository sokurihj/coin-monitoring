# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 프로젝트 개요

**Whale Radar** — OKX 선물(SWAP) 시장의 실시간 고래 거래 추적 대시보드.
폴링 기반으로 고래 체결, OI 변동, 펀딩비, 스마트머니 신호를 모니터링한다.

## 명령어

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
npm run notifier # 텔레그램 고래 알림 백그라운드 프로세스 (로컬 실행용)
```

## 아키텍처

### 데이터 흐름

```
OKX Public API (https://www.okx.com/api/v5/...)
  └── src/lib/okx/client.ts        # okxFetch() — 공통 fetch 래퍼
                                   # okxAuthFetch() — HMAC-SHA256 인증 래퍼
  └── src/lib/okx/public-api.ts    # 엔드포인트별 typed 함수들
  └── src/lib/okx/smartmoney-api.ts  # SmartMoney 전용 API 함수들

ICT 분석 (클라이언트 사이드)
  └── src/lib/ict.ts               # FVG / OB / LiquidityLevel / BOS·CHoCH / ICTSignal 감지
                                   # generateICTSignals() — 컨플루언스 3개 이상, 마감된 봉만, ±1.5% 범위 필터
  └── src/lib/ict-primitives.ts    # ZoneBoxesPrimitive — ISeriesPrimitive 구현
                                   # zone 생성 시점 캔들부터 차트 오른쪽 끝까지 반투명 박스 렌더링

Next.js Route Handlers (서버 사이드, force-dynamic)
  └── /api/whale-feed              # 체결 조회 → 고래 감지 → WhaleTradeEvent[]
  └── /api/oi-movers               # OI + 티커 + 펀딩비 집계 → OIMover[]
  └── /api/funding                 # 펀딩비 목록 → FundingRateInfo[]
  └── /api/tickers                 # 티커 목록
  └── /api/smartmoney/signals      # 상위 트레이더 롱/숏 비율 (BTC, ETH, SOL)
  └── /api/smartmoney/traders      # OKX 카피트레이딩 리더 트레이더 상위 5명

클라이언트 (React Query 폴링)
  └── hooks/useWhaleStream.ts      # 5s 폴링 → whaleStore 누적 + frequencyStore recompute
  └── hooks/useOIMovers.ts         # 30s 폴링
  └── hooks/useFundingRates.ts     # 10s 폴링
  └── hooks/useCandles.ts          # 15s 폴링
  └── hooks/useCvd.ts              # 5s 폴링
  └── hooks/useLiquidations.ts     # 10s 폴링
  └── hooks/useOrderBook.ts        # 3s 폴링

상태 관리
  └── store/whaleStore.ts          # Zustand + persist — 최신 200건 localStorage 영속화(key: whale-feed), tradeId 중복 제거, seenIds는 rehydration 시 재구성
  └── store/alertStore.ts          # Zustand + persist — 알림 설정 localStorage 저장
  └── store/cvdStore.ts            # Zustand — 코인별 CVD 누적
  └── store/liquidationStore.ts    # Zustand — 청산 이벤트 누적
  └── store/frequencyStore.ts      # Zustand — 코인별 거래 빈도 spike 감지 (60s 슬라이딩 윈도우 vs 5분 평균 2배)

텔레그램 알림 (백그라운드, 브라우저 불필요)
  └── src/lib/telegram.ts          # sendTelegramMessage() — Bot API 호출 헬퍼
  └── scripts/whale-notifier.ts    # 독립 폴링 프로세스 — large($300K+) 감지 시 텔레그램 전송
                                   # MAX_RUNTIME_MS 환경변수로 실행 시간 제한 (GitHub Actions용)
  └── .github/workflows/whale-notifier.yml  # workflow_dispatch + schedule(*/5) — cron-job.org가 5분마다 외부 트리거
                                            # concurrency: whale-notifier 그룹으로 중복 실행 방지
```

### 컴포넌트 계층

```
app/dashboard/page.tsx
  └── DashboardShell               # 레이아웃 루트, useWhaleStream 초기화
      ├── TopBar                   # 연결 상태 표시
      ├── MarketOverviewStrip      # 코인별 가격/변동률 띠
      ├── CoinTabBar               # 코인 필터 탭 (🔥 frequencyStore spike 배지)
      ├── LeftPanelTabs (좌, flex-1)
      │   ├── [고래피드] 탭: WhaleFeed
      │   └── [캔들 차트] 탭: CandleChart (캔들 / Volume / RSI(14) / MACD(12,26,9), 1m~4H)
      │                            pane 순서: 캔들(0) · Volume(1) · RSI(2) · MACD(3)
      │                            Volume hover 시 헤더에 수치 표시 (subscribeCrosshairMove)
      │                            ICT 토글 — FVG/OB/Liquidity 박스 + BUY/SELL 마커
      │                            fitContent()는 최초 로드 및 코인/타임프레임 변경 시에만 호출 (폴링 시 뷰 유지)
      └── RightPanel (우, w-72)
          ├── FundingRateBar
          ├── OIMoversTable
          ├── SmartMoneyPanel      # TOP TRADER L/S + LEAD TRADERS
          ├── OrderBookImbalanceBar
          ├── LiquidationFeed
          └── CvdChart
```

### 핵심 로직

**고래 감지** (`src/lib/whale-detector.ts`):
- OKX SWAP 계약 단위(ctVal)를 통해 USD 환산: `체결수량(계약) × ctVal × 가격`
- ctVal은 instruments API에서 1시간 TTL로 인메모리 캐시, `CT_VAL_FALLBACK`이 fallback
- `WHALE_THRESHOLDS` (medium $100K / large $300K / mega $1M), 환경변수로 오버라이드 가능
- 단건 체결 기준 (여러 체결 합산 없음)

**Rate limit 방어**: 모든 Route Handler에서 `pLimit(5)` 사용

**SmartMoney** (`src/lib/okx/smartmoney-api.ts`):
- `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` 환경변수 없으면 패널 비활성
- 인증: HMAC-SHA256 서명 (`okxAuthFetch` in `client.ts`)
- signals: `/api/v5/rubik/stat/contracts/long-short-account-ratio-contract-top-trader` (1H, BTC/ETH/SOL)
- traders: `/api/v5/copytrading/public-lead-traders` → `data[0].ranks[]` 구조

## 환경변수

`.env.local`에 설정:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `WHALE_MEGA_USD` | 1000000 | 메가 고래 임계값 |
| `WHALE_LARGE_USD` | 300000 | 대형 고래 임계값 |
| `WHALE_MEDIUM_USD` | 100000 | 중형 고래 임계값 |
| `NEXT_PUBLIC_POLL_INTERVAL` | 5000 | 폴링 주기 (ms) |
| `OKX_API_KEY` | — | SmartMoney 기능 활성화 |
| `OKX_SECRET_KEY` | — | SmartMoney 기능 활성화 |
| `OKX_PASSPHRASE` | — | SmartMoney 기능 활성화 |
| `TELEGRAM_BOT_TOKEN` | — | 텔레그램 알림 활성화 (BotFather 발급) |
| `TELEGRAM_CHAT_ID` | — | 텔레그램 수신 채팅 ID |
| `MAX_RUNTIME_MS` | — | 노티파이어 최대 실행 시간 ms (GitHub Actions: 270000) |

## 모니터링 대상 코인

`src/lib/constants.ts`의 `MONITORED_COINS` 배열로 관리: `BTC, ETH, SOL`

## UI 스타일

- CSS 변수 기반 다크 테마 (`globals.css`): `--bg-base`, `--bg-panel`, `--border` 등
- shadcn/ui 컴포넌트는 `src/components/ui/`에 위치
- Tailwind CSS v4 사용 (`@tailwindcss/postcss`)
