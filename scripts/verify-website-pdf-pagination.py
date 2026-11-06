"""Independent offline PDF audit. Requires local PyMuPDF; never connects to any service."""
import json,re,sys,pathlib
import pymupdf
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'preview-output/pdf-pagination').resolve()
manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
def normalized(value):
    return re.sub(r'\s+','',value).replace('\u00ad','')
results=[]
for case in manifest:
    doc=pymupdf.open(case['file'])
    assert len(doc)==case['pages'],(case['id'],'page count')
    parts=[]; links=set(); bounds=[]
    for i,page in enumerate(doc):
        assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1,(case['id'],i,'not A4')
        words=page.get_text('words')
        outside=[w for w in words if w[0]<-1 or w[1]<-1 or w[2]>page.rect.width+1 or w[3]>page.rect.height+1]
        assert not outside,(case['id'],i+1,'out of bounds',outside)
        assert f'Page {i+1} of {len(doc)}' in page.get_text(),(case['id'],i+1,'page numbering')
        if i:
            parts.append('\n'.join(b[4] for b in page.get_text('blocks') if b[1]>=70 and b[3]<=788))
        links.update(link.get('uri','') for link in page.get_links() if link.get('uri'))
    text=normalized('\n'.join(parts))
    assert normalized('Quick Scan scope:' if case['kind']=='scan' else 'Full Audit scope:') in text,(case['id'],'scope disclaimer missing')
    assert normalized('Full Audit scope:' if case['kind']=='scan' else 'Quick Scan scope:') not in text,(case['id'],'wrong report scope disclaimer')
    missing=[value[:140] for value in case['expected'] if normalized(value) not in text]
    assert not missing,(case['id'],'missing retained content',missing[:10])
    missing_links=set(case['urls'])-links
    assert not missing_links,(case['id'],'missing clickable URLs',list(missing_links)[:3])
    result={k:case[k] for k in ['id','pages','measurements','suggestions']}
    result.update(expected_fields_checked=len(case['expected']),clickable_urls_checked=len(case['urls']),out_of_bounds=0,completeness='PASS')
    results.append(result);print(json.dumps(result))
    # Representative overview, split-record boundary and last-page previews.
    selected=sorted(set([0,1,min(2,len(doc)-1),max(1,len(doc)//2-1),len(doc)//2,max(1,len(doc)-2),len(doc)-1]))
    folder=root/(case['id']+'-pages');folder.mkdir(exist_ok=True)
    sheet=pymupdf.open();tile_w,tile_h=357,505
    overview=sheet.new_page(width=tile_w*2,height=tile_h*((len(selected)+1)//2))
    for k,index in enumerate(selected):
        pix=doc[index].get_pixmap(matrix=pymupdf.Matrix(1.2,1.2),alpha=False)
        pix.save(folder/f'page-{index+1:03}.png')
        overview.insert_image(pymupdf.Rect(k%2*tile_w,k//2*tile_h,(k%2+1)*tile_w,(k//2+1)*tile_h),pixmap=pix)
    overview.get_pixmap().save(folder/'contact.png')
(root/'verification.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print('PASS:',len(results),'PDFs;',sum(r['pages'] for r in results),'pages;',sum(r['measurements'] for r in results),'measurement records verified')
