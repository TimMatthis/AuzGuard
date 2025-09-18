import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy } from '../types';

interface JSONImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JSONImportModal({ isOpen, onClose }: JSONImportModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const importPolicyMutation = useMutation({
    mutationFn: (policy: Policy) => apiClient.createPolicy(policy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      onClose();
      setJsonText('');
      setValidationError(null);
    },
    onError: (error) => {
      setValidationError(error.message);
    },
  });

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonText(content);
      validateJSON(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.type === 'application/json' || file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileUpload(jsonFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      
      // Basic validation
      if (!parsed.policy_id || !parsed.rules || !Array.isArray(parsed.rules)) {
        setValidationError('Invalid policy format. Must include policy_id and rules array.');
        return false;
      }
      
      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError('Invalid JSON format');
      return false;
    }
  };

  const handleImport = () => {
    if (!validateJSON(jsonText)) return;
    
    try {
      const policy = JSON.parse(jsonText);
      importPolicyMutation.mutate(policy);
    } catch (error) {
      setValidationError('Failed to parse policy');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    validateJSON(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-white">Import Policy JSON</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-900/20' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-300 mb-2">Drag and drop a JSON file here</p>
            <p className="text-gray-400 text-sm mb-4">or</p>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              Choose File
            </label>
          </div>

          {/* JSON Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Policy JSON
            </label>
            <textarea
              value={jsonText}
              onChange={handleTextChange}
              rows={20}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your policy JSON here..."
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-400">❌</span>
                <span className="text-red-400 font-medium">Validation Error</span>
              </div>
              <p className="text-red-300 text-sm mt-1">{validationError}</p>
            </div>
          )}

          {/* Sample JSON */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Sample Policy Format</h3>
            <pre className="text-xs text-gray-400 overflow-x-auto">
{`{
  "policy_id": "My_Policy_v1",
  "version": "v1.0.0",
  "title": "My Custom Policy",
  "jurisdiction": "AU",
  "evaluation_strategy": {
    "order": "ASC_PRIORITY",
    "conflict_resolution": "FIRST_MATCH",
    "default_effect": "BLOCK"
  },
  "rules": [
    {
      "rule_id": "CUSTOM_RULE_1",
      "version": "v1.0.0",
      "title": "Custom Rule",
      "category": "PRIVACY",
      "jurisdiction": "AU",
      "legal_basis": ["Privacy Act 2025"],
      "condition": "personal_information == true",
      "effect": "BLOCK",
      "priority": 1,
      "severity": "HIGH"
    }
  ]
}`}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!jsonText || !!validationError || importPolicyMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {importPolicyMutation.isPending ? 'Importing...' : 'Import Policy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
