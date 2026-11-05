import { PageTabs } from '../shell/PageTabs'
export type SignalTab = 'sources' | 'live_stream' | 'insights' | 'patterns'
export function SignalSubNav({ activeTab }: { activeTab: SignalTab }) {
 return <PageTabs label="Website views" active={activeTab} items={[{"id":"sources","label":"Websites","href":"/app/signal?tab=sources"},{"id":"live_stream","label":"Measurements","href":"/app/signal?tab=live_stream"},{"id":"insights","label":"Saved findings","href":"/app/signal?tab=insights"},{"id":"patterns","label":"Trends availability","href":"/app/signal?tab=patterns"}]} />
}
