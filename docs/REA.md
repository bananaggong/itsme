# samdickie.me REA — 2026-10-16

REA를 원본 조사(Research)·구조/상태 추출(Extract)·행동 분석(Analyze)의 역분석으로 적용했습니다. 근거는 공개 HTTP 응답, DOM, CSS, 배포 JavaScript, 원본의 Chromium 렌더링과 사용자 조작입니다.

## 접근 및 범위

홈페이지는 웹 조회와 직접 HTTPS GET에서 HTTP 200, Chromium에서도 정상 렌더링을 확인했습니다. 사이트맵의 정확한 페이지 수는 **42개**입니다. 초기 수동 집계 40개를 정정했습니다. 사이트맵의 마지막 변경 표기는 2026-10-02입니다.

| 범위 | 경로/개수 |
| --- | --- |
| 독립 화면 | `/`, `/about/`, `/books/`, `/newsletter/`, `/vr/` |
| 글 | `/writing/` 및 상세 29개 |
| 프로젝트 | `/projects/`, `/projects/archive/`, Beta Directory/Betatesta/Fiilo/NoCode/Old site 상세 5개 |
| 오류 | 원본 `/404.html`, 알 수 없는 URL에서 HTTP 404 |
| 리디렉션 | `/downloads/` → 원본과 동일한 HTTP 302로 Gumroad |
| 옛 사이트 내부 | `/projects/old-site/?page=…`, 48개 상태 경로 |

전체 경로·제목·컨트롤·이미지·스크립트·외부 링크는 `reference/routes.json`에 있습니다. 700건의 성공 응답과 외부 리디렉션 1건을 기록했습니다. 버전 쿼리와 아카이브 쿼리 때문에 응답 건수와 고유 파일 수는 다릅니다.

## 구현 구조

원본은 정적 HTML/CSS와 ES 모듈입니다. 프레임워크 변환으로 동작이 달라지는 것을 피하고 배포 파일을 그대로 보존했습니다.

- 공통: `styles.css`, `theme.js`, `look.js`, `spotlight.js`, `nav-badge.js`, `sound.js`, `utils.js`, `search.json`.
- 홈: `home.css`, `freeform.css`, `memoji.css`, `glass.css`, 위젯별 JS.
- 페이지: `about.*`, `books.*`, `writing.*`, `projects.css`, `newsletter-page.*`, `old-site.*`, `vr.*`.
- 자산: 로컬 Inter 폰트, 인물/아이콘/표지/사진/지도/글/프로젝트 이미지, MP3, vCard.
- 아카이브: 48개 썸네일, **117개 이미지 조각**, 링크 좌표·목적지가 포함된 `assets/old-site/pages.json`.
- 독립 Node 서버: `tools/site.mjs`, 정적 빌드: `tools/build.mjs`.

원본 파일 SHA-256을 `reference/manifest.json`에 저장했습니다. 뷰어 HTML 응답 한 건의 해시가 동시 캡처 중 달라 재요청한 기록은 이전/재검증 해시와 함께 남겼습니다.

## 디자인 체계

| 항목 | 원본 규칙 |
| --- | --- |
| 배경/타일 | light `#ffffff`/`#f7f7f9`, dark `#0e0e10`/`#1a1a1d` |
| 텍스트 | light `#111111`, dark `#f2f2f4`, 본문 `#4a4a52`/`#c6c6ce` |
| 폰트 | 로컬 Inter 가변 폰트. 일부 앱 UI는 Apple 시스템 폰트 우선 |
| 본문 | 기본 16px, 줄 높이 1.5 |
| 페이지 | 최대 1400px, 위 110px/좌우 16px/아래 40px |
| 그리드 | 4열, 간격 16px, 행 `clamp(260px,23vw,330px)`, dense |
| 타일 | 모서리 32px, 내부 여백 32px |
| 내비게이션 | 상단 24px 고정 중앙 pill, 활성 링크, Newsletter 읽지 않음 점 |
| 반응형 | 1180px 이하 2열, 640px 이하 1열. 모바일 모서리 24px, 테마 버튼을 nav 안으로 이동·검색 아이콘 노출 |
| 접근성 | reduced motion, 키보드 포커스, dialog, aria 상태/라이브 알림 |

원본의 모든 세부 CSS 미디어/컨테이너 쿼리를 보존했습니다. 토큰 근거는 `reference/design-tokens.txt`와 CSS입니다. 페이지별 PC 1440×1000, 모바일 390×844를 비교합니다.

## 홈 행동 명세

