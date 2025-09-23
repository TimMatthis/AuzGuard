import React from 'react';

import type { TreeNode } from './DecisionTree';

interface CartChartProps {
  root?: TreeNode;
  width?: number;
  height?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  hGap?: number;
  vGap?: number;
  metrics?: Record<string, { violations?: number }>;
}

type PositionedNode = TreeNode & { x: number; y: number; depth: number; subtreeHeight: number; };

export function CartChart({ root, width = 1000, height = 600, nodeWidth = 280, nodeHeight = 72, hGap = 48, vGap = 44, metrics = {} }: CartChartProps) {
  if (!root) return <div className="text-sm text-gray-400">No data</div>;

  const positioned = layoutHorizontal(root, nodeWidth, nodeHeight, hGap, vGap);
  const svgWidth = Math.max(width, computeDepth(positioned) * (nodeWidth + hGap) + hGap);
  const svgHeight = Math.max(height, Math.ceil(positioned.subtreeHeight));

  const nodes: PositionedNode[] = [];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }[]> = [] as any;

  traverse(positioned, (n) => nodes.push(n), (parent, child) => {
    const path = [
      { x1: parent.x + nodeWidth, y1: parent.y + nodeHeight / 2, x2: parent.x + nodeWidth + hGap / 2, y2: parent.y + nodeHeight / 2 },
      { x1: parent.x + nodeWidth + hGap / 2, y1: parent.y + nodeHeight / 2, x2: child.x - hGap / 2, y2: child.y + nodeHeight / 2 },
      { x1: child.x - hGap / 2, y1: child.y + nodeHeight / 2, x2: child.x, y2: child.y + nodeHeight / 2 }
    ];
    edges.push(path);
  });

  return (
    <svg width={svgWidth} height={svgHeight} className="bg-transparent">
      {/* edges */}
      {edges.map((seg, i) => (
        <g key={i} stroke="#64748b" strokeWidth={1} fill="none" opacity={0.6}>
          {seg.map((s, j) => (
            <line key={j} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          ))}
        </g>
      ))}
      {/* nodes */}
      {nodes.map((n) => {
        const reservedRight = 90; // space for badge on the right
        const titleMax = Math.max(12, Math.floor((nodeWidth - reservedRight - 24) / 7));
        const subtitleMax = Math.max(16, Math.floor((nodeWidth - 24) / 6));
        const titleText = truncate(n.title, titleMax);
        const subtitleText = n.subtitle ? truncate(n.subtitle, subtitleMax) : undefined;
        return (
          <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
            <rect width={nodeWidth} height={nodeHeight} rx={8} ry={8} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
            {/* Title clipped to avoid colliding with badge */}
            <text x={12} y={22} fontSize={12} fill="#e5e7eb">{titleText}</text>
            {subtitleText && (
              <text x={12} y={42} fontSize={10} fill="#94a3b8">{subtitleText}</text>
            )}
          {/* badge */}
          {n.badge && (
            <g>
              <rect x={nodeWidth - 78} y={10} width={66} height={16} rx={4} ry={4} fill={badgeFill(n.badge)} stroke={badgeStroke(n.badge)} />
              <text x={nodeWidth - 45} y={22} fontSize={10} textAnchor="middle" fill={badgeText(n.badge)}>{n.badge}</text>
            </g>
          )}
          {/* metrics: violations */}
          {metrics[n.id]?.violations ? (
            <g>
              <rect x={nodeWidth - 78} y={34} width={66} height={16} rx={4} ry={4} fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.35)" />
              <text x={nodeWidth - 45} y={46} fontSize={10} textAnchor="middle" fill="#fecaca">{`viol: ${metrics[n.id].violations}`}</text>
            </g>
          ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function traverse(
  node: PositionedNode,
  onNode: (n: PositionedNode) => void,
  onEdge: (parent: PositionedNode, child: PositionedNode) => void
) {
  onNode(node);
  const children = (node.children || []) as PositionedNode[];
  for (const child of children) {
    onEdge(node, child);
    traverse(child, onNode, onEdge);
  }
}

function layoutHorizontal(root: TreeNode, nodeWidth: number, nodeHeight: number, hGap: number, vGap: number): PositionedNode {
  const measureHeight = (n: TreeNode): number => {
    if (!n.children || n.children.length === 0) return nodeHeight + vGap;
    return n.children.map(measureHeight).reduce((a, b) => a + b, 0);
  };
  const place = (n: TreeNode, depth: number, top: number): PositionedNode => {
    const height = measureHeight(n);
    const x = depth * (nodeWidth + hGap) + hGap;
    const y = top + (height - (nodeHeight + vGap)) / 2;
    const positioned: PositionedNode = { ...n, x, y, depth, subtreeHeight: height } as PositionedNode;
    if (n.children && n.children.length > 0) {
      let cursor = top;
      positioned.children = n.children.map((c) => {
        const ch = measureHeight(c);
        const placed = place(c, depth + 1, cursor);
        cursor += ch;
        return placed;
      });
    }
    return positioned;
  };
  return place(root, 0, vGap);
}

function computeDepth(n: PositionedNode): number {
  if (!n.children || n.children.length === 0) return n.depth + 1;
  return Math.max(...(n.children as PositionedNode[]).map((c) => computeDepth(c)));
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function badgeFill(badge: string): string {
  const b = badge.toUpperCase();
  if (b.includes('BLOCK')) return 'rgba(239,68,68,0.12)';
  if (b.includes('ALLOW')) return 'rgba(16,185,129,0.12)';
  if (b.includes('ROUTE')) return 'rgba(56,189,248,0.12)';
  if (b.includes('OVERRIDE') || b.includes('WARN')) return 'rgba(245,158,11,0.12)';
  if (b.includes('DISABLED')) return 'rgba(75,85,99,0.25)';
  return 'rgba(148,163,184,0.12)';
}
function badgeStroke(badge: string): string {
  const b = badge.toUpperCase();
  if (b.includes('BLOCK')) return 'rgba(239,68,68,0.35)';
  if (b.includes('ALLOW')) return 'rgba(16,185,129,0.35)';
  if (b.includes('ROUTE')) return 'rgba(56,189,248,0.35)';
  if (b.includes('OVERRIDE') || b.includes('WARN')) return 'rgba(245,158,11,0.35)';
  if (b.includes('DISABLED')) return 'rgba(75,85,99,0.35)';
  return 'rgba(148,163,184,0.35)';
}
function badgeText(badge: string): string {
  const b = badge.toUpperCase();
  if (b.includes('BLOCK')) return '#fecaca';
  if (b.includes('ALLOW')) return '#bbf7d0';
  if (b.includes('ROUTE')) return '#bae6fd';
  if (b.includes('OVERRIDE') || b.includes('WARN')) return '#fde68a';
  if (b.includes('DISABLED')) return '#cbd5e1';
  return '#e5e7eb';
}
