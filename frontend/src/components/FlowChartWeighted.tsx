import React from 'react';

interface Node { id: string; type: 'policy'|'rule'|'pool'|'target'; label: string }
interface Edge { source: string; target: string; count: number; decision?: string }

interface Props {
  nodes: Node[];
  edges: Edge[];
  nodeCounts?: Record<string, number>;
  width?: number;
  height?: number;
  onNodeClick?: (node: Node) => void;
}

type PNode = Node & { x: number; y: number };

export function FlowChartWeighted({ nodes, edges, nodeCounts = {}, width = 1200, height = 400, onNodeClick }: Props) {
  // Arrange columns by node type from left to right
  const columns: Record<string, PNode[]> = { policy: [], rule: [], pool: [], target: [] };
  const byId: Record<string, PNode> = {} as any;
  for (const n of nodes) {
    const col = columns[n.type] || (columns[n.type] = []);
    col.push({ ...n, x: 0, y: 0 });
  }
  const order: Array<Node['type']> = ['policy','rule','pool','target'];
  const colWidth = Math.max(220, Math.floor(width / order.length) - 40);
  const hGap = Math.floor((width - colWidth * order.length) / (order.length + 1));

  // Helper to pack a column vertically with even spacing
  const packColumn = (items: PNode[], colIndex: number) => {
    const n = items.length || 1;
    const vGap = Math.max(28, Math.floor((height - 30) / (n + 1)));
    let y = vGap;
    const x = hGap + colIndex * (colWidth + hGap);
    items.sort((a,b) => (nodeCounts[b.id]||0) - (nodeCounts[a.id]||0));
    for (const it of items) {
      it.x = x; it.y = y; y += vGap;
      byId[it.id] = it;
    }
  };
  order.forEach((t, i) => packColumn(columns[t] || [], i));

  // Edge thickness scale
  const maxCount = edges.reduce((m, e) => Math.max(m, e.count), 1);
  const strokeW = (c: number) => 1 + 6 * (c / maxCount);

  return (
    <svg width={width} height={height} className="bg-transparent">
      {/* edges */}
      {edges.map((e, i) => {
        const s = byId[e.source];
        const t = byId[e.target];
        if (!s || !t) return null;
        const x1 = s.x + colWidth;
        const y1 = s.y + 12;
        const x2 = t.x;
        const y2 = t.y + 12;
        const mx = x1 + (x2 - x1) / 2;
        const color = edgeColor(e.decision);
        return (
          <path key={i}
            d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
            stroke={color} strokeOpacity={0.6}
            strokeWidth={strokeW(e.count)} fill="none" />
        );
      })}
      {/* nodes */}
      {Object.values(byId).map((n) => {
        const count = nodeCounts[n.id] || 0;
        const max = Math.max(1, ...Object.values(nodeCounts));
        const bar = Math.max(2, Math.round((count / max) * (colWidth - 16)));
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`} style={{ cursor: onNodeClick ? 'pointer' : 'default' }} onClick={() => onNodeClick?.(n)}>
            <rect width={colWidth} height={24} rx={6} ry={6} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
            {/* volume bar */}
            <rect x={8} y={18} width={bar} height={3} rx={2} ry={2} fill="#60a5fa" opacity={0.6} />
            <text x={8} y={12} fontSize={11} fill="#e5e7eb">{truncate(n.label, Math.floor((colWidth-40)/7))}</text>
            {typeof nodeCounts[n.id] === 'number' && (
              <text x={colWidth - 8} y={12} fontSize={10} textAnchor="end" fill="#93c5fd">{count}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function edgeColor(decision?: string): string {
  const d = (decision || '').toUpperCase();
  if (d === 'BLOCK') return '#ef4444';
  if (d === 'REQUIRE_OVERRIDE') return '#f59e0b';
  if (d === 'ROUTE' || d === 'WARN_ROUTE') return '#38bdf8';
  if (d === 'ALLOW') return '#10b981';
  return '#7dd3fc';
}
