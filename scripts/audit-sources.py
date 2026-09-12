from pathlib import Path
import hashlib, json, zipfile, xml.etree.ElementTree as ET
from datetime import datetime
from pypdf import PdfReader
import pypdfium2 as pdfium

root = Path(__file__).resolve().parents[1]
out = root / 'docs/evidence/phase-01'
out.mkdir(parents=True, exist_ok=True)
if (out/'entry-inventory.json').exists():
    inventory=json.loads((out/'entry-inventory.json').read_text())
    files=[root/item['file'] for item in inventory]
    assert all(hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'] for p,item in zip(files,inventory)), 'Entry file changed'
else:
    files = [p for p in root.rglob('*') if p.is_file() and 'docs' not in p.relative_to(root).parts and 'scripts' not in p.relative_to(root).parts]
    inventory = [{'file':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
    (out/'entry-inventory.json').write_text(json.dumps(inventory,indent=2))
source_names = ['SAMUDRA-3D_SIH26067_Master_Handbook.pdf','Problem statement.docx','SIH2026-IDEA-Presentation.pptx']
sources = [v for v in inventory if v['file'] in source_names]
old = json.loads((root/'phase-prompts/SOURCE-MANIFEST.json').read_text())
assert {v['file']:v['sha256'] for v in sources} == {v['file']:v['sha256'] for v in old}
(out/'source-hashes.json').write_text(json.dumps(sources,indent=2))
pdf = root/source_names[0]
reader = PdfReader(pdf)
assert len(reader.pages)==14
(out/'handbook.txt').write_text('\n\n'.join(f'=== PHYSICAL PAGE {i+1} ===\n{p.extract_text()}' for i,p in enumerate(reader.pages)),encoding='utf-8')
render = pdfium.PdfDocument(str(pdf))
for i in range(len(render)):
    render[i].render(scale=1.2).to_pil().save(out/f'handbook-{i+1:02d}.png')
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
for name, prefix in [(source_names[1],'docx'),(source_names[2],'pptx')]:
    with zipfile.ZipFile(root/name) as z:
        paths = [n for n in z.namelist() if n.endswith('.xml') and (n=='word/document.xml' or n.startswith('ppt/slides/slide') or n.startswith('ppt/notesSlides/notesSlide'))]
        texts=[]
        for n in sorted(paths):
            tree=ET.fromstring(z.read(n))
            texts.append(f'=== {n} ===\n'+'\n'.join(e.text or '' for e in tree.iter() if e.tag.endswith('}t')))
        (out/f'{prefix}-text.txt').write_text('\n\n'.join(texts),encoding='utf-8')
        media=[]
        for n in z.namelist():
            if '/media/' in n and not n.endswith('/'):
                target=out/f'{prefix}-{Path(n).name}'
                target.write_bytes(z.read(n)); media.append(n)
        if prefix=='pptx':
            for i in range(1,8):
                slide=ET.fromstring(z.read(f'ppt/slides/slide{i}.xml'))
                rel=ET.fromstring(z.read(f'ppt/slides/_rels/slide{i}.xml.rels'))
                mapping={e.attrib['Id']:e.attrib['Target'] for e in rel}
                pics=[mapping.get(e.attrib.get('{'+ns['r']+'}embed',e.attrib.get('{'+ns['r']+'}link')),str(e.attrib)) for e in slide.findall('.//a:blip',ns)]
                print('Slide',i,'images',pics)
        print(name,'XML parts',len(paths),'media',media)
# Read and fingerprint all pre-existing text, not just planning summaries.
textfiles=[p for p in files if p.suffix in ['.md','.txt','.py','.json']]
(out/'prior-text-inspection.txt').write_text('\n\n'.join(f'=== {p.relative_to(root)} ===\n{p.read_text(encoding="utf-8-sig")}' for p in textfiles),encoding='utf-8')
print(datetime.now().astimezone().isoformat(), 'files',len(files),'read text files',len(textfiles),'PDF pages',len(reader.pages),'source hashes match prior manifest')
