import React from 'react';
import { Rule, Category, Jurisdiction, Effect, Severity } from '../types';

interface RuleDefinitionTabProps {
  rule: Rule;
  onChange: (rule: Rule) => void;
  isEditing: boolean;
}

export function RuleDefinitionTab({ rule, onChange, isEditing }: RuleDefinitionTabProps) {
  const updateField = (field: keyof Rule, value: any) => {
    onChange({ ...rule, [field]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Rule Definition</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Rule ID</label>
          <input
            type="text"
            value={rule.rule_id}
            onChange={(e) => updateField('rule_id', e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Version</label>
          <input
            type="text"
            value={rule.version}
            onChange={(e) => updateField('version', e.target.value)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
        <input
          type="text"
          value={rule.title}
          onChange={(e) => updateField('title', e.target.value)}
          disabled={!isEditing}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
        <textarea
          value={rule.description || ''}
          onChange={(e) => updateField('description', e.target.value)}
          disabled={!isEditing}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <select
            value={rule.category}
            onChange={(e) => updateField('category', e.target.value as Category)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="PRIVACY">Privacy</option>
            <option value="HEALTH">Health</option>
            <option value="AI_RISK">AI Risk</option>
            <option value="CDR">CDR</option>
            <option value="ANTI_DISCRIM">Anti-Discrimination</option>
            <option value="TELECOM">Telecom</option>
            <option value="COPYRIGHT">Copyright</option>
            <option value="EXPORT">Export</option>
            <option value="CONSUMER">Consumer</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Jurisdiction</label>
          <select
            value={rule.jurisdiction}
            onChange={(e) => updateField('jurisdiction', e.target.value as Jurisdiction)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="AU">Australia</option>
            <option value="NSW">NSW</option>
            <option value="VIC">VIC</option>
            <option value="ACT">ACT</option>
            <option value="QLD">QLD</option>
            <option value="SA">SA</option>
            <option value="WA">WA</option>
            <option value="TAS">TAS</option>
            <option value="NT">NT</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
          <select
            value={rule.severity}
            onChange={(e) => updateField('severity', e.target.value as Severity)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="INFO">Info</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={rule.priority}
            onChange={(e) => updateField('priority', parseInt(e.target.value))}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Effect</label>
          <select
            value={rule.effect}
            onChange={(e) => updateField('effect', e.target.value as Effect)}
            disabled={!isEditing}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="ALLOW">Allow</option>
            <option value="BLOCK">Block</option>
            <option value="ROUTE">Route</option>
            <option value="REQUIRE_OVERRIDE">Require Override</option>
            <option value="WARN_ROUTE">Warn Route</option>
          </select>
        </div>
      </div>

      {(rule.effect === 'ROUTE' || rule.effect === 'WARN_ROUTE') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Route To</label>
          <input
            type="text"
            value={rule.route_to || ''}
            onChange={(e) => updateField('route_to', e.target.value)}
            disabled={!isEditing}
            placeholder="e.g., onshore_default_pool"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Legal Basis</label>
        <div className="space-y-2">
          {rule.legal_basis.map((basis, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={basis}
                onChange={(e) => {
                  const newBasis = [...rule.legal_basis];
                  newBasis[index] = e.target.value;
                  updateField('legal_basis', newBasis);
                }}
                disabled={!isEditing}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              {isEditing && (
                <button
                  onClick={() => {
                    const newBasis = rule.legal_basis.filter((_, i) => i !== index);
                    updateField('legal_basis', newBasis);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          {isEditing && (
            <button
              onClick={() => updateField('legal_basis', [...rule.legal_basis, ''])}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Legal Basis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
