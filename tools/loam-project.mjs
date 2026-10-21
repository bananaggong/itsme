export function loamCard(asset) {
  return `<a class="pj-story pj-story--loam" id="loam" href="/projects/loam/" aria-label="LOAM 프로젝트 자세히 보기" lang="ko">
    <div class="pj-story-clip">
      <div class="pj-story-text">
        <p class="pj-eyebrow" lang="en">MVP project</p>
        <h2 class="pj-story-title"><span>이 아이디어,</span><span>근거는 충분할까?</span></h2>
      </div>
      <div class="loam-story-media"><img src="${asset('/personal/projects/loam-card.jpg')}" alt="예시 프로젝트 마감한입의 가설 카드와 인터뷰에서 추출한 신호" width="900" height="640" loading="lazy" decoding="async"></div>
      <div class="pj-strip">
        <span class="pj-icon loam-story-icon" aria-hidden="true"><img src="${asset('/personal/projects/loam-icon.png')}" alt="" width="256" height="256"></span>
        <span class="pj-strip-text"><strong>LOAM</strong><span>가설에서 근거 있는 판단까지</span></span>
        <span class="pj-get">자세히 보기</span>
      </div>
    </div>
  </a>`;
}
