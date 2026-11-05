import { PageTabs } from '../shell/PageTabs'
export type VaultTab = 'assets' | 'knowledge' | 'search' | 'folders' | 'activity'
interface Props { activeTab: VaultTab; counts: { assets: number; knowledge: number; folders: number } }
export function VaultSubNav({ activeTab }: Props) {
 return <PageTabs label="Library views" active={activeTab} items={[{"id":"assets","label":"Files","href":"/app/vault?tab=assets"},{"id":"knowledge","label":"Saved information","href":"/app/vault?tab=knowledge"},{"id":"search","label":"Search","href":"/app/vault?tab=search"},{"id":"folders","label":"Folders","href":"/app/vault?tab=folders"},{"id":"activity","label":"Activity","href":"/app/vault?tab=activity"}]} />
}