| 표면 | 입력 → 상태/결과 | 저장/의존성 |
| --- | --- | --- |
| 소개 | 링크 → 페이지/외부 목적지 | 원본 문구 |
| Siri | 클릭 → 발광·입력·처리 연출 → Memoji, 다시 클릭 → 픽셀 초상화 | `sam-look`, 준비된 이미지이며 AI API 아님 |
| Office hours | 슬롯/타일 → 다음 평일 3개 → 요청 표시 → mailto | 방문자 날짜, 실제 확정은 이메일 |
| 앱 전환기 | 5개 앱 클릭/자동 순환 → 활성 탭·라벨·카드 변경 | Notion/Dia/Gumroad/Substack/Podcasts |
| Mail | 최신 글 도착 연출, 글/구독 링크 | 원본 사이드바는 시각적 표현, 메일함 전환 앱 아님 |
| Freeform | 노트/텍스트/5종 도형/사진 추가, 편집/색/선택/이동/크기/삭제/그리기/지우기/팬/줌/확대/undo/redo/reset | `ff-home-board-v5`, 로컬 사진 축소·data URL, 브라우저 저장 |
| Photo Booth | 열기 → 권한/실패 상태 → Normal/Thermal/X-Ray/Pop Art → 카운트다운·촬영 → 다운로드 → 닫기/스트림 종료 | HTTPS/localhost, 카메라, 업로드 없음 |
| Photos | 4.5초 순환/다음 클릭 → 7개 사진, ⓘ 메타데이터/ESC 닫기 | 상세 열림 중 자동 진행 중지 |
| Spotify | 5개 행 → 제목/표지/곡 수/색/재생 링크 변경 | Spotify에서 재생, 내장 음원 없음 |
| Find My | 지도 위 핀이 45초 경로 순환, 화면 밖에서 중지 | SVG 지도·JSON 경로, N/+/-는 원본의 장식 |
| 연락처 | mail/LinkedIn/X/vCard 링크, 이메일 복사·성공 표시 | 시스템 메일/클립보드/외부 링크 |
| Books/검색 타일 | 클릭 → 책 페이지/Spotlight | 내부 동작 |
| News | 제작 과정 예고 | 원본부터 Coming soon |
| Edit layout | 편집 → 드래그/모바일 길게 누르기/방향키 → Done/Reset | `tile-order`, 브라우저별 |
| iMessage | 첫 스크롤 10초 뒤 또는 검색 hello → 알림 → hover/포커스/터치 Reply → Send/닫기/ESC/스와이프 | 8초 자동 숨김, 원본부터 답장 저장·전송 없음 |

## 공통 Spotlight

⌘K/Ctrl+K, 입력 중이 아닐 때 `/`, 모바일 검색 아이콘, 홈 검색 타일로 열립니다. 검색 인덱스 지연 로딩, 오타 근접 검색, 그룹 정렬, 방향키, Enter, 수정키 새 탭, ESC 입력 지우기/닫기를 제공합니다.

- 액션: 테마, Memoji, 카메라, Office hours, 메일, 이메일 복사, Liquid Glass.
- 계산기: 사칙연산/괄호/지수/퍼센트, `eval()` 없는 파서.
- 이스터 에그: webflow, seafoam/66ffcc, revenue/£0, tokens, hello, dial-up, hire, sudo.
- 홈 전용 액션은 다른 페이지에서 홈으로 이동한 뒤 실행.
- 검색 불가 시 원본의 Google 외부 검색 링크 유지.

## 페이지별 동작

| 페이지 | 상태/동작 |
| --- | --- |
| About | Apple Notes 창, 폴더/목록/본문, 항목 이동/스크롤 추적, PC 사이드바 접기, 임시 노트 제목·본문 편집과 원문 복귀 |
| Writing | All 포함 7개 필터, 29개 글, 추천/연도별 목록. 글 이미지·본문·이전/다음·복사 링크 |
| Projects | 현재/과거 프로젝트 및 상세 페이지, 원본 외부 링크 |
| Newsletter | Messages 대화·타이핑·3종 질문/답변·형식 검사·수집 POST·성공/실패·과거 이슈 |
| Books | 42개 표지, All+5개 주제, 상세 dialog/요약/저자/Sam 평점/구매/독자 평점, 해시 딥링크 |
| Old site | Safari 창, 48개 페이지, 폴더/사이드바/전체 보기, 스크린샷 링크 히트박스/내부 앵커, 뒤로/앞으로, 쿼리 주소, Wayback 외부 링크, 모바일 오버레이 |
| VR | 독립 레트로 디자인, 실제 MP3 시작/정지, 원본 이미지/폰트/링크 |
| 404 | 원본 오류 화면/소리/홈 복귀 |

옛 사이트는 원본부터 이미지 위에 링크를 올린 뷰어입니다. 실시간 옛 Webflow 사이트로 임의 재구현하지 않았습니다.

## 개인화 위치

기준 태그에서 새 브랜치를 만든 뒤 편집합니다.

| 내용 | 파일 |
| --- | --- |
| 소개/연락처/위젯 | `public/index.html`, 페이지 HTML, contact/officehours/spotlight JS, vCard |
| 경력 보드 | `public/freeform-board.js`, 변경 시 SAVE_KEY 버전 변경 |
| 사진/인물/책/프로젝트 | `public/assets/`와 HTML 참조 |
| 글/프로젝트/구독 소개 | 각 경로 `index.html` |
| 검색 | `public/search.json` |
| 책 목록/상세 | `public/books/index.html`의 `bk-data` 및 표지 마크업. 서버도 이 목록으로 유효 책 판별 |
| 공유/검색 메타 | sitemap, canonical, JSON-LD, og 태그, favicon/webclip |

원본 주석의 생성기·템플릿·Worker 경로는 원본 프로젝트 설명입니다. 해당 비공개 파일들이 현재 저장소에 있다고 의미하지 않습니다.
