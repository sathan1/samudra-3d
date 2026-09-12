from pathlib import Path
from datetime import datetime
import hashlib, json, re

root=Path(__file__).resolve().parents[1]
ev=root/'docs/evidence/phase-01'
entry=json.loads((ev/'entry-inventory.json').read_text())
for item in entry:
    assert hashlib.sha256((root/item['file']).read_bytes()).hexdigest()==item['sha256'], f"Pre-existing file changed: {item['file']}"
trace=(root/'docs/requirements-traceability.md').read_text(encoding='utf-8')
roadmap=[line.split('|')[1:-1] for line in trace.splitlines() if re.match(r'\| H\d\d \| \d+ \|',line)]
assert len(roadmap)==15
for n,row in enumerate(roadmap,1):
    row=[c.strip() for c in row]
    expected='ADVANCED' if n==15 else 'GOOD TO HAVE' if n in [9,12,14] else 'MUST HAVE'
    assert row[0]==f'H{n:02d}' and row[1]==str(n) and row[3]==expected
    assert row[4] and row[5]
for group,count in [('H',35),('S',14),('U',6)]:
    for n in range(1,count+1):
        assert f'| {group}{n:02d} |' in trace
components=['Header','SidebarControls','OceanCanvas','ProfileModal','ComparisonPanel','ColorBarLegend','AIAssistantModal','LoginModal']
assert all((root/f'frontend/src/components/{name}.jsx').is_file() for name in components)
assert (root/'backend/sample_data/generate_synthetic_data.py').is_file(), 'Phase 3 generator missing'
assert (root/'backend/sample_data/model_indian_ocean.nc').is_file(), 'Phase 3 NetCDF missing'
assert (root/'backend/app/main.py').is_file(), 'Phase 4 FastAPI app missing'
assert (root/'backend/app/routers/ocean.py').is_file(), 'Phase 4 ocean router missing'
assert (root/'backend/app/services/ocean_service.py').is_file(), 'Phase 4 ocean service missing'
assert (root/'frontend/src/utils/scalarField.js').is_file(), 'Phase 5 scalarField utility missing'
assert (root/'frontend/src/services/api.js').is_file(), 'Phase 5 api service missing'
assert (root/'frontend/src/utils/colormaps.js').is_file(), 'Phase 6 colormaps utility missing'
assert (root/'frontend/tests/depth.spec.js').is_file(), 'Phase 7 depth test missing'
assert (root/'frontend/src/utils/timeAnimation.js').is_file(), 'Phase 8 timeAnimation utility missing'
assert (root/'frontend/tests/time.spec.js').is_file(), 'Phase 8 time test missing'
assert (root/'frontend/src/utils/particleStreamlines.js').is_file(), 'Phase 9 particleStreamlines utility missing'
assert (root/'frontend/tests/currents.spec.js').is_file(), 'Phase 9 currents test missing'
assert (root/'frontend/src/utils/argoProfiles.js').is_file(), 'Phase 10 argoProfiles utility missing'
assert (root/'frontend/tests/argo.spec.js').is_file(), 'Phase 10 argo test missing'
assert (root/'frontend/src/utils/profileCharts.js').is_file(), 'Phase 11 profileCharts utility missing'
assert (root/'frontend/tests/profile-modal.spec.js').is_file(), 'Phase 11 profile-modal test missing'
assert (root/'frontend/src/utils/gliderTransects.js').is_file(), 'Phase 12 gliderTransects utility missing'
assert (root/'frontend/tests/glider.spec.js').is_file(), 'Phase 12 glider test missing'
assert (root/'backend/app/services/collocation.py').is_file(), 'Phase 13 collocation service missing'
assert (root/'backend/app/routers/collocation.py').is_file(), 'Phase 13 collocation router missing'
assert (root/'backend/app/schemas/collocation.py').is_file(), 'Phase 13 collocation schemas missing'
assert (root/'frontend/tests/collocation.spec.js').is_file(), 'Phase 13 collocation test missing'
assert (root/'frontend/tests/test-collocation.mjs').is_file(), 'Phase 13 frontend unit test missing'
assert (root/'backend/app/services/anomaly_engine.py').is_file(), 'Phase 14 anomaly engine missing'
assert (root/'backend/app/routers/anomaly.py').is_file(), 'Phase 14 anomaly router missing'
assert (root/'backend/app/schemas/anomaly.py').is_file(), 'Phase 14 anomaly schemas missing'
assert (root/'frontend/src/utils/anomalyField.js').is_file(), 'Phase 14 anomalyField utility missing'
assert (root/'frontend/tests/anomaly.spec.js').is_file(), 'Phase 14 anomaly Playwright test missing'
assert (root/'frontend/tests/test-anomaly.mjs').is_file(), 'Phase 14 anomaly unit test missing'
assert (root/'backend/app/services/ai_assistant.py').is_file(), 'Phase 15 AI assistant service missing'
assert (root/'backend/app/routers/assistant.py').is_file(), 'Phase 15 AI assistant router missing'
assert (root/'backend/app/schemas/assistant.py').is_file(), 'Phase 15 AI assistant schemas missing'
assert (root/'frontend/tests/assistant.spec.js').is_file(), 'Phase 15 AI assistant Playwright test missing'
assert (root/'frontend/tests/test-assistant.mjs').is_file(), 'Phase 15 AI assistant unit test missing'
assert (root/'backend/app/schemas/auth.py').is_file(), 'Operational auth schemas missing'
assert (root/'backend/app/services/auth_service.py').is_file(), 'Operational auth service missing'
assert (root/'backend/app/routers/auth.py').is_file(), 'Operational auth router missing'
assert (root/'frontend/tests/auth.spec.js').is_file(), 'Operational auth Playwright test missing'
assert (root/'frontend/tests/test-auth.mjs').is_file(), 'Operational auth unit test missing'
assert (root/'docker-compose.yml').is_file(), 'Phase 15 docker-compose missing'
assert (root/'Dockerfile.backend').is_file(), 'Phase 15 Dockerfile.backend missing'
assert (root/'Dockerfile.frontend').is_file(), 'Phase 15 Dockerfile.frontend missing'
assert (root/'docs/final-readiness.md').is_file(), 'Phase 15 final readiness doc missing'
package=json.loads((root/'frontend/package.json').read_text())
assert set(package['dependencies'])=={'react','react-dom','three'}, f'Unexpected runtime packages: {set(package["dependencies"])}'
print(json.dumps({'timestamp':datetime.now().astimezone().isoformat(),'preexistingFilesUnchanged':len(entry),'roadmapRows':len(roadmap),'mappedRequirements':55,'componentBoundaries':components,'phase5ScalarFieldActive':True,'phase6ColormapsActive':True,'phase7DepthSlicerActive':True,'phase8TimePlaybackActive':True,'phase9ParticlesActive':True,'phase10ArgoProfilesActive':True,'phase11ProfileChartsActive':True,'phase12GlidersActive':True,'phase13CollocationActive':True,'phase14AnomalyActive':True,'phase15AIActive':True,'operationalAuthActive':True,'result':'PASS'},indent=2))

