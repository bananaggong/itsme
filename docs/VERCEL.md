# gwangil.xyz 운영 배포

- Vercel 팀: `bananaggongs-projects`, 프로젝트: `itsme`.
- 운영 소스: `deploy/gwangil-xyz`. 개인화 기준은 `30b4de7`입니다.
- 웹사이트는 로그인 없이 접속하는 정적 HTML이고 `/api/ratings`, `/api/subscribe`는 Vercel Functions입니다.
- 빌드는 기존 개인화 변환을 그대로 사용합니다. 전체 Sites/Next 의존성 대신 `deployment/vercel`의 저장 SDK만 설치합니다.
- 기존 Sites 비공개 미리보기와 D1 데이터는 별도로 유지합니다. 데이터를 복제하거나 접근 범위를 변경하지 않습니다.

## 저장 기능

서울(`icn1`)의 전용 **비공개 Vercel Blob**에 `itsme/store.json`을 저장합니다. Vercel이 운영 환경에 연결한 `BLOB_STORE_ID`와 OIDC를 사용하며 브라우저에 자격증명을 전달하지 않습니다. 저장소 초기화는 `deployment/vercel/initialize.mjs`로 최초 1회 수행하고, 기존 데이터가 있으면 보존합니다.

평점은 독자 ID 해시별로 교체하며, 구독은 중복 제거한 `pending-import` 큐입니다. 이메일을 발송하거나 원본 뉴스레터에 가입시키지 않습니다. 평점 집계만 공개 API로 읽을 수 있고, 구독자/원시 저장 파일 조회 API는 없습니다. 조건부 ETag 쓰기와 충돌 재시도로 서버 인스턴스 간 갱신 손실을 방지합니다. 요청 제한에는 주소 원문 대신 해시를 저장합니다.

개인 포트폴리오의 소규모 수집을 위한 단일 JSON 파일 구조입니다. 데이터 크기와 요청량이 크게 증가하면 전용 데이터베이스로 이전합니다. Vercel Blob 사용량은 Vercel 플랜과 별도 사용량 정책을 따릅니다.

## 검증과 배포

```sh
node --test tests/*.test.mjs
npm run audit
npm run build
npx vercel@64.5.0 deploy --prod --skip-domain --scope bananaggongs-projects
# 준비된 운영 빌드를 확인한 후 해당 URL을 promote
npx vercel@64.5.0 promote <deployment-url> --scope bananaggongs-projects
```

DNS는 호스팅케이알을 유지하고 Vercel이 반환한 A/CNAME 값만 설정합니다. DNS와 HTTPS 인증서 상태를 따로 확인해야 합니다. 소개·글·프로젝트·도서 등 기준 버전의 참고 콘텐츠는 아직 개인화가 끝나지 않았습니다.
