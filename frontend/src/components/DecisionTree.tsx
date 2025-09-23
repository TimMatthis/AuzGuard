import React from 'react';

export interface TreeNode {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClassName?: string;
  children?: TreeNode[];
}

interface DecisionTreeProps {
  nodes: TreeNode[];
  emptyText?: string;
}

export function DecisionTree({ nodes, emptyText = 'No data' }: DecisionTreeProps) {
  if (!nodes || nodes.length === 0) {
    return <div className="text-sm text-gray-400">{emptyText}</div>;
  }

  return (
    <ol className="tree">
      {nodes.map((node) => (
        <TreeItem key={node.id} node={node} />
      ))}
    </ol>
  );
}

function TreeItem({ node }: { node: TreeNode }) {
  const hasChildren = !!(node.children && node.children.length);
  return (
    <li className="tree-item">
      <div className="tree-node">
        <div className="tree-node__content">
          <div>
            <div className="tree-node__title">{node.title}</div>
            {node.subtitle && <div className="tree-node__subtitle">{node.subtitle}</div>}
          </div>
          {node.badge && (
            <span className={`tree-node__badge ${node.badgeClassName || ''}`}>{node.badge}</span>
          )}
        </div>
      </div>
      {hasChildren && (
        <ol>
          {node.children!.map((child) => (
            <TreeItem key={child.id} node={child} />
          ))}
        </ol>
      )}
    </li>
  );
}

