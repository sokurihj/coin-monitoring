# Whale Radar — 로드맵

데이트레이딩 포지션 진입 보조 지표 추가 계획 및 구현 현황.

---

## 현재 구현된 기능

| 기능 | 설명 | 폴링 | 상태 |
|---|---|---|---|
| 고래 피드 | 단건 체결 ≥$100K 실시간 감지 (MEGA/LARGE/MED 등급) | 5s | ✅ |
| OI 변동 | 코인별 미결제약정 변동률 + 펀딩비 | 30s | ✅ |
| 펀딩비 | 전체 SWAP 펀딩비 목록 | 10s | ✅ |
| 스마트머니 | 상위 트레이더 롱/숏 비율 (BTC·ETH·SOL, 1H) | 60s | ✅ |
| 리드 트레이더 | OKX 카피트레이딩 상위 5인 수익률·승률 | 120s | ✅ |
| 텔레그램 알림 | $300K+ 체결 시 봇 메시지 전송 | 5s (백그라운드) | ✅ |
| GitHub Actions | 5분마다 고래 알림 자동 실행 | cron | ✅ |
| CVD | 코인별 누적 체결량 델타 SVG 스파크라인 | 5s | ✅ |
| 청산 피드 | 롱/숏 청산 최신 10건, Zustand 누적 | 10s | ✅ |
| 오더북 불균형 | 코인별 bid/ask 비율 그라디언트 바 | 3s | ✅ |
| 캔들 API | `/api/candles?coin=&bar=` Route Handler + hook | 15s | ✅ |
| 캔들차트 | lightweight-charts v5 — 캔들 + RSI(14) + MACD(12,26,9), 탭 전환 | 15s | ✅ |

---

## 추가 예정 기능 (데이트레이딩 진입 보조)

### 1. CVD (Cumulative Volume Delta)
**목적:** 매수/매도 체결 압력의 방향성 확인 — 가격 상승 중 CVD 하락이면 허수 상승 가능성

| 항목 | 내용 |
|---|---|
| 데이터 소스 | `/api/v5/market/trades` (기존 재활용) |
| 계산 방식 | 폴링 주기마다 buyUsd − sellUsd 합산 후 누적 |
| 표시 위치 | 오른쪽 패널 하단 — 코인별 SVG 스파크라인 + 현재 CVD 값 |
| 폴링 | 5s |
| 상태 | ✅ 구현 완료 |

---

### 2. 실시간 청산 피드
**목적:** 어느 방향(롱/숏)의 청산이 발생하는지 확인 → 강제 청산 방향이 다음 이동 방향 힌트

| 항목 | 내용 |
|---|---|
| 데이터 소스 | `/api/v5/public/liquidation-orders?instType=SWAP&state=filled` |
| 표시 위치 | 오른쪽 패널 — 최신 10건 (시각·코인·LONG LIQ/SHORT LIQ·규모) |
| 폴링 | 10s |
| 주의 | 조용한 시장에서 빈 배열 반환 가능, graceful fallback 처리 필요 |
| 상태 | ✅ 구현 완료 |

---

### 3. 오더북 불균형 (Order Book Imbalance)
**목적:** 매수벽/매도벽 비율 확인 → 단기 지지·저항 방향 추정

| 항목 | 내용 |
|---|---|
| 데이터 소스 | `/api/v5/market/books?instId=&sz=20` |
| 계산 방식 | imbalance = (totalBid − totalAsk) / (totalBid + totalAsk) ∈ [−1, +1] |
| 표시 위치 | 오른쪽 패널 — 코인별 그라디언트 바 (초록=bid우세, 빨강=ask우세) |
| 폴링 | 3s |
| 상태 | ✅ 구현 완료 |

---

### 4. 캔들차트 + 기술적 지표
**목적:** 진입 타이밍 확인용 RSI·MACD 실시간 확인

| 항목 | 내용 |
|---|---|
| 데이터 소스 | `/api/v5/market/candles?instId=&bar=1m&limit=100` |
| 차트 라이브러리 | `lightweight-charts` v5 |
| 지표 | RSI(14) — Wilder EMA, MACD(12,26,9) |
| 타임프레임 | 1m / 5m / 15m / 1H / 4H |
| 표시 위치 | 왼쪽 패널 탭 전환 — [고래피드] / [캔들 차트] |
| 폴링 | 15s |
| 주의 | SSR 불가, `dynamic(..., { ssr: false })` 래핑 필요 |
| 상태 | ✅ 구현 완료 |

---

### 5. 거래 빈도 급증 감지
**목적:** 단위 시간당 고래 체결 급증 → 모멘텀 선행 신호

| 항목 | 내용 |
|---|---|
| 데이터 소스 | 기존 `whaleStore.trades` 재활용 (API 추가 없음) |
| 계산 방식 | 60s 슬라이딩 윈도우 거래 수 vs 5분 롤링 평균 — 2배 초과 시 spike |
| 표시 위치 | CoinTabBar 탭 배지 (🔥) |
| 상태 | ✅ 구현 완료 |

---

## 구현 순서

```
Phase 1  타입 + OKX API 함수 + 상수 + indicators.ts                          ✅ 완료
Phase 2  Route Handlers (/api/cvd, /api/liquidations, /api/orderbook, /api/candles)
         + Zustand store (cvdStore, liquidationStore) + React Query hooks      ✅ 완료
Phase 3  오른쪽 패널 컴포넌트 3개 (OB Imbalance, Liquidation Feed, CVD Chart) ✅ 완료
Phase 4  캔들차트 + RSI/MACD 패널 + LeftPanelTabs                             ✅ 완료
Phase 5  frequencyStore + CoinTabBar 배지                                      ✅ 완료
```

---

## 레이아웃 변경 계획

```
Phase 4 완료 기준 현재 레이아웃
─────────────────────────────────────────────────────────
LeftPanelTabs (flex-1)
  [고래피드] 탭: WhaleFeed (기존)
  [캔들 차트] 탭: CandleChart (캔들 / RSI(14) / MACD(12,26,9))
               타임프레임: 1m / 5m / 15m / 1H / 4H

RightPanel w-72
  FundingRateBar         ✅
  OIMoversTable          ✅
  SmartMoneyPanel        ✅
  OrderBookImbalanceBar  ✅
  LiquidationFeed        ✅
  CvdChart               ✅
```

---

## 향후 고려 기능

| 기능 | 설명 | 비고 |
|---|---|---|
| 선물 프리미엄 (Basis) | 현물 대비 선물 가격 차이 | spot ticker 추가 필요 |
| Volume Profile / POC | 가격대별 거래량 분포 | 별도 집계 로직 필요 |
| 거래소 넷플로우 | 거래소 입출금량 → 매도 압력 | 외부 API (Glassnode 등) |
| 멀티 타임프레임 | 1m, 5m, 15m, 1H, 4H 캔들 전환 | ✅ 구현 완료 |
| 알림 고도화 | RSI 과매수/과매도, OB 극단값 텔레그램 전송 | notifier 스크립트 확장 |
