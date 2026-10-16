#!/usr/bin/env python3
"""Capture public, same-origin resources without following third-party sites.

Only GET requests are made. curl retains the managed environment's proxy/CA.
The manifest records exact bytes, source URLs, hashes, and unavailable resources.
"""
import concurrent.futures
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlsplit, unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
ORIGIN = 'https://www.samdickie.me'
HOSTS = {'samdickie.me', 'www.samdickie.me'}
MANIFEST = ROOT / 'reference' / 'manifest.json'
EXTENSIONS = r'(?:css|js|mjs|json|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp[34]|webm|wav|ogg|pdf|vcf|xml|txt|html|glb|gltf|hdr)'

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if not value:
                continue
            if key in {'href', 'src', 'poster', 'data-src'}:
                self.urls.add(value)
            if key == 'srcset':
                self.urls.update(x.strip().split()[0] for x in value.split(',') if x.strip())

def normalize(value, base):
    if not value or '${' in value or value.startswith(('#', 'data:', 'blob:', 'mailto:', 'tel:', 'javascript:')):
        return None
    parsed = urlsplit(urljoin(base, value))
    if parsed.hostname not in HOSTS or parsed.scheme not in {'http', 'https'}:
        return None
    path = parsed.path or '/'
    # API calls are inventoried separately; never invoke actions while crawling.
    if path.startswith('/api/'):
        return None
    query = '' if path == '/projects/old-site/' else parsed.query
    return ORIGIN + path + ('?' + query if query else '')

def local_path(url):
    path = unquote(urlsplit(url).path).lstrip('/')
    if not path or path.endswith('/'):
        path += 'index.html'
    elif not Path(path).suffix:
        path += '/index.html'
    target = (PUBLIC / path).resolve()
    if not target.is_relative_to(PUBLIC.resolve()):
        raise ValueError('Path escapes public directory')
    return target

def fetch(url):
    target = local_path(url)
    target.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(['curl', '--silent', '--show-error', '--max-time', '45',
                             '--retry', '2', '--retry-delay', '1', '--output', str(target),
                             '--write-out', '%{http_code}\n%{content_type}\n%{url_effective}\n%{redirect_url}', url],
                            capture_output=True, text=True)
    info = result.stdout.splitlines()
    status = int(info[0]) if info and info[0].isdigit() else 0
    record = {'url': url, 'path': str(target.relative_to(ROOT)), 'status': status,
              'contentType': info[1] if len(info)>1 else '', 'effectiveUrl': info[2] if len(info)>2 else url}
    if 300 <= status < 400 and len(info)>3:
        record['redirect'] = info[3]
        target.unlink(missing_ok=True)
        return record, set()
    if result.returncode or status != 200:
        record['error'] = result.stderr.strip() or f'HTTP {status}'
        target.unlink(missing_ok=True)
        return record, set()
    data = target.read_bytes()
    record.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
    found = set()
    if any(x in record['contentType'] for x in ['text/', 'javascript', 'json', 'xml']) or target.suffix in {'.js','.css','.json','.html','.xml','.svg'}:
        text = data.decode('utf-8', errors='replace')
        if 'html' in record['contentType']:
            parser = Links(); parser.feed(text); found |= parser.urls
        found.update(re.findall(r'url\(\s*[\'\"]?([^\s)\'\"]+)', text))
        found.update(re.findall(r'''["'`]([^"'`\s<>]+?\.''' + EXTENSIONS + r'''(?:\?[^"'`\s<>]*)?)["'`]''', text, re.I))
        if target.name == 'sitemap.xml':
            found.update(element.text for element in ET.fromstring(text).iter() if element.tag.endswith('loc'))
    return record, {url for v in found if (url := normalize(v, record['effectiveUrl']))}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--resume', action='store_true', help='Reuse successful captures; default fetches a fresh reference')
    args = parser.parse_args()
    captured_at = datetime.now(timezone.utc).isoformat()
    pending = {ORIGIN+'/', ORIGIN+'/sitemap.xml', ORIGIN+'/robots.txt', ORIGIN+'/404.html'}
    records = json.loads(MANIFEST.read_text())['resources'] if args.resume and MANIFEST.exists() else []
    records = [r for r in records if '${' not in r['url']]
    seen = {r['url'] for r in records if r['status'] == 200}
    # The old-site viewer constructs these filenames at runtime from its manifest.
    old_pages = PUBLIC / 'assets/old-site/pages.json'
    if old_pages.exists():
        for page in json.loads(old_pages.read_text())['pages']:
            pending.add(f"{ORIGIN}/assets/old-site/thumbs/{page['slug']}.webp")
            pending.update(f"{ORIGIN}/assets/old-site/{page['slug']}-{i}.webp" for i in range(len(page['slices'])))
    PUBLIC.mkdir(exist_ok=True)
    while pending:
        batch = sorted(pending - seen)
        if not batch: break
        seen.update(batch)
        pending = set()
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            for record, found in pool.map(fetch, batch):
                records = [r for r in records if r['url'] != record['url']]
                records.append(record); pending |= found
                print(record['status'], record['path'], record.get('bytes', record.get('error')), flush=True)
        MANIFEST.parent.mkdir(exist_ok=True)
        MANIFEST.write_text(json.dumps({'origin':ORIGIN,'capturedAt':captured_at,'resources':sorted(records,key=lambda r:r['path'])},ensure_ascii=False,indent=2)+'\n')
    print(f'Captured {sum(r["status"]==200 for r in records)}/{len(records)} resources')

if __name__ == '__main__': main()
