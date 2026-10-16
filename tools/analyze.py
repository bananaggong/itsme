from pathlib import Path
from html.parser import HTMLParser
import json,re
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
class Inventory(HTMLParser):
 def __init__(self):
  super().__init__();self.title='';self.in_title=False;self.controls=[];self.scripts=[];self.external=set();self.images=[]
 def handle_starttag(self,t,attrs):
  d=dict(attrs)
  if t=='title':self.in_title=True
  if t in ('button','input','dialog','summary','video','audio','iframe','form'):
   self.controls.append({'element':t,**{k:v for k,v in d.items() if k in ('class','type','name','aria-label','action','src','data-topic')}})
  if t=='script' and d.get('src'):self.scripts.append(d['src'])
  if t=='img' and d.get('src'):self.images.append(d['src'])
  for k in ('src','href','action'):
   v=d.get(k,'')
   if v.startswith(('https://','http://')) and urlsplit(v).hostname not in ('www.samdickie.me','samdickie.me'):self.external.add(v)
 def handle_endtag(self,t):
  if t=='title':self.in_title=False
 def handle_data(self,s):
  if self.in_title:self.title+=s

routes=[]
for el in ET.parse(PUBLIC/'sitemap.xml').iter():
 if not el.tag.endswith('loc'):continue
 path=urlsplit(el.text).path
 p=Inventory();p.feed((PUBLIC/path.lstrip('/')/'index.html').read_text())
 routes.append({'path':path,'title':p.title,'controls':p.controls,'scripts':p.scripts,'externalLinks':sorted(p.external),'images':p.images})
(ROOT/'reference/routes.json').write_text(json.dumps(routes,ensure_ascii=False,indent=2)+'\n')
css='\n'.join(p.read_text() for p in PUBLIC.glob('*.css'))
breakpoints=sorted({query.strip() for query in re.findall(r'@media[^\{]+',css)})
(ROOT/'reference/design-tokens.txt').write_text((PUBLIC/'styles.css').read_text().split('/* ========================================================== */')[0]+'\n\nAll captured media queries:\n'+'\n'.join(breakpoints)+'\n')
print(f'Inventoried {len(routes)} routes; {sum(len(r["controls"]) for r in routes)} authored controls; {len(breakpoints)} media-query variants.')
