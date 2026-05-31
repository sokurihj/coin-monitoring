# GitHub Actions — 고래 알림 배포 가이드

카드 없이 완전 무료로 텔레그램 알림을 24시간 받는 방법입니다.  
5분마다 GitHub이 자동으로 스크립트를 실행합니다.

> **필수 조건**: GitHub 레포가 **Public(공개)** 이어야 합니다.  
> Private 레포는 월 2,000분 제한이 있어 약 1.5일이면 소진됩니다.

---

## 작동 방식

```
5분마다 GitHub Actions 실행
  → whale-notifier가 4분 30초 동안 5초 폴링 반복
  → 자동 종료
5분 후 다시 실행 (무한 반복)
```

---

## 1단계 — 레포 공개로 전환 (Private인 경우)

1. GitHub 레포 → **Settings** 탭
2. 맨 아래 **Danger Zone** → **Change repository visibility**
3. **Make public** 선택 후 확인

---

## 2단계 — GitHub Secrets 등록

텔레그램 토큰을 코드에 직접 넣지 않고 Secrets에 저장합니다.

1. GitHub 레포 → **Settings → Secrets and variables → Actions**
2. **New repository secret** 클릭 후 두 개 추가:

| Name | Value |
|------|-------|
| `TELEGRAM_BOT_TOKEN` | BotFather에서 받은 토큰 |
| `TELEGRAM_CHAT_ID` | getUpdates에서 확인한 chat.id |

---

## 3단계 — 코드 푸시

로컬에서:

```bash
git push
```

`.github/workflows/whale-notifier.yml` 파일이 레포에 올라가면 자동으로 활성화됩니다.

---

## 4단계 — 첫 실행 확인

1. GitHub 레포 → **Actions** 탭
2. **Whale Notifier** 워크플로 선택
3. **Run workflow** 버튼으로 수동 실행 테스트
4. 실행 로그에서 정상 동작 확인

정상 로그:
```
🐋 Whale Notifier 시작
   코인: BTC-USDT-SWAP, ETH-USDT-SWAP, SOL-USDT-SWAP
   임계값: large $300,000 / mega $1,000,000
   폴링: 5초 간격
```

---

## 워크플로 중지 방법

알림을 멈추고 싶을 때:

1. GitHub 레포 → **Actions** 탭
2. **Whale Notifier** 워크플로 선택
3. 우측 `...` 메뉴 → **Disable workflow**

---

## 주의사항

- 이미 알림을 보낸 거래는 같은 실행 내에서는 중복 전송되지 않습니다.
- 단, 실행이 새로 시작될 때(5분마다) 메모리가 초기화됩니다.  
  → 5분 경계에 걸친 거래는 최대 1회 중복 알림이 올 수 있습니다.
