# 김광일 로고 · 파비콘

사용자가 첨부한 `gwangil-logo-v1.zip`의 기본 A안(현재 타원)을 사용한다.
`gwangil-master.svg`는 ZIP의 편집 가능한 원본 그대로 보존했다.
`public/personal/brand/logo-mono.svg`와 `logo-reverse.svg`도 각각
`assets/a-mono.svg`, `assets/a-reverse.svg`를 변경 없이 복사했다.
원본 형태·내부 여백·타원 크기는 변경하지 않는다.

## 사이트 적용

- `favicon.svg`: 단색 SVG와 같은 경로. 밝은 환경에서는 `#142035`,
  어두운 환경에서는 `#FFFAEF`로 표시한다. 브라우저의 `prefers-color-scheme`을 따른다.
- `favicon.ico` / `favicon-dark.ico`: 각각 밝은 탭·어두운 탭용. 투명 배경의 16·32·48px PNG를 포함한다.
- `favicon-32.png` / `favicon-dark-32.png`: 배경이 투명한 PNG 대체 아이콘.
- `apple-touch-icon.png`: 180px 홈 화면 아이콘.
- 탭 아이콘은 SVG·PNG·ICO 모두 배경 없이 로고만 표시한다.
- `favicon.js`가 브라우저 색상 모드에 따라 세 가지 형식 모두 짙은색·밝은색 파일로 교체한다.
  SVG 내부 미디어 쿼리를 해석하지 않는 이미지 로더도 같은 로고를 받는다.
  사이트 안에서 저장한 테마와 브라우저 탭의 테마는 별도로 취급한다.
- 홈 화면 아이콘에만 밝은 바탕을 넣고, 탭 파비콘으로는 사용하지 않는다.

`tools/brand.mjs`가 모든 HTML의 기존 파비콘·Apple 아이콘 링크를 교체한다.
아이콘 내용 해시를 URL에 붙여 기존 브라우저 캐시와 구분한다.
캡처 원본의 `/assets/favicon.png`, `/assets/webclip.png`는 보존한다.

## 재생성

원본 SVG를 확인한 뒤 다음을 실행한다. 렌더러는 현재 개발 의존성에 설치된 `sharp`를 사용한다.

```sh
node tools/build-brand-icons.mjs
npm run build
```

정적 배포는 커밋된 SVG·PNG·ICO를 그대로 사용하며, 배포 서버에서는 렌더러를 실행하지 않는다.
파일 출처와 체크섬은 `source.json`에 기록했다.
