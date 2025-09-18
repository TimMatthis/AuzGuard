import React from 'react';
import { Rule } from '../types';
import { MonacoEditor } from './MonacoEditor';

interface RuleConditionTabProps {
  rule: Rule;
  onChange: (rule: Rule) => void;
  isEditing: boolean;
}

export function RuleConditionTab({ rule, onChange, isEditing }: RuleConditionTabProps) {
  const updateField = (field: keyof Rule, value: any) => {
    onChange({ ...rule, [field]: value });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Rule Condition</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">CEL-like Expression</label>
        <MonacoEditor
          value={rule.condition}
          onChange={(value) => updateField('condition', value)}
          language="javascript"
          theme="vs-dark"
          readOnly={!isEditing}
          height="150px"
          placeholder="e.g., data_class in ['health_record', 'medical_data'] && destination_region != 'AU'"
        />
        <p className="text-xs text-gray-400 mt-1">
          Supports: literals, && || !, == !=, comparisons, in(array, value), has('field')
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Applies To (Optional)</label>
        <div className="bg-gray-700 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Data Classes</label>
            <input
              type="text"
              value={rule.applies_to?.data_class?.join(', ') || ''}
              onChange={(e) => {
                const dataClasses = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                updateField('applies_to', { ...rule.applies_to, data_class: dataClasses });
              }}
              disabled={!isEditing}
              placeholder="health_record, medical_data, personal_information"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Domains</label>
            <input
              type="text"
              value={rule.applies_to?.domains?.join(', ') || ''}
              onChange={(e) => {
                const domains = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                updateField('applies_to', { ...rule.applies_to, domains });
              }}
              disabled={!isEditing}
              placeholder="sandbox, testing, production"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Destinations</label>
            <input
              type="text"
              value={rule.applies_to?.destinations?.join(', ') || ''}
              onChange={(e) => {
                const destinations = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                updateField('applies_to', { ...rule.applies_to, destinations });
              }}
              disabled={!isEditing}
              placeholder="US, EU, AU"
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Audit Log Fields</label>
        <input
          type="text"
          value={rule.audit_log_fields?.join(', ') || ''}
          onChange={(e) => {
            const fields = e.target.value.split(',').map(s => s.trim()).filter(s => s);
            updateField('audit_log_fields', fields);
          }}
          disabled={!isEditing}
          placeholder="org_id, data_class, destination_region, purpose"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <p className="text-xs text-gray-400 mt-1">
          Fields to include in audit logs (comma-separated)
        </p>
      </div>
    </div>
  );
}
