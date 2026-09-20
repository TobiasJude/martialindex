"""Build responsive WebP renditions and update local HTML image references.
Run from anywhere: python scripts/optimize_images.py (requires Pillow).
Original photos are retained with their existing attribution.
"""
from pathlib import Path
from html.parser import HTMLParser
import html, json, re
from PIL import Image, ImageOps
ROOT = Path(__file__).resolve().parents[1]
class Tag(HTMLParser):
 def handle_starttag(self, tag, attrs): self.attrs=dict(attrs)
def attrs(tag):
 p=Tag();p.feed(tag);return p.attrs
def set_attr(tag,key,value):
 encoded=html.escape(str(value),quote=True)
 pattern=rf'\s{re.escape(key)}\s*=\s*(?:"[^"]*"|\x27[^\x27]*\x27|[^\s>]+)'
 if re.search(pattern,tag,re.I):return re.sub(pattern,lambda _:f' {key}="{encoded}"',tag,flags=re.I)
 return tag[:-1]+f' {key}="{encoded}">'
def main():
 pages=list(ROOT.rglob('*.html'));sources=set()
 existing=ROOT/'media/responsive/manifest.json'
 if existing.exists():sources.update(json.loads(existing.read_text()))
 for page in pages:
  for tag in re.findall(r'<img\b[^>]*>',page.read_text(),re.I):
   a=attrs(tag);src=a.get('src','')
   if src.startswith('/') and not src.startswith('//') and '/media/responsive/' not in src and '/media/illustrations/' not in src:sources.add(src)
 manifest={};dest=ROOT/'media/responsive';dest.mkdir(exist_ok=True)
 for src in sorted(sources):
  source=ROOT/src.lstrip('/')
  if source.suffix.lower() not in ('.jpg','.jpeg','.png','.webp') or not source.is_file():continue
  with Image.open(source) as raw:
   im=ImageOps.exif_transpose(raw).convert('RGB');w,h=im.size
   widths=sorted(set(min(w,x) for x in (480,768,1200)))
   versions=[]
   for width in widths:
    height=round(h*width/w);name=src.lstrip('/').replace('/','--').rsplit('.',1)[0]+f'-{width}.webp';target=dest/name
    im.resize((width,height),Image.Resampling.LANCZOS).save(target,'WEBP',quality=82,method=6)
    versions.append({'url':'/media/responsive/'+name,'width':width,'height':height,'bytes':target.stat().st_size})
   manifest[src]={'original_bytes':source.stat().st_size,'versions':versions}
 changed=0;placements=0
 for page in pages:
  original=page.read_text()
  def replace(m):
   nonlocal placements
   tag=m.group();a=attrs(tag);src=a.get('src','')
   if src not in manifest or a.get('srcset'):return tag
   v=manifest[src]['versions'];fallback=v[-1];placements+=1
   for key,value in {'src':fallback['url'],'srcset':', '.join(f"{z['url']} {z['width']}w" for z in v),'sizes':'(max-width: 800px) 100vw, 800px','width':fallback['width'],'height':fallback['height'],'decoding':'async'}.items():tag=set_attr(tag,key,value)
   return tag
  updated=re.sub(r'<img\b[^>]*>',replace,original,flags=re.I)
  if updated!=original:page.write_text(updated);changed+=1
 (dest/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'sources':len(manifest),'pages':changed,'placements':placements,'original_bytes':sum(x['original_bytes'] for x in manifest.values()),'largest_variant_bytes':sum(x['versions'][-1]['bytes'] for x in manifest.values())}))
if __name__=='__main__':main()
