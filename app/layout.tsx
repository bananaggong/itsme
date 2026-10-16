import { createElement, type ReactNode } from 'react';
// Framework build scaffold. Visitor pages are the preserved HTML assets.
export default function Layout({ children }: { children: ReactNode }) {
  return createElement('html', { lang: 'en' }, createElement('body', null, children));
}
