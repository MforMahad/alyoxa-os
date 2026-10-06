import React from 'react';
import { ExecutionNode } from '@/data/os/forge';

interface ExecutionNodeInspectorProps {
  node: ExecutionNode;
}

export const ExecutionNodeInspector: React.FC<ExecutionNodeInspectorProps> = ({
  node,
}) => {
  return (
    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--border)] bg-[var(--surface)]/20 p-5 font-mono space-y-6 text-xs">
      <div>
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          NODE INSPECTOR
        </div>
        <h3 className="text-base font-bold text-[var(--foreground)]">
          {node.id}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">NODE ID</div>
          <div className="text-[var(--foreground)] font-semibold">{node.id}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">NODE NAME</div>
          <div className="text-[var(--foreground)] font-semibold">{node.name}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">TARGET TYPE</div>
          <div className="text-[var(--foreground)] font-semibold uppercase">{node.type}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">STATUS</div>
          <div className="text-[var(--signal)] font-semibold uppercase">{node.status}</div>
        </div>

        <div>
          <div className="text-[10px] text-[var(--muted)] uppercase">REGISTERED CAPABILITIES</div>
          <div className="space-y-1 mt-1">
            {node.capabilities.map((cap) => (
              <div
                key={cap}
                className="px-2 py-1 bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-[10px]"
              >
                {cap}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 space-y-2">
        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
          EXECUTION CAPABILITY
        </div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          This node represents a Forge execution target. External execution is not connected in this phase.
        </p>
      </div>
    </div>
  );
};