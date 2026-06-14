## 아키텍처

### 데이터 흐름

```
OKX Public API (https://www.okx.com/api/v5/...)
  └── src/lib/okx/client.ts        # okxFetch() — 공통 fetch 래퍼
                                   # okxAuthFetch() — HMAC-SHA256 인증 래퍼
  └── src/lib/okx/public-api.ts    # 엔드포인트별 typed 함수들
  └── src/lib/okx/smartmoney-api.ts  # SmartMoney 전용 API 함수들
  └── src/lib/okx/trading-api.ts  # 매매일지 전용 API 함수들 — getFills() / parseFill() / getAccountBalance() / getPositions() / getPendingLimitOrders()
                                   # parseFill: id = tradeId || billId (tradeId 우선, OKX API는 fillId 대신 billId 반환)
                                   # getPositions: /api/v5/account/positions + /api/v5/trade/orders-algo-pending 병렬 조회
                                   #   알고 주문(conditional) TP/SL을 instId 기준으로 포지션에 병합 (포지션 직접 설정 우선)
                                   # getPendingLimitOrders: /api/v5/trade/orders-pending (instType=SWAP, ordType=limit)
                                   #   live/partially_filled 상태만 반환, posSide 포함 (Open L/S · Close L/S 구분용)

ICT 분석 (클라이언트 사이드)
  └── src/lib/ict.ts               # FVG / OB / LiquidityLevel / BOS·CHoCH / ICTSignal 감지
                                   # generateICTSignals() — 봉 마감 시점 기준 (bars[0..idx]로 소급 방지)
                                   #   컨플루언스 3개=medium / 4개+=strong, FVG/OB/BB 접촉 필수, 마감된 봉만 검사
                                   #   캔들 방향 조건 없음 — 양봉/음봉 무관하게 컨플루언스 충족 시 신호 발생
                                   #   FVG: 이전 봉이 이미 접촉 중이면 제외 (존 최초 진입 봉에만 FVG 카운트)
                                   #   OB: confirmedTs(엔겔핑 봉 마감 시점) 이후 봉에서만 신호 발생
                                   #   BOS/CHoCH는 신호 컨플루언스에서 제외 — 차트 라인 전용
                                   #   각 봉 평가 시 그 봉 당시 미충전/미위반/미스윕 레벨로 재계산 (차트 표시와 불일치 가능)
                                   # detectFVGs() — MIN_FVG_RATIO=0.002 (갭이 가격의 0.2% 이상인 FVG만 유효), 마감된 봉만 c3로 사용
                                   #   filled: wick/body가 갭 반대 끝까지 도달 시 소멸 (bullish=low≤bottom, bearish=high≥top)
                                   # detectOrderBlocks() — 엔겔핑 기반: 다음 캔들이 현재 캔들 몸통을 완전히 덮을 때 OB 인정
                                   #   Bullish: next.open ≤ ob.open (OB 몸통 안 또는 아래 시작) && next.close > ob.open
                                   #   Bearish: next.open ≥ ob.open (OB 몸통 안 또는 위 시작) && next.close < ob.open
                                   #   → 갭 상승/하강 후 살짝 이동하는 캔들을 엔겔핑으로 오인 방지
                                   #   MIN_OB_RATIO=0.003 (엔겔핑 캔들 몸통 - OB 캔들 몸통 차이가 가격의 0.3% 이상인 OB만 유효)
                                   #   confirmedTs 필드: OB 확정 시점(엔겔핑 봉 ts), 진행 중인 봉은 next에서 제외
                                   #   violated 체크: 마감된 봉만 사용 (bars.slice(i+1, -1)) — 진행 중인 봉 제외로 깜빡임 방지
                                   # detectBreakerBlocks() — violated OB에서 파생, 극성 반전된 존
                                   #   Bullish OB violated → Bearish Breaker BB↓ (저항), Bearish OB violated → Bullish Breaker BB↑ (지지)
                                   #   breakerTs: violation 유발 첫 봉 ts, mitigated: 전환 후 재돌파 시 소멸 (숨김, 마감된 봉만 검사)
                                   #   신호 컨플루언스: BB↑/BB↓ (FVG/OB와 동일 레벨, hasBuyZone/hasSellZone 조건 포함)
                                   #   차트 색상: Bullish Breaker=#00c076(초록), Bearish Breaker=#ff3b5c(빨강), alpha=0.1
                                   # detectLiquidityLevels() — leftLookback=15, rightLookback=5 (좌 15봉 높이 기준, 우 5봉 확정 대기)
                                   # detectMarketStructure() — 좌측 10봉 + 우측 5봉 기준 스윙 확정
                                   #   BOS: 현재 추세 방향 스윙 레벨 몸통 돌파 (추세 지속), originTs=직전 스윙 원점
                                   #   CHoCH: 반대 추세 방향 — peakInDowntrend/valleyInUptrend(추세 전 최고/최저) 기준
                                   #     runningMaxHigh/runningMinLow로 초기 봉 포함 전체 구간 최고/최저 추적
                                   #     CHoCH 라인: 원래 꼭지/바닥(originTs) → 돌파 봉(endTs) 구간에만 표시
                                   #   StructurePoint.originTs: 깨진 스윙 원점 봉 ts (라인 시작점)
  └── src/lib/ict-primitives.ts    # ZoneBoxesPrimitive — ISeriesPrimitive 구현
                                   # ZoneBox.lineMode=true면 점선 수평선 (BSL/SSL/BOS/CHoCH), false면 반투명 박스 (FVG/OB)
                                   # ZoneBox.endTs: lineMode 선 끝점 Unix seconds — 지정 시 해당 봉에서 종료, 미지정 시 차트 우측 끝
                                   # ZoneBox.labelBelow: true면 선 아래 레이블 (BOS↓/CHoCH↓), 기본은 선 위
                                   # 존 표시: FVG 4개, OB 4개, BB 4개, BSL 2개, SSL 2개
                                   # 근접 필터는 CandleChart에서 적용 — 타임프레임별 ±% 범위 내 존만 렌더링 (primitive 자체는 필터 없음)

Next.js Route Handlers (서버 사이드, force-dynamic)
  └── /api/whale-feed              # 체결 조회 → 고래 감지 → WhaleTradeEvent[]
  └── /api/oi-movers               # OI + 티커 + 펀딩비 집계 → OIMover[]
  └── /api/funding                 # 펀딩비 목록 → FundingRateInfo[]
  └── /api/tickers                 # 티커 목록
  └── /api/candles                 # 캔들 데이터 → Bar[]
  └── /api/cvd                     # CVD(누적 거래량 델타) 데이터
  └── /api/liquidations            # 청산 이벤트 목록 (BTC/ETH/SOL uly 각각 조회, 코인별 최신 20건)
  └── /api/smartmoney/signals      # 상위 트레이더 롱/숏 비율 (BTC, ETH, SOL)
  └── /api/smartmoney/traders      # OKX 리더 트레이더 상위 5명 + 현재 포지션 병렬 조회
  └── /api/trading-log             # OKX 체결 내역 조회 → TradingFill[] (API 키 필요)
  └── /api/account-balance         # OKX 계좌 잔고 조회 → AccountBalance (총자산·가용증거금·사용증거금·미실현손익, API 키 필요)
  └── /api/positions               # OKX 현재 포지션 조회 → Position[] (포지션 TP/SL + 알고 주문 병합, API 키 필요)
  └── /api/limit-orders            # OKX 미체결 limit 주문 조회 → PendingLimitOrder[] (API 키 필요)

클라이언트 (React Query 폴링)
  └── hooks/useWhaleStream.ts      # 5s 폴링 → whaleStore 누적 + frequencyStore recompute
  └── hooks/useOIMovers.ts         # 30s 폴링
  └── hooks/useFundingRates.ts     # 10s 폴링
  └── hooks/useCandles.ts          # 15s 폴링
  └── hooks/useCvd.ts              # 5s 폴링
  └── hooks/useLiquidations.ts     # 10s 폴링
  └── hooks/useTickers.ts          # 5s 폴링
  └── hooks/useTradingLog.ts       # 60s 폴링
  └── hooks/useAccountBalance.ts   # 30s 폴링 — AccountBalance (API 키 없으면 available: false)
  └── hooks/usePositions.ts        # 30s 폴링 — Position[] (API 키 없으면 available: false)
  └── hooks/useLimitOrders.ts      # 30s 폴링 — PendingLimitOrder[] (API 키 없으면 available: false)

상태 관리
  └── store/whaleStore.ts          # Zustand + persist — 최신 200건 localStorage 영속화(key: whale-feed), tradeId 중복 제거, seenIds는 rehydration 시 재구성
  └── store/alertStore.ts          # Zustand + persist — 알림 설정 localStorage 저장
  └── store/cvdStore.ts            # Zustand — 코인별 CVD 누적
  └── store/liquidationStore.ts    # Zustand — 청산 이벤트 누적 (최대 500건, id 중복 제거)
  └── store/frequencyStore.ts      # Zustand — 코인별 거래 빈도 spike 감지 (60s 슬라이딩 윈도우 vs 5분 평균 2배)
  └── store/tradingLogStore.ts     # Zustand + persist — 매매일지 태그(진입·익절·손절)/메모 localStorage 저장(key: trading-notes)
                                   # tags(진입근거)/tpTags(익절근거)/slTags(손절근거) 세 카테고리 독립 관리

텔레그램 알림 (백그라운드, 브라우저 불필요)
  └── src/lib/telegram.ts          # sendTelegramMessage() — Bot API 호출 헬퍼
  └── src/lib/redis.ts             # ICT 신호 중복 방지: filterUnseenSignalKeys() / markSignalKeysSeen()
                                   # 신호 키 포맷: ict:{coin}:{bar}:{ts}:{type}, TTL 24시간
  └── scripts/whale-notifier.ts    # 독립 폴링 프로세스
                                   # 고래 체결: 5초 폴링 — mega($1M+) 감지 시 텔레그램 전송
                                   # ICT 신호: 60초 폴링 — 15m/1H/4H × BTC/ETH/SOL, MEDIUM(3개+) 이상 전송
                                   # 고래 체결: mega($1M+)만 전송 (large 제외)
  └── Dockerfile                   # Node.js 20 Alpine 기반 — npx tsx scripts/whale-notifier.ts 실행
  └── fly.toml                     # Fly.io 배포 설정 — shared-cpu-1x / 256MB / nrt 리전 / 24시간 상시 실행
  └── .github/workflows/whale-notifier.yml  # workflow_dispatch만 유지 (수동 실행용) — Fly.io 이전으로 스케줄 비활성화
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
      │   │                  └── WhaleVolumeProfile — 가격대별 고래 buy/sell 볼륨 프로파일 (20버킷, 데이터 있는 버킷만 표시)
      │   ├── [캔들 차트] 탭: CandleChart (캔들 / Volume / RSI(14) / MACD(12,26,9), 1m~1W)
      │   │                            pane 순서: 캔들(0) · Volume(1) · RSI(2) · MACD(3)
      │   │                            캔들 hover 시 헤더에 OHLC + Volume 수치 표시 (subscribeCrosshairMove)
      │   │                            ICT 상시 활성 — FVG(흰)/OB/BB 반투명 박스 + BSL/SSL 점선 + BUY/SELL 마커 (hover 시 근거 툴팁 표시)
      │   │                            근접 필터 버튼 (헤더) — 타임프레임별 ±% 범위(1m/5m=2%, 15m/1H=3%, 4H/1D/1W=5%) ON/OFF 토글
      │   │                            API 키 설정 시 useTradingLog로 체결 내역 조회 → 진입(L↑/S↓)/청산(●) 포지션 마커 + hover 툴팁
      │   │                            API 키 설정 시 usePositions로 현재 포지션 조회 → TP(초록) 단일 + SL(빨강) 다중 점선 수평선 표시 (createPriceLine, slTriggerPx 배열 순회)
      │   │                            API 키 설정 시 useLimitOrders로 미체결 limit 주문 조회 → 초록 점선 수평선 + Open/Close L/S 레이블
      │   │                            커스텀 휠 줌 (커서 위치 기준 확대/축소), Shift+드래그로 범위 선택 줌인, 더블클릭으로 줌인 전 뷰 복원 (없으면 fitContent())
      │   │                            BSL/SSL: 0.3% 이내 클러스터 병합 (BSL→높은 것, SSL→낮은 것 유지), 각 최대 2개 표시
      │   └── [매매일지] 탭: TradingJournal (OKX 체결 내역 + 수동 태깅 + 메모, API 키 필요)
      │                            BalancePanel — 상단 4칸 그리드: 총자산·가용증거금·사용증거금·미실현손익 (useAccountBalance, 30s)
      │                            SummaryBar — 전체 건수·승률·손익 집계 (allFills 기준, pnl≠0 체결만 계산)
      │                            MonthlyHeader — 월별 건수·승률(승/패 수)·누적 P&L 헤더 (sticky top)
      │                            무한 스크롤 — IntersectionObserver로 스크롤 끝 도달 시 자동 로드 (nextCursor, billId 기준)
      │                            같은 ordId 부분체결 1행 통합 — 가격 가중평균, 수량·PnL 합산 (groupFillsByOrder)
      └── RightPanel (우, w-72)
          ├── [shrink-0 스크롤 영역]
          │   ├── OIMoversTable
          │   └── SmartMoneyPanel  # TOP TRADER L/S + LEAD TRADERS (클릭 시 포지션 아코디언 — 진입가·추정청산가·레버리지)
          ├── LiquidationFeed      # flex-1 — 코인 탭(ALL/BTC/ETH/SOL) + 금액 필터(ALL/10K+/50K+/100K+) + 청산가 표시
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
- traders: `/api/v5/orbit/public/leaderboard` (상위 5명) + `/api/v5/orbit/public/position-current` (각 트레이더 현재 포지션 병렬 조회)
- 추정 청산가: USDT 마진 격리 기준 `avgPx × (1 ± 1/lever − 0.4%)` — OKX 공개 API 미제공으로 로컬 계산
