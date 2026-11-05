import { PageTabs } from '../shell/PageTabs'
export type AITab = 'context' | 'decisions' | 'runs'
export function AISubNav({ activeTab }: { activeTab: AITab }) {
 return <PageTabs label="Report views" active={activeTab} items={[{"id":"context","label":"Results","href":"/app/ai?tab=context"},{"id":"decisions","label":"Saved decisions","href":"/app/ai?tab=decisions"},{"id":"runs","label":"Processing history","href":"/app/ai?tab=runs"}]} />
}
