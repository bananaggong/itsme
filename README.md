# itsme

취업용 포트폴리오 개인화 전 **samdickie.me 클론 기준 버전**입니다.

- 원본: <https://www.samdickie.me/>, 캡처: 2026-10-16 (한국 시간).
- 범위: 현재 42개 페이지 + 404 + 옛 사이트 뷰어의 48개 내부 페이지.
- 공개 배포 HTML/CSS/JS/폰트/이미지를 원래 경로와 동작 그대로 보존합니다.
- 기준 브랜치: `clone/samdickie-baseline-2026-10-16`.
- 기준 태그: `samdickie-clone-baseline-2026-10-16`.

## 실행

Node.js 22 이상. 서버 런타임 외부 패키지는 없습니다.

```sh
npm ci
npm run dev
# http://localhost:3000
```

`PORT`, `HOST`, `DATA_DIR`로 실행 환경을 지정합니다. 기본 저장소 `.data/store.json`은 Git에서 제외됩니다. 카메라/클립보드는 HTTPS 또는 localhost가 필요합니다.

```sh
npm run audit              # 원본 파일 해시·경로·아카이브 검사
npm test                   # 저장 API·라우팅·입력 검증
npm run build              # dist/ 정적 산출물
npm run test:e2e            # 실행 중인 클론과 원본 PC/모바일 비교
npm run test:interactions   # 원본/클론의 PC/모바일 사용자 조작
npm run test:edges          # 추가 폭·다크 모드·자동 재생·카메라 거절·JS 없음
```

브라우저 검사는 Linux Chromium(`/usr/bin/chromium`)을 사용합니다. `CHROMIUM_PATH`로 변경할 수 있습니다. 화면 비교는 `npm start`를 먼저 실행합니다. `BASE_URL`로 비교할 클론 주소를 지정할 수 있습니다. 이 채팅에는 연결된 브라우저 제어 도구가 없어 환경의 Chromium + Playwright로 검사했습니다.

## 문서와 파일

| 경로 | 내용 |
| --- | --- |
| `docs/REA.md` | 전체 페이지·화면·상태·행동 분석 및 개인화 지점 |
| `docs/CONSTRAINTS.md` | 제약과 원본과의 차이 |
| `docs/VERIFICATION.md` | 검증 결과와 화면 비교 근거 |
| `public/` | 원본 공개 배포물 |
| `reference/manifest.json` | 원본 URL·상태·크기·SHA-256 |
| `reference/routes.json` | 페이지별 컨트롤·스크립트·이미지·외부 링크 |
| `reference/screenshots/` | 원본 화면 증거 |
| `reference/*-results.json` | 화면·인터랙션 검사 결과 |
| `tools/` | 캡처·분석·서버·빌드·검증 도구 |

## 저장 기능

`npm start`는 실제 저장 API를 제공합니다.

- `/api/ratings`: 원본 읽기 전용 집계 스냅샷 + 클론 자체의 평점. 동일 독자의 재평점은 기존 표를 교체합니다.
- `/api/subscribe`: 이메일 형식 검사·중복 정리 후 `pending-import` 큐에 저장합니다. 원본 JS가 설명하는 수동 Substack 가져오기 방식에 맞춘 수집 기능입니다.

**원본 Sam의 서비스에 가입시키거나 이메일을 발송하지 않습니다.** 클론 데이터는 독립적이며 목록 소유자가 내보내서 가져와야 합니다.

```sh
npm run --silent subscribers:export > subscribers.csv
```

CSV와 `.data/`는 개인정보이므로 공개 디렉터리/Git에 넣지 않습니다. 운영 시 `DATA_DIR`을 영구 볼륨으로 지정하고 서버 프로세스 1개로 실행합니다. 다중 인스턴스는 DB로 교체해야 합니다. `dist/`만 정적 호스팅하면 저장 API는 실행되지 않으므로 전체 기능에는 Node 서버 또는 별도 API가 필요합니다.

## 기준 버전에서 개인화

```sh
git switch -c personalize/my-portfolio samdickie-clone-baseline-2026-10-16
```

기준 태그를 유지하고 새 브랜치에서 개인화합니다. 원본 이름·연락처·저자·사진·외부 계정은 비교용 기준 버전에 보존했습니다. 원본 주석에 언급된 비공개 빌드 생성기와 Worker 소스는 배포물에 없으므로, 현재 저장소의 HTML/JS 데이터를 직접 편집합니다.

현재 `audit`는 원본 보존용 해시 검사입니다. 개인화 브랜치에서는 변경한 자산의 출처/해시를 새 명세로 관리하고 원본 보존 검사를 기준 태그에 한정하도록 CI를 조정해야 합니다.
