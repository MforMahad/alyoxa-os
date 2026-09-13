export interface NavItem {
    label: string;
    href: string;
    badge?: string;
  }
  
  export interface NavigationConfig {
    primary: NavItem[];
    system: NavItem[];
  }
  
  export interface SystemMetrics {
    environment: string;
    mode: string;
    eventRate: string;
    activeRoutings: string;
    nodeHealth: string;
    host: string;
    latency: string;
  }
  
  export interface NodeChannel {
    id: string;
    code: string;
    name: string;
    state: string;
    metric: string;
    subtext: string;
    status: string;
    accentClass: string;
  }
  
  export interface SystemEvent {
    id: string;
    timestamp: string;
    source: string;
    badgeClass: string;
    message: string;
    status: string;
    statusClass?: string;
  }
  
  export const navigationConfig: NavigationConfig = {
    primary: [
      { label: 'Overview', href: '/app' },
      { label: 'Signal', href: '/app/signal', badge: 'LIVE' },
      { label: 'Forge', href: '/app/forge' },
      { label: 'Pulse', href: '/app/pulse' },
      { label: 'Vault', href: '/app/vault' },
    ],
    system: [
      { label: 'AI', href: '/app/ai' },
      { label: 'Automations', href: '/app/automations' },
      { label: 'Settings', href: '/app/settings' },
    ],
  };
  
  export const systemMetricsConfig: SystemMetrics = {
    environment: 'PRODUCTION_CORE',
    mode: 'AUTONOMOUS MODE ACTIVE',
    eventRate: '42/s',
    activeRoutings: '07',
    nodeHealth: '100%',
    host: 'LOCAL_NODE',
    latency: '11ms',
  };
  
  export const nodeChannelsData: NodeChannel[] = [
    {
      id: 'signal',
      code: 'IN.01',
      name: 'SIGNAL',
      state: 'OBSERVING',
      metric: '3 Webhooks Ingested',
      subtext: 'Last event: Stripe charge.succeeded',
      status: 'STATUS: STREAMING_HEALTHY',
      accentClass: 'text-[var(--signal)]',
    },
    {
      id: 'ai-core',
      code: 'SYS.00',
      name: 'AI CORE',
      state: 'REASONING',
      metric: 'Context Inferred',
      subtext: 'No anomalies detected in last cycle',
      status: 'CONFIDENCE: 99.4%',
      accentClass: 'text-[var(--foreground)]',
    },
    {
      id: 'forge-pulse',
      code: 'EX.02',
      name: 'FORGE & PULSE',
      state: 'EXECUTING',
      metric: '2 Actions Queued',
      subtext: 'Outbound webhook ready for dispatch',
      status: 'QUEUE: 0 PENDING APPROVAL',
      accentClass: 'text-[var(--primary)]',
    },
    {
      id: 'vault',
      code: 'MEM.04',
      name: 'VAULT',
      state: 'SYNCHRONIZED',
      metric: 'System Context Loaded',
      subtext: 'Memory index updated 2m ago',
      status: 'INDEX: 1,420 RECORDS',
      accentClass: 'text-[var(--primary-soft)]',
    },
  ];
  
  export const systemEventBusData: SystemEvent[] = [
    {
      id: 'evt-1',
      timestamp: '10:12:04',
      source: '[SIGNAL]',
      badgeClass: 'bg-[var(--signal)]/10 text-[var(--signal)] border-[var(--signal)]/30',
      message: 'Telemetry event payload received from IN.01 endpoint',
      status: 'ACK 200',
    },
    {
      id: 'evt-2',
      timestamp: '10:11:58',
      source: '[AI_CORE]',
      badgeClass: 'bg-[var(--foreground)]/10 text-[var(--foreground)] border-[var(--foreground)]/30',
      message: 'Evaluated intent: Dispatch execution sequence to FORGE',
      status: 'MATCHED',
      statusClass: 'text-[var(--signal)] font-bold',
    },
    {
      id: 'evt-3',
      timestamp: '10:11:42',
      source: '[FORGE]',
      badgeClass: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30',
      message: 'Compiled workflow node #402 without error',
      status: 'EXEC_TIME 12ms',
    },
    {
      id: 'evt-4',
      timestamp: '10:10:15',
      source: '[VAULT]',
      badgeClass: 'bg-[var(--primary-soft)]/10 text-[var(--primary-soft)] border-[var(--primary-soft)]/30',
      message: 'Flushed cache and updated memory state graph',
      status: 'SUCCESS',
    },
  ];