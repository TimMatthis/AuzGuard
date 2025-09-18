import React from 'react';
import { Rule } from '../types';

interface RuleObligationsTabProps {
  rule: Rule;
  onChange: (rule: Rule) => void;
  isEditing: boolean;
}

export function RuleObligationsTab({ rule, onChange, isEditing }: RuleObligationsTabProps) {
  const updateField = (field: keyof Rule, value: any) => {
    onChange({ ...rule, [field]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Obligations & Overrides</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Obligations</label>
        <div className="space-y-2">
          {rule.obligations?.map((obligation, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={obligation}
                onChange={(e) => {
                  const newObligations = [...(rule.obligations || [])];
                  newObligations[index] = e.target.value;
                  updateField('obligations', newObligations);
                }}
                disabled={!isEditing}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              {isEditing && (
                <button
                  onClick={() => {
                    const newObligations = rule.obligations?.filter((_, i) => i !== index) || [];
                    updateField('obligations', newObligations);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  🗑️
                </button>
              )}
            </div>
          )) || []}
          {isEditing && (
            <button
              onClick={() => updateField('obligations', [...(rule.obligations || []), ''])}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Obligation
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Evidence Requirements</label>
        <div className="space-y-2">
          {rule.evidence_requirements?.map((requirement, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={requirement}
                onChange={(e) => {
                  const newRequirements = [...(rule.evidence_requirements || [])];
                  newRequirements[index] = e.target.value;
                  updateField('evidence_requirements', newRequirements);
                }}
                disabled={!isEditing}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              {isEditing && (
                <button
                  onClick={() => {
                    const newRequirements = rule.evidence_requirements?.filter((_, i) => i !== index) || [];
                    updateField('evidence_requirements', newRequirements);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  🗑️
                </button>
              )}
            </div>
          )) || []}
          {isEditing && (
            <button
              onClick={() => updateField('evidence_requirements', [...(rule.evidence_requirements || []), ''])}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Evidence Requirement
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-md font-semibold text-white mb-4">Override Configuration</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="override-allowed"
              checked={rule.overrides?.allowed || false}
              onChange={(e) => updateField('overrides', { ...rule.overrides, allowed: e.target.checked })}
              disabled={!isEditing}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
            />
            <label htmlFor="override-allowed" className="text-sm font-medium text-gray-300">
              Allow Overrides
            </label>
          </div>
          
          {rule.overrides?.allowed && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Authorized Roles</label>
                <input
                  type="text"
                  value={rule.overrides?.roles?.join(', ') || ''}
                  onChange={(e) => {
                    const roles = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                    updateField('overrides', { ...rule.overrides, roles });
                  }}
                  disabled={!isEditing}
                  placeholder="General Counsel, Privacy Officer, Compliance Manager"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="require-justification"
                  checked={rule.overrides?.require_justification || false}
                  onChange={(e) => updateField('overrides', { ...rule.overrides, require_justification: e.target.checked })}
                  disabled={!isEditing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label htmlFor="require-justification" className="text-sm font-medium text-gray-300">
                  Require Justification
                </label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
