"""Validate local image assets, responsive dimensions, and generated image metadata.
Requires Pillow. Run after optimize_images.py or any image edits.
"""
from pathlib import Path
import json,re,sys
from urllib.parse import urlsplit,unquote
from PIL import Image
from optimize_images import attrs
ROOT=Path(__file__).resolve().parents[1]
errors=[];checked=0;cache={};known_count=0
allow_known='--allow-known-missing' in sys.argv
known=json.loads((ROOT/'docs/existing-missing-images.json').read_text()) if allow_known else {}
def size(url):
 path=ROOT/unquote(urlsplit(url).path).lstrip('/')
 if not path.is_file():raise ValueError(f'Missing asset {url}')
 if path.suffix.lower()=='.svg':return None
 if path not in cache:
  with Image.open(path) as im:cache[path]=im.size
 return cache[path]
for page in ROOT.rglob('*.html'):
 text=page.read_text()
 for tag in re.findall(r'<img\b[^>]*>',text,re.I):
  a=attrs(tag);src=a.get('src','')
  if not src.startswith('/') or src.startswith('//'):continue
  try:
   dimensions=size(src)
   if '/media/responsive/' in src or '/media/illustrations/' in src:
    assert dimensions==(int(a['width']),int(a['height'])),f'Wrong dimensions {src}'
    assert a.get('alt') is not None,'Missing alt attribute'
    assert a.get('srcset') and a.get('sizes'),'Missing responsive attributes'
    for candidate in a['srcset'].split(','):
     url,width=candidate.strip().split();assert size(url)[0]==int(width[:-1]),f'Wrong width descriptor {url}'
    checked+=1
  except Exception as e:
   entry=known.get(src,{})
   if str(e).startswith('Missing asset ') and entry.get('present_in_upstream_html') and str(page.relative_to(ROOT)) in entry.get('pages',[]):known_count+=1
   else:errors.append(f'{page.relative_to(ROOT)}: {e}')
 for source in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',text,re.S):
  try:json.loads(source)
  except Exception as e:errors.append(f'{page}: invalid JSON-LD: {e}')
for slug in ('closed-guard','open-guard','high-guard','scissor-sweep'):
 text=(ROOT/'terms'/slug/'index.html').read_text()
 for prop in ('og:image','twitter:image'):
  tag=re.search(r'<meta[^>]*(?:property|name)="'+prop+r'"[^>]*>',text).group()
  assert '/media/illustrations/'+slug+'-1536.webp' in attrs(tag)['content'],f'{slug}: incorrect {prop}'
print(f'Checked {checked} responsive image placements and {len(cache)} raster assets.')
if errors:
 print('\n'.join(errors));raise SystemExit(1)
print('Image references, dimensions, descriptors, generated previews, and JSON-LD passed for changes in this branch.')
if known_count:print(f'EXISTING ISSUE: {known_count} missing-image placements remain from the documented upstream baseline.')
