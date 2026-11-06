import { paginateReportBlocks, wrapReportText } from '../pagination'
const measure=(s:string)=>Array.from(s).length
it('wraps long URLs and Unicode without clipping or adding characters',()=>{
 const value='https://example.org/'+('long-token-'+'\u00e9').repeat(100)
 const lines=wrapReportText(value,31,measure)
 expect(lines.join('')).toBe(value);expect(lines.every(s=>measure(s)<=31)).toBe(true)
})
it('retains whitespace and paragraph content with constrained line widths',()=>{
 const text='Measured value with  repeated   spaces and a veryveryverylongtoken'
 const lines=wrapReportText(text,12,measure);expect(lines.join('')).toBe(text)
 expect(wrapReportText('first\n\nlast',20,measure)).toEqual(['first','','last'])
})
it('packs variable blocks and balances a tiny tail without changing order',()=>{
 const blocks=Array.from({length:21},(_,i)=>({id:i,height:35}))
 const pages=paginateReportBlocks(blocks,350)
 expect(pages.flat()).toEqual(blocks);expect(pages.every(p=>p.reduce((n,b)=>n+b.height,0)<=350)).toBe(true)
 expect(pages.at(-1)!.reduce((n,b)=>n+b.height,0)).toBeGreaterThanOrEqual(350*.35)
})
it('keeps section/table headings with their first row across boundaries',()=>{
 const blocks=[{id:'first',height:80},{id:'head',height:15,keepWithNext:true},{id:'row',height:30}]
 expect(paginateReportBlocks(blocks,100).map(p=>p.map(b=>b.id))).toEqual([['first'],['head','row']])
})
it('rejects invalid/unbounded blocks rather than clipping them',()=>{
 expect(()=>paginateReportBlocks([{height:101}],100)).toThrow('REPORT_BLOCK_TOO_TALL')
 expect(()=>paginateReportBlocks([{height:NaN}],100)).toThrow('INVALID_REPORT_BLOCK')
 expect(()=>wrapReportText('x',0,measure)).toThrow('INVALID_REPORT_WIDTH')
})
it('has no fixed item-count or website-specific pagination thresholds',()=>{
 for(const count of [1,5,12,30,50]){
 const blocks=Array.from({length:count},(_,i)=>({id:i,height:20+(i%7)*11}))
 const pages=paginateReportBlocks(blocks,250);expect(pages.flat()).toEqual(blocks)
 expect(pages.every(p=>p.reduce((n,b)=>n+b.height,0)<=250)).toBe(true)
 }
})

it('keeps decomposed Unicode graphemes intact at line boundaries',()=>{
 const value='e\u0301'.repeat(30),lines=wrapReportText(value,5,measure)
 expect(lines.join('')).toBe(value);expect(lines.every(line=>!line.startsWith('\u0301'))).toBe(true)
})
