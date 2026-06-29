# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@ARCHITECTURE.md

## 프로젝트 개요

**Whale Radar** — OKX 선물(SWAP) 시장의 실시간 고래 거래 추적 대시보드.
폴링 기반으로 고래 체결, OI 변동, 펀딩비를 모니터링한다.

## 명령어

```bash
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
npx tsc --noEmit # 타입체크 (package.json에 별도 script 없음)
npm run notifier # 텔레그램 고래 알림 백그라운드 프로세스 (로컬 실행용)
fly deploy       # Fly.io 배포 (프로덕션 노티파이어)
fly logs         # 실시간 노티파이어 로그 확인
fly status       # 머신 상태 확인
```

## 환경변수

`.env.local`에 설정:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `WHALE_MEGA_USD` | 1000000 | 메가 고래 임계값 |
| `WHALE_LARGE_USD` | 300000 | 대형 고래 임계값 |
| `WHALE_MEDIUM_USD` | 100000 | 중형 고래 임계값 |
| `NEXT_PUBLIC_POLL_INTERVAL` | 5000 | 폴링 주기 (ms) |
| `OKX_API_KEY` | — | 매매일지 기능 활성화 (Read+Trade 권한 필요) |
| `OKX_SECRET_KEY` | — | 매매일지 기능 활성화 |
| `OKX_PASSPHRASE` | — | 매매일지 기능 활성화 |
| `TELEGRAM_BOT_TOKEN` | — | 텔레그램 알림 활성화 (BotFather 발급) |
| `TELEGRAM_CHAT_ID` | — | 텔레그램 수신 채팅 ID |
| `MAX_RUNTIME_MS` | — | 노티파이어 최대 실행 시간 ms (로컬/CI용, Fly.io에서는 미설정) |
| `UPSTASH_REDIS_REST_URL` | — | Upstash Redis URL (ICT 신호·고래 중복 방지) |
| `UPSTASH_REDIS_REST_TOKEN` | — | Upstash Redis 인증 토큰 |

## 모니터링 대상 코인

`src/lib/constants.ts`의 `MONITORED_COINS` 배열로 관리: `BTC, ETH, SOL`

## UI 스타일

- CSS 변수 기반 다크 테마 (`globals.css`): `--bg-base`, `--bg-panel`, `--border` 등
- shadcn/ui 컴포넌트는 `src/components/ui/`에 위치
- Tailwind CSS v4 사용 (`@tailwindcss/postcss`)
