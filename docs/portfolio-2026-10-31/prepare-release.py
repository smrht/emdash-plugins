"""Preserve the verified runtime bytes; add current README/licenses and the owned icon."""
import gzip,hashlib,io,json,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def prepare(slug):
 folder=ROOT/'packages'/slug;bundle=folder/'dist'/f'{slug}-0.1.0.tar.gz'
 with tarfile.open(bundle,'r:gz') as tar:
  files={member.name:tar.extractfile(member).read() for member in tar.getmembers() if member.isfile()}
 assert 'backend.js' in files and 'manifest.json' in files
 assert files['backend.js']==(folder/'dist/plugin.mjs').read_bytes()
 files['README.md']=(folder/'README.md').read_bytes();files['icon.png']=(folder/'images/icon.png').read_bytes()
 assert len(files)<=20 and all(len(v)<=128*1024 for v in files.values()) and sum(map(len,files.values()))<=256*1024
 raw=io.BytesIO()
 with tarfile.open(fileobj=raw,mode='w') as tar:
  for name,data in files.items():
   assert '/' not in name and name not in ['.','..']
   entry=tarfile.TarInfo(name);entry.size=len(data);entry.mode=0o644;entry.mtime=0;tar.addfile(entry,io.BytesIO(data))
 out=io.BytesIO()
 with gzip.GzipFile(fileobj=out,mode='wb',mtime=0) as gz:gz.write(raw.getvalue())
 bundle.write_bytes(out.getvalue())
 return {'slug':slug,'bundle_sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'runtime_sha256':hashlib.sha256(files['backend.js']).hexdigest(),'file_count':len(files),'decoded_bytes':sum(map(len,files.values()))}
if __name__=='__main__':
 import sys
 print(json.dumps(prepare(sys.argv[1]),indent=2))
