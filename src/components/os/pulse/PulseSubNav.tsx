import { PageTabs } from '../shell/PageTabs'
interface Props { activeTab: string; counts: { requests: number; threads: number; approvals: number; activity: number } }
export function PulseSubNav({ activeTab }: Props) {
 return <PageTabs label="Collaboration views" active={activeTab} items={[{"id":"requests","label":"Requests","href":"/app/pulse?tab=requests"},{"id":"threads","label":"Conversations","href":"/app/pulse?tab=threads"},{"id":"approvals","label":"Approvals","href":"/app/pulse?tab=approvals"},{"id":"activity","label":"Activity","href":"/app/pulse?tab=activity"}]} />
}
