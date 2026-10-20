import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const projects = JSON.parse(readFileSync(new URL('../personalization/projects.json', import.meta.url), 'utf8')).projects;
const hash = createHash('sha256').update(JSON.stringify(projects)).update(readFileSync(new URL(import.meta.url)));
for (const path of ['/personal/projects/widget.css', '/personal/projects/widget.js', ...projects.flatMap(project => [project.icon, project.preview])]) {
  hash.update(readFileSync(new URL('../public'+path, import.meta.url)));
}
export const projectsVersion = hash.digest('hex').slice(0, 12);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const asset = path => `${escape(path)}?v=${projectsVersion}`;
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function personalizeProjectsHTML(html) {
  if (!html.includes('class="tile tile--switcher"')) return html;
  const panels = projects.map((project, index) => {
    const external = /^https?:\/\//.test(project.url);
    const cta = project.cta || '서비스 보기';
    const alt = project.previewAlt || `${project.name}의 실제 공개 홈페이지 화면`;
    return `<div class="sw-panel${index === 0 ? ' is-active' : ''}" data-app="${escape(project.id)}" id="project-panel-${escape(project.id)}"${index === 0 ? '' : ' hidden'}><a class="pj-card" href="${escape(project.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} aria-label="${escape(project.name)} ${escape(cta)}${external ? ' (새 탭)' : ''}"><img class="pj-shot" src="${asset(project.preview)}" alt="${escape(alt)}" width="1440" height="900" loading="lazy" decoding="async"><span class="pj-info"><strong class="pj-name">${escape(project.brand)}</strong><span class="pj-description">${escape(project.description)}</span><span class="pj-visit">${escape(cta)}${arrow}</span><span class="pj-domain">${escape(project.domain)}</span></span></a></div>`;
  }).join('');
  const apps = projects.map((project, index) => `<button class="sw-app${index === 0 ? ' is-active' : ''}" type="button" data-app="${escape(project.id)}" aria-label="${escape(project.name)}" aria-pressed="${index === 0}" aria-controls="project-panel-${escape(project.id)}"><img src="${asset(project.icon)}" alt="" width="58" height="58"></button>`).join('');
  const first = projects[0];
  const widget = `<section class="tile tile--switcher tile--projects" id="project-workbench" aria-label="내가 만든 것들: ${escape(projects.map(project => project.name).join(', '))}"><p class="tile-app sw-label"><img class="tile-app-icon sw-label-icon" src="${asset(first.icon)}" alt=""><span class="sw-label-name">${escape(first.name)}</span></p><div class="sw-cards">${panels}</div><div class="sw-dock" role="group" aria-label="프로젝트 선택">${apps}</div></section>`;
  return html.replace(/<section class="tile tile--switcher"[\s\S]*?<\/section>/, widget)
    .replace(/src="\/switcher\.js[^" ]*"/, `src="/personal/projects/widget.js?v=${projectsVersion}"`)
    .replace('</head>', `<link rel="stylesheet" href="/personal/projects/widget.css?v=${projectsVersion}"></head>`);
}
