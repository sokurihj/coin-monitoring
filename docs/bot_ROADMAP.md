# 데모 자동 매매 봇 구현 로드맵

## 전략 개요

**멀티 타임프레임 Top-Down ICT 전략**

| 타임프레임 | 역할 |
|-----------|------|
| 1H | 큰 추세 방향 확정 (BUY / SELL) |
| 15m | 중간 추세가 1H와 일치하는지 확인 |
| 1m | 진입 신호가 상위 두 타임프레임과 모두 일치할 때 진입 |

3개 타임프레임 모두 같은 방향일 때만 진입 → 신호 빈도 낮지만 품질 높음.

실행 대상: OKX 공식 데모 트레이딩 계정 (`x-simulated-trading: 1` 헤더)

---

## 구현 태스크

### [ ] 1. `src/lib/okx/client.ts` — POST 지원 추가

- `okxAuthPost<T>(path, body, simulated?)` 함수 추가
  - prehash = `timestamp + 'POST' + path + JSON.stringify(body)`
  - `simulated=true`이면 헤더에 `x-simulated-trading: 1` 추가
- 기존 `okxAuthFetch`에 `simulated?: boolean` 옵션 추가

### [ ] 2. `src/lib/okx/trade-api.ts` 신규 — 데모 주문 API

사용 OKX 엔드포인트:
- `POST /api/v5/trade/order` — 시장가 주문 (TP/SL 포함)
- `GET /api/v5/account/positions` — 포지션 조회
- `GET /api/v5/account/balance` — USDT 잔고 조회

구현 함수:
```typescript
placeOrder(instId, side, sz, tpPx, slPx): Promise<string>  // ordId 반환
getPositions(instId?): Promise<DemoPosition[]>
getUsdtBalance(): Promise<number>
```

주문 파라미터 (단방향 net 모드):
```json
{
  "instId": "BTC-USDT-SWAP",
  "tdMode": "cross",
  "side": "buy",
  "ordType": "market",
  "sz": "1",
  "tpTriggerPx": "96000",
  "tpOrdPx": "-1",
  "slTriggerPx": "94500",
  "slOrdPx": "-1"
}
```

### [ ] 3. `scripts/demo-bot.ts` 신규 — 봇 메인 스크립트

패턴: `whale-notifier.ts`와 동일한 구조 (`poll()` + `setInterval`)
폴링 주기: 30초

**멀티 타임프레임 정렬 함수:**
```typescript
function getAlignedDirection(
  bars1h: CandleBar[],
  bars15m: CandleBar[],
  bars1m: CandleBar[],
): 'BUY' | 'SELL' | null
// 셋 모두 같은 방향 → 해당 방향, 아니면 null
```

**봇 루프 흐름:**
```
poll()
├─ getSwapInstruments() → ctVal 캐시
├─ MONITORED_COINS (BTC, ETH, SOL) 순회
│  ├─ 3개 타임프레임 캔들 병렬 조회 (1H / 15m / 1m, 각 100개)
│  ├─ getAlignedDirection() → null이면 skip
│  ├─ 이미 처리한 1m 신호 ts면 skip (processedSignals Set)
│  ├─ getPositions() → 포지션 있으면 skip
│  └─ 진입: 계약 수 계산 → placeOrder() → 텔레그램 알림
└─ MAX_RUNTIME_MS 초과 시 exit(0)
```

**텔레그램 알림 형식:**
```
🤖 [DEMO] BUY BTC-USDT-SWAP
진입: $95,234.50
TP: $96,187 (+1.0%)
SL: $94,757 (-0.5%)
크기: 0.01계약 (~$100)
정렬: 1H BUY · 15m BUY · 1m BUY
강도: strong ⭐ / 이유: FVG↑, OB↑, SSL스윕
```

### [ ] 4. `package.json` — 스크립트 추가

```json
"demo-bot": "tsx --env-file=.env.local scripts/demo-bot.ts"
```

### [ ] 5. `.env.local` — 환경변수 추가

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DEMO_TRADE_SIZE_USDT` | 100 | 1회 진입 금액 (USDT) |
| `DEMO_TP_PCT` | 1.0 | TP 비율 (%) |
| `DEMO_SL_PCT` | 0.5 | SL 비율 (%) |

> OKX 데모 API 키는 실제 계정 키와 별도로 발급 필요  
> OKX 앱 > 데모 트레이딩 > API 관리

---

## 재사용 기존 코드

| 함수 / 타입 | 경로 |
|------------|------|
| `generateICTSignals(bars)` | `src/lib/ict.ts` |
| `sendTelegramMessage(text)` | `src/lib/telegram.ts` |
| `getCandles(instId, bar, limit)` | `src/lib/okx/public-api.ts` |
| `getSwapInstruments()` | `src/lib/okx/public-api.ts` |
| `MONITORED_COINS` | `src/lib/constants.ts` |
| `CandleBar` 타입 | `src/types/whale.ts` |

---

## 검증 체크리스트

- [ ] OKX 데모 계정 API 키 발급
- [ ] `.env.local`에 키 설정
- [ ] `npm run demo-bot` 실행
- [ ] 터미널 로그에서 타임프레임 정렬 상태 확인 (`1H=BUY 15m=SELL → skip`)
- [ ] 정렬 신호 발생 시 OKX 데모 앱에서 주문/포지션 확인
- [ ] 텔레그램 메시지 수신 확인

---

## 주의사항

- 단방향(net) 모드 가정 — 헤지 모드 계정이면 `posSide` 파라미터 필요
- 3개 타임프레임 정렬이 드물어 진입 빈도가 낮을 수 있음 (의도된 동작)
- 1m 현재 진행 중인 봉은 신호에서 자동 제외 (`generateICTSignals` 내부 처리)
