import React from 'react';
import { Rule, Effect } from '../types';

interface RuleTestsTabProps {
  rule: Rule;
  onChange: (rule: Rule) => void;
  isEditing: boolean;
  onTestRule: () => void;
  testResults?: { pass: boolean; results: any[] };
}

export function RuleTestsTab({ 
  rule, 
  onChange, 
  isEditing, 
  onTestRule, 
  testResults 
}: RuleTestsTabProps) {
  const updateField = (field: keyof Rule, value: any) => {
    onChange({ ...rule, [field]: value });
  };

  const addTest = () => {
    const newTest = {
      name: `Test ${(rule.tests?.length || 0) + 1}`,
      request: {},
      expect: 'ALLOW' as Effect
    };
    updateField('tests', [...(rule.tests || []), newTest]);
  };

  const updateTest = (index: number, field: string, value: any) => {
    const newTests = [...(rule.tests || [])];
    newTests[index] = { ...newTests[index], [field]: value };
    updateField('tests', newTests);
  };

  const removeTest = (index: number) => {
    const newTests = rule.tests?.filter((_, i) => i !== index) || [];
    updateField('tests', newTests);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Rule Tests</h2>
        <div className="flex space-x-3">
          {isEditing && (
            <button
              onClick={addTest}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Add Test
            </button>
          )}
          <button
            onClick={onTestRule}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Run All Tests
          </button>
        </div>
      </div>

      {testResults && (
        <div className={`p-4 rounded-lg ${testResults.pass ? 'bg-green-900/20 border border-green-500' : 'bg-red-900/20 border border-red-500'}`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{testResults.pass ? '✅' : '❌'}</span>
            <span className={`font-medium ${testResults.pass ? 'text-green-400' : 'text-red-400'}`}>
              {testResults.pass ? 'All tests passed' : 'Some tests failed'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rule.tests?.map((test, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={test.name}
                  onChange={(e) => updateTest(index, 'name', e.target.value)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              {isEditing && (
                <button
                  onClick={() => removeTest(index)}
                  className="text-red-400 hover:text-red-300 ml-2"
                >
                  🗑️
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Request Context</label>
                <textarea
                  value={JSON.stringify(test.request, null, 2)}
                  onChange={(e) => {
                    try {
                      const request = JSON.parse(e.target.value);
                      updateTest(index, 'request', request);
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  disabled={!isEditing}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expected Effect</label>
                <select
                  value={test.expect}
                  onChange={(e) => updateTest(index, 'expect', e.target.value as Effect)}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="ALLOW">Allow</option>
                  <option value="BLOCK">Block</option>
                  <option value="ROUTE">Route</option>
                  <option value="REQUIRE_OVERRIDE">Require Override</option>
                  <option value="WARN_ROUTE">Warn Route</option>
                </select>
                
                {testResults?.results?.[index] && (
                  <div className="mt-3 p-3 bg-gray-600 rounded">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`text-lg ${testResults.results[index].passed ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults.results[index].passed ? '✅' : '❌'}
                      </span>
                      <span className={`font-medium ${testResults.results[index].passed ? 'text-green-400' : 'text-red-400'}`}>
                        {testResults.results[index].passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">
                      <p>Expected: {testResults.results[index].expected}</p>
                      <p>Actual: {testResults.results[index].actual}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )) || []}
        
        {(!rule.tests || rule.tests.length === 0) && (
          <div className="text-center text-gray-400 py-8">
            <div className="text-2xl font-bold text-green-400 mb-4">TESTS</div>
            <p>No tests defined for this rule</p>
            {isEditing && (
              <button
                onClick={addTest}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Add First Test
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
