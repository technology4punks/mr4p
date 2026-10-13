"""Fetch selected CC0 Poly Haven 1k assets, verifying source checksums."""
import urllib.request, json, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'observatory'
DEST.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'NEO-Future-Observatory/1.0'}
records = []
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=40) as response:
        return response.read()
def download(asset, metadata, relative):
    path = DEST / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes() if path.exists() else fetch(metadata['url'])
    if hashlib.md5(data).hexdigest() != metadata['md5']:
        raise ValueError('Source checksum mismatch: ' + relative)
    path.write_bytes(data)
    records.append({'asset': asset, 'file': relative, 'source': metadata['url'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'license': 'CC0-1.0'})
    print(relative, len(data))
for asset in ['wood_floor_deck', 'concrete_floor_02']:
    files = json.loads(fetch('https://api.polyhaven.com/files/' + asset))
    for kind, output in [('Diffuse', 'diff'), ('nor_gl', 'normal'), ('Rough', 'rough')]:
        download(asset, files[kind]['1k']['jpg'], asset + '/' + output + '.jpg')
asset = 'modern_coffee_table_01'
files = json.loads(fetch('https://api.polyhaven.com/files/' + asset))['gltf']['1k']['gltf']
download(asset, files, asset + '/table.gltf')
for name, metadata in files['include'].items():
    if '..' in Path(name).parts or Path(name).is_absolute(): raise ValueError('Invalid source path')
    download(asset, metadata, asset + '/' + name)
asset = 'venice_sunset'
files = json.loads(fetch('https://api.polyhaven.com/files/' + asset))
download(asset, files['hdri']['1k']['hdr'], 'venice_sunset_1k.hdr')
(DEST / 'assets-manifest.json').write_text(json.dumps({'license_url': 'https://polyhaven.com/license', 'files': records}, indent=2) + '\n')
