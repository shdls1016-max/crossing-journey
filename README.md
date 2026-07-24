# Crossing Journey

모바일 세로형 스테이지 기반 길 건너기 게임의 공통 기반 프로젝트다.
현재 단계에는 로딩, 화면 전환, 공통 UI, 저장 및 설정 서비스, 완성된 월드맵과 빈 게임 Scene을 포함한다.

## 실행

Node.js 20 이상을 사용한다.

```bash
npm install
npm run dev
```

프로덕션 빌드 검증:

```bash
npm run build
```

## Cloudflare Pages 배포

GitHub 저장소를 Cloudflare Pages에 연결하고 다음 값을 사용한다.

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `20` 이상

Vite의 `base`는 상대 경로(`./`)로 설정되어 있어 Pages의 프로젝트 도메인과
프리뷰 배포 경로에서 동일한 정적 에셋 경로를 사용한다. 별도의 환경 변수는 필요하지 않다.

## 현재 화면 흐름

```text
LoadingScene
  → WorldMapScene
      → GameScene
      → Character Select 기반 화면
```

DOM UI의 공통 팝업 상태에는 `stage-card`, `pause`, `failure`, `clear`, `settings`가 준비되어 있다.
별도의 홈 화면은 없으며 로딩 완료 후 월드맵이 열린다.

월드맵은 Stage 1~20을 4개 지역의 S자 경로로 배치하며 터치 드래그, 마우스 드래그와
마우스 휠을 지원한다. 스테이지 선택은 카드의 `PLAY` 버튼을 통해서만 게임 Scene으로 연결된다.

## 주요 구조

- `src/assets/`: Phaser 이미지 키와 프리로드 목록
- `src/data/`: Stage 1~20의 최소 데이터
- `src/flow/`: 화면 및 팝업 상태와 Scene 전환
- `src/game/scenes/`: 로딩, Stage 1~20 월드맵, 게임 Scene
- `src/progress/`: 최초 클리어, 재플레이 최고 기록, 해금 이동 데이터
- `src/gameplay/`: 플레이어 제어, 장애물 생성, 충돌 판정 연결 지점
- `src/storage/`: 버전이 있는 localStorage 저장 서비스와 복구 처리
- `src/settings/`: 효과음, 배경음악, 진동 설정
- `src/audio/`: 추후 Phaser 오디오 연결용 서비스
- `src/ui/`: 공통 버튼, 팝업과 전체 UI 셸
- `src/styles/`: 디자인 토큰과 전체화면·safe-area 스타일

## 다음 구현 연결 위치

- 월드맵 지역·노드·경로·해금 이동: `src/game/scenes/WorldMapScene.ts`
- 스테이지 난이도 데이터: `src/data/stages.ts`
- 플레이어 이동: `src/gameplay/PlayerController.ts`
- 차량·통나무·기차 생성: `src/gameplay/ObstacleSpawner.ts`
- 충돌 및 판정: `src/gameplay/CollisionSystem.ts`
- 실제 플레이 조립: `src/game/scenes/GameScene.ts`
- 성공·실패 저장 반영: `src/storage/SaveService.ts`
- 클리어·재플레이 결과 처리: `src/progress/GameProgressService.ts`
- 캐릭터 구매 UI: `src/ui/AppShell.ts`

이미지를 추가하거나 수정하기 전에는 루트의 `GAME_ART_STYLE_GUIDE.md`와
`ASSET_MANIFEST.md`를 먼저 확인한다.
