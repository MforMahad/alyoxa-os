'use client';

import React, { useState } from 'react';
import { ExecutionNode } from '@/data/os/forge';
import { ExecutionNodeRow } from './ExecutionNodeRow';
import { ExecutionNodeInspector } from './ExecutionNodeInspector';

interface ForgeNodesWorkspaceProps {
  nodes: ExecutionNode[];
}

export const ForgeNodesWorkspace: React.FC<ForgeNodesWorkspaceProps> = ({
  nodes,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    nodes[0]?.id || ''
  );

  const selectedNode =
    nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[600px] border border-[var(--border)] bg-[var(--background)]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]/40 font-mono text-[10px] text-[var(--muted)] uppercase tracking-wider select-none">
          <div className="w-36 shrink-0">NODE_ID</div>
          <div className="w-48 shrink-0">NAME</div>
          <div className="w-28 shrink-0">TYPE</div>
          <div className="w-24 shrink-0 text-center">STATUS</div>
          <div className="flex-1 min-w-0">CAPABILITIES</div>
        </div>

        <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
          {nodes.length > 0 ? (
            nodes.map((node) => (
              <ExecutionNodeRow
                key={node.id}
                node={node}
                isSelected={node.id === selectedNode?.id}
                onSelect={() => setSelectedNodeId(node.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center font-mono text-xs text-[var(--muted)]">
              NO EXECUTION NODES REGISTERED
            </div>
          )}
        </div>
      </div>

      {selectedNode && <ExecutionNodeInspector node={selectedNode} />}
    </div>
  );
};