# 검토용 URL과 Sites 호스팅

프로젝트 주소: <https://itsme-clone-preview.rhkd3539.chatgpt.site>

이 프로젝트는 **소유자 비공개**로 등록했습니다. 브라우저에서 이 ChatGPT 계정으로 로그인해 접속합니다. 게시 전에는 주소만으로 동작 여부를 판단할 수 없으며, 실제 게시 결과는 Sites 배포 상태로 확인합니다.

원본 기준 태그 `samdickie-clone-baseline-2026-10-16`은 변경하지 않았습니다. 호스팅 어댑터는 `preview/sites-hosting` 브랜치에 추가했습니다.

## 배포 구조

- `.openai/hosting.json`: 정확한 Sites 프로젝트 ID와 `DB` D1 바인딩.
- `public/`: 원본 보존본. 계속 SHA-256 검사 가능.
- `tools/prepare-sites.mjs`: 기존 클론 빌드 변환을 적용한 정적 파일과 서버용 책 목록/원본 평점 스냅샷 생성.
- `vite.config.ts`: 제공된 Vinext/Cloudflare 및 Sites 패키징 통합 사용.
- `hosting/worker.ts`: 기존 HTML/CSS/JS 자산 서빙 및 API 라우팅. 원본 화면에 React hydration을 추가하지 않음.
- `hosting/api.mjs`: 평점과 구독 수집 API를 파일 저장 대신 D1에 저장. 동일 독자 재평점 교체, 집계 스냅샷 합산, 이메일 중복 정리/요청 제한.
- `db/schema.ts`, `drizzle/`: 생성·검토한 스키마 마이그레이션. Sites가 게시 시 호스팅 DB에 적용.
- `app/`: 프레임워크 빌드용 최소 골격. 방문자에게 보이는 페이지는 보존한 HTML 자산.

Node 서버의 `.data/store.json`과 호스팅 D1은 별개입니다. 구독은 어느 쪽도 이메일을 발송하지 않으며 수동 가져오기 대기열에 저장합니다. 이 비공개 검토 사이트의 데이터는 다른 방문자에게 공개되는 사이트를 운영하는 용도로 설계하지 않았습니다.

## 로컬 호스팅 검증

```sh
npm ci
npm run build:sites
node_modules/.bin/wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sour_gideon.sql
npm run start:sites
```

초기 로컬 DB에서만 마이그레이션 파일을 적용합니다. 이미 적용한 파일을 다시 실행하지 않습니다.

로컬 Worker에서 현재 42페이지의 HTML이 기존 Node 클론과 모두 동일함을 확인했습니다. 실제 로컬 D1의 평점 저장/재조회와 이메일 저장, PC 1440×1000·모바일 390×844의 렌더링/검색도 확인했습니다. 서버 테스트는 기존 7개와 호스팅 D1 계약 3개, 총 10개가 통과했습니다.

## 게시 경로와 환경 제약

Vercel 연결은 계정 조회에서 `User not found`가 반환돼 사용할 수 없었습니다. Sites는 정상 동작하므로 사용자 요청 범위에서 새 비공개 검토 프로젝트를 만들었습니다.

이 클라우드에는 Sites 문서의 표준 source workflow helper가 설치돼 있지 않았습니다. 제공된 템플릿의 `sites()` 패키징 통합을 유지해 빌드하고, 네이티브 API가 발급한 단기 소스 자격증명을 숨긴 stdin으로만 받아 정확한 소스 커밋을 푸시하는 대체 도구를 추가했습니다. 자격증명은 디스크/Git 설정/명령 인자/로그에 저장하지 않습니다.

게시 아카이브는 해당 커밋에서 생성한 `dist/`이며 `.openai/hosting.json`, Worker, 정적 자산, Drizzle 마이그레이션을 포함합니다. 저장·배포에는 네이티브 Sites API를 사용합니다. 사이트 접근 범위는 소유자 비공개 상태로 유지합니다.
