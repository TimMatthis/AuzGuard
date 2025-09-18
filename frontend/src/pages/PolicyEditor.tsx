import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy, Rule, Category, Jurisdiction, Effect, Severity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { RuleDefinitionTab } from '../components/RuleDefinitionTab';
import { RuleConditionTab } from '../components/RuleConditionTab';
import { RuleObligationsTab } from '../components/RuleObligationsTab';
import { RuleTestsTab } from '../components/RuleTestsTab';
import { RuleBuilder } from '../components/RuleBuilder';

export function PolicyEditor() {
  const { policyId, ruleId } = useParams<{ policyId: string; ruleId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'definition' | 'condition' | 'obligations' | 'tests'>('definition');
  const [isEditing, setIsEditing] = useState(false);
  const [editedRule, setEditedRule] = useState<Rule | null>(null);
  const [showRuleBuilder, setShowRuleBuilder] = useState(
    (location.state as any)?.showRuleBuilder || false
  );

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => apiClient.getPolicy(policyId!),
    enabled: !!policyId,
  });

  const updatePolicyMutation = useMutation({
    mutationFn: (updatedPolicy: Policy) => apiClient.updatePolicy(policyId!, updatedPolicy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
      setIsEditing(false);
    },
  });

  const testRuleMutation = useMutation({
    mutationFn: ({ ruleId, testRequest }: { ruleId: string; testRequest: Record<string, unknown> }) =>
      apiClient.testRule(policyId!, ruleId, testRequest),
  });

  const selectedRule = ruleId ? policy?.rules.find(r => r.rule_id === ruleId) : null;

  useEffect(() => {
    if (selectedRule) {
      setEditedRule({ ...selectedRule });
    }
  }, [selectedRule]);

  const handleSaveRule = () => {
    if (!editedRule || !policy) return;

    const updatedPolicy = {
      ...policy,
      rules: policy.rules.map(r => r.rule_id === editedRule.rule_id ? editedRule : r)
    };

    updatePolicyMutation.mutate(updatedPolicy);
  };

  const handleCancelEdit = () => {
    setEditedRule(selectedRule ? { ...selectedRule } : null);
    setIsEditing(false);
  };

  const handleTestRule = () => {
    if (!editedRule) return;
    
    // Run all tests for the rule
    editedRule.tests?.forEach(test => {
      testRuleMutation.mutate({
        ruleId: editedRule.rule_id,
        testRequest: test.request
      });
    });
  };

  const handleCreateRule = (newRule: Rule) => {
    if (!policy) return;
    
    const updatedPolicy: Policy = {
      ...policy,
      rules: [...policy.rules, newRule]
    };
    
    updatePolicyMutation.mutate(updatedPolicy);
    setShowRuleBuilder(false);
    navigate(`/policies/${policyId}/rules/${newRule.rule_id}`);
  };

  if (showRuleBuilder) {
    return (
      <RuleBuilder
        onRuleCreate={handleCreateRule}
        onCancel={() => setShowRuleBuilder(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading policy...</div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="text-4xl mb-4">❌</div>
        <p>Policy not found</p>
      </div>
    );
  }

  if (!selectedRule) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="text-2xl font-bold text-blue-400 mb-4">RULES</div>
        <p>Select a rule to edit or create a new one</p>
        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            disabled={!hasPermission('edit_rules')}
          >
            + Create New Rule
          </button>
          <button
            onClick={() => navigate(`/policies/${policyId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Policy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">{selectedRule.title}</h1>
          <p className="text-gray-400">{selectedRule.rule_id} • {policy.title}</p>
        </div>
        <div className="flex space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={updatePolicyMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {updatePolicyMutation.isPending ? 'Saving...' : 'Save Rule'}
              </button>
            </>
          ) : (
            <>
              {hasPermission('edit_rules') && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit Rule
                </button>
              )}
              <button
                onClick={handleTestRule}
                disabled={testRuleMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {testRuleMutation.isPending ? 'Testing...' : 'Run Tests'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'definition', label: 'Definition', icon: 'DEF' },
            { id: 'condition', label: 'Condition', icon: 'CFG' },
            { id: 'obligations', label: 'Obligations & Overrides', icon: 'OBL' },
            { id: 'tests', label: 'Tests', icon: 'TST' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {activeTab === 'definition' && (
          <RuleDefinitionTab
            rule={editedRule!}
            onChange={setEditedRule}
            isEditing={isEditing}
          />
        )}
        
        {activeTab === 'condition' && (
          <RuleConditionTab
            rule={editedRule!}
            onChange={setEditedRule}
            isEditing={isEditing}
          />
        )}
        
        {activeTab === 'obligations' && (
          <RuleObligationsTab
            rule={editedRule!}
            onChange={setEditedRule}
            isEditing={isEditing}
          />
        )}
        
        {activeTab === 'tests' && (
          <RuleTestsTab
            rule={editedRule!}
            onChange={setEditedRule}
            isEditing={isEditing}
            onTestRule={handleTestRule}
            testResults={testRuleMutation.data}
          />
        )}
      </div>
    </div>
  );
}