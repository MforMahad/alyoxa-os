import { PageTabs } from '../shell/PageTabs'
export type ForgeTab = 'tasks' | 'nodes' | 'records'
export function ForgeSubNav({ activeTab }: { activeTab: ForgeTab }) {
 return <PageTabs label="Task views" active={activeTab} items={[{"id":"tasks","label":"Work items","href":"/app/forge?tab=tasks"},{"id":"nodes","label":"Processing steps","href":"/app/forge?tab=nodes"},{"id":"records","label":"Work history","href":"/app/forge?tab=records"}]} />
}
