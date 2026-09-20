"""Block publication of generated illustrations lacking current visual approval.
This verifies human/agent review records, not anatomy itself. No API key required.
"""
from pathlib import Path
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(root=ROOT):
 errors=[];manifest=root/'docs/image-qa-publication.json'
 if not manifest.exists():return ['Missing image QA publication manifest']
 data=json.loads(manifest.read_text());records=data.get('records',[]);seen=set()
 for rec in records:
  name=rec['file'];seen.add(name);p=root/name
  if not p.is_file():errors.append(f'Missing reviewed master: {name}');continue
  if digest(p)!=rec['sha256']:errors.append(f'Changed master requires new visual review: {name}')
  for key in ['anatomy_status','technique_status','crop_status']:
   if rec.get(key)!='pass':errors.append(f'{name}: {key} is {rec.get(key)}')
  for item in rec.get('variants',[]):
   v=root/item['file']
   if not v.is_file() or digest(v)!=item['sha256']:errors.append(f'Changed or missing reviewed derivative: {item["file"]}')
  if not rec.get('variants'):errors.append(f'No reviewed derivatives: {name}')
 masters={str(p.relative_to(root)) for p in (root/'media/illustrations').glob('*.png')}
 for name in masters-seen:errors.append(f'Unreviewed generated illustration: {name}')
 variants={v['file'] for rec in records for v in rec.get('variants',[])}
 for p in (root/'media/illustrations').glob('*.webp'):
  if str(p.relative_to(root)) not in variants:errors.append(f'Unreviewed derivative: {p.name}')
 return errors
if __name__=='__main__':
 errors=check()
 if errors:print('\n'.join(errors));sys.exit(1)
 print('All published generated illustrations match anatomy, technique, and crop approval records.')
