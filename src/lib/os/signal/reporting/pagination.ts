/** Pure, deterministic layout primitives. No database, renderer or website-specific rules. */
export interface SizedBlock { height: number; keepWithNext?: boolean }
export type MeasureText = (text: string) => number
const graphemes = new Intl.Segmenter('und', { granularity: 'grapheme' })
export function wrapReportText(text: string, width: number, measure: MeasureText): string[] {
  if (!(width > 0)) throw new Error('INVALID_REPORT_WIDTH')
  const result: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) { result.push(''); continue }
    let line = ''
    for (const token of paragraph.match(/\s+|\S+/gu) ?? []) {
      if (measure(line + token) <= width) { line += token; continue }
      if (line) { result.push(line); line = '' }
      if (measure(token) <= width) { line = token; continue }
      // Binary-search Unicode grapheme boundaries; never clip an unbroken URL/value.
      const points = Array.from(graphemes.segment(token), item => item.segment); let start = 0
      while (start < points.length) {
        let lo = 1, hi = points.length - start, fit = 0
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2)
          if (measure(points.slice(start, start + mid).join('')) <= width) { fit = mid; lo = mid + 1 } else hi = mid - 1
        }
        if (!fit) throw new Error('REPORT_GLYPH_TOO_WIDE')
        const part = points.slice(start, start + fit).join(''); start += fit
        if (start < points.length) result.push(part); else line = part
      }
    }
    if (line) result.push(line)
  }
  return result.length ? result : ['']
}
export function paginateReportBlocks<T extends SizedBlock>(blocks: T[], capacity: number): T[][] {
  if (!(capacity > 0)) throw new Error('INVALID_REPORT_CAPACITY')
  const units: T[][] = []
  for (let i = 0; i < blocks.length; i++) {
    const unit = [blocks[i]]
    while (unit[unit.length - 1].keepWithNext && i + 1 < blocks.length) unit.push(blocks[++i])
    if (unit.some(b => !(b.height > 0) || !Number.isFinite(b.height))) throw new Error('INVALID_REPORT_BLOCK')
    // A heading chain must not make otherwise splittable content unbreakable.
    if (unit.reduce((n,b) => n + b.height, 0) > capacity) units.push(...unit.map(b => [b]))
    else units.push(unit)
  }
  const pages: T[][][] = []; let page: T[][] = [], used = 0
  const height = (items: T[]) => items.reduce((n,b) => n + b.height,0)
  for (const unit of units) {
    const size = height(unit)
    if (size > capacity) throw new Error('REPORT_BLOCK_TOO_TALL')
    if (page.length && used + size > capacity) { pages.push(page); page = []; used = 0 }
    page.push(unit); used += size
  }
  if (page.length) pages.push(page)
  // Rebalance a tiny final tail without breaking a heading/row unit or changing order.
  if (pages.length > 1) {
    const previous = pages[pages.length - 2], last = pages[pages.length - 1]
    let a = previous.flat().reduce((n,b) => n + b.height,0), b = last.flat().reduce((n,b) => n + b.height,0)
    while (b < capacity * .4 && previous.length > 1) {
      const size = height(previous[previous.length - 1])
      if (b + size > capacity || Math.abs((a-size)-(b+size)) >= Math.abs(a-b)) break
      last.unshift(previous.pop()!); a -= size; b += size
    }
  }
  return pages.map(p => p.flat())
}
