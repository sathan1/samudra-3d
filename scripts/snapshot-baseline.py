from pathlib import Path
from datetime import datetime
import hashlib, json

import sys

root = Path(__file__).resolve().parents[1]
phase = sys.argv[1] if len(sys.argv) > 1 else 'phase-03'
ev = root / f'docs/evidence/{phase}'
ev.mkdir(parents=True, exist_ok=True)
exclude = {'node_modules', '.npm-cache', 'dist', 'test-results', 'playwright-report', '__pycache__', '.pytest_cache'}
paths = [root / 'README.md', root / '.gitignore']
for folder in ['frontend', 'backend', 'scripts', 'docs']:
    target_folder = root / folder
    if target_folder.exists():
        paths.extend(p for p in target_folder.rglob('*') if p.is_file() and not exclude.intersection(p.relative_to(root).parts) and 'evidence' not in p.relative_to(root).parts and not p.name.endswith('.nc'))
manifest = {
    'timestamp': datetime.now().astimezone().isoformat(),
    'workspace': str(root),
    'phase': phase,
    'git': 'No repository at entry; no commit created',
    'exclusions': sorted(exclude | {'docs/evidence (separately retained)', 'large binary datasets (*.nc recorded separately in report)'}),
    'files': [{'file': p.relative_to(root).as_posix(), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(set(paths))]
}
target = ev / 'implementation-manifest.json'
if target.exists():
    target = ev / f"implementation-manifest-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
target.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
reopened=json.loads(target.read_text())
for item in reopened['files']:
    assert hashlib.sha256((root/item['file']).read_bytes()).hexdigest()==item['sha256']
print(json.dumps({'manifest':str(target),'files':len(manifest['files']),'allHashesVerified':True,'result':'PASS'},indent=2))
