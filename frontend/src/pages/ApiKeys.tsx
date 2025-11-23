import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { PageLayout, Panel } from '../components/PageLayout';
import { useAuth } from '../contexts/AuthContext';

interface ApiKey {
  id: string;
  provider: string;
  name: string;
  models?: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

interface Provider {
  id: string;
  name: string;
  description: string;
}

interface AvailableModel {
  provider: string;
  model_identifier: string;
  pool_id: string;
  pool_description: string;
}

export function ApiKeys() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Track test results for each key
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        message: string;
        responseTimeMs: number;
        modelUsed?: string;
        timestamp: number;
      } | null
    >
  >({});

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => apiClient.getApiKeys()
  });

  // Fetch available providers
  const { data: providers } = useQuery({
    queryKey: ['apiKeyProviders'],
    queryFn: () => apiClient.getApiKeyProviders()
  });

  // Fetch available models
  const { data: availableModels } = useQuery<AvailableModel[]>({
    queryKey: ['availableModels'],
    queryFn: () => apiClient.getAvailableModels()
  });

  // Mutations
  const createApiKey = useMutation({
    mutationFn: (data: { provider: string; name: string; api_key: string; models?: string[] }) =>
      apiClient.createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setIsCreating(false);
      setFormData({ provider: '', name: '', api_key: '', models: [] });
    }
  });

  const updateApiKey = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; api_key?: string; is_active?: boolean; models?: string[] } }) =>
      apiClient.updateApiKey(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      setEditingModels({});
    }
  });

  const deleteApiKey = useMutation({
    mutationFn: (id: string) => apiClient.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    }
  });

  const testApiKey = useMutation({
    mutationFn: (id: string) => apiClient.testApiKey(id),
    onSuccess: (result, id) => {
      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: result.success,
          message: result.message,
          responseTimeMs: result.response_time_ms,
          modelUsed: result.model_used,
          timestamp: Date.now()
        }
      }));
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    }
  });

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    api_key: '',
    models: [] as string[]
  });
  const [editingModels, setEditingModels] = useState<Record<string, string[]>>({});

  if (!isAdmin) {
    return (
      <PageLayout title="Access Denied" subtitle="You don't have permission to view this page">
        <Panel title="Unauthorized">
          <p className="text-gray-400">Only administrators can manage API keys.</p>
        </Panel>
      </PageLayout>
    );
  }

  const handleCreate = () => {
    if (!formData.provider || !formData.name || !formData.api_key) {
      alert('Provider, name, and API key are required');
      return;
    }
    createApiKey.mutate({
      provider: formData.provider,
      name: formData.name,
      api_key: formData.api_key,
      models: formData.models.length > 0 ? formData.models : undefined
    });
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    updateApiKey.mutate({ id, data: { [field]: value } });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the API key "${name}"? This action cannot be undone.`)) {
      deleteApiKey.mutate(id);
    }
  };

  const getProviderInfo = (providerId: string) => {
    return providers?.find(p => p.id === providerId);
  };

  return (
    <PageLayout title="API Keys" subtitle="Manage API keys for AI model providers">
      <Panel title="API Key Management">
        <div className="space-y-6">
          {/* Create new API key */}
          {!isCreating && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
              >
                Add API Key
              </button>
            </div>
          )}

          {isCreating && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Add New API Key</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Provider *
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  >
                    <option value="">Select provider...</option>
                    {providers?.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Production Key"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Enter API key"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  />
                </div>
              </div>
              {/* Model Selection */}
              {formData.provider && availableModels && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Available Models (Optional - select models this key can be used for)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-md p-3 bg-gray-900">
                    {availableModels
                      .filter(m => m.provider === formData.provider)
                      .length === 0 ? (
                      <p className="text-gray-400 text-sm">No models available for this provider</p>
                    ) : (
                      <div className="space-y-2">
                        {availableModels
                          .filter(m => m.provider === formData.provider)
                          .map(model => {
                            const modelKey = `${model.provider}:${model.model_identifier}`;
                            const isSelected = formData.models.includes(modelKey);
                            return (
                              <label key={modelKey} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, models: [...formData.models, modelKey] });
                                    } else {
                                      setFormData({ ...formData, models: formData.models.filter(m => m !== modelKey) });
                                    }
                                  }}
                                  className="rounded border-gray-600"
                                />
                                <span className="text-sm text-gray-200">
                                  <span className="font-medium">{model.model_identifier}</span>
                                  <span className="text-gray-400 ml-2">({model.pool_description})</span>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </div>
                  {formData.models.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      {formData.models.length} model{formData.models.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={createApiKey.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md disabled:opacity-50"
                >
                  {createApiKey.isPending ? 'Creating...' : 'Create API Key'}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setFormData({ provider: '', name: '', api_key: '', models: [] });
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* API Keys list */}
          <div className="space-y-4">
            {keysLoading ? (
              <div className="text-gray-400">Loading API keys...</div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No API keys configured yet. Add your first API key above.
              </div>
            ) : (
              apiKeys.map((apiKey: ApiKey) => {
                const providerInfo = getProviderInfo(apiKey.provider);
                const isEditing = editingId === apiKey.id;

                return (
                  <div
                    key={apiKey.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {apiKey.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {providerInfo?.name || apiKey.provider}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            apiKey.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {apiKey.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {testResults[apiKey.id] && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              testResults[apiKey.id]!.success
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {testResults[apiKey.id]!.success ? '✓ Tested' : '✗ Failed'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => testApiKey.mutate(apiKey.id)}
                          disabled={testApiKey.isPending || !apiKey.is_active}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm disabled:opacity-50"
                        >
                          {testApiKey.isPending ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => {
                            if (!isEditing) {
                              // Initialize editing models with current models
                              setEditingModels({
                                ...editingModels,
                                [apiKey.id]: Array.isArray(apiKey.models) ? [...apiKey.models] : []
                              });
                            } else {
                              // Clear editing models when canceling
                              const newEditing = { ...editingModels };
                              delete newEditing[apiKey.id];
                              setEditingModels(newEditing);
                            }
                            setEditingId(isEditing ? null : apiKey.id);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                        >
                          {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDelete(apiKey.id, apiKey.name)}
                          disabled={deleteApiKey.isPending}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {providerInfo && (
                      <p className="text-sm text-gray-400 mb-4">
                        {providerInfo.description}
                      </p>
                    )}

                    {/* Display Models */}
                    {apiKey.models && Array.isArray(apiKey.models) && apiKey.models.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-300 mb-2">Associated Models:</p>
                        <div className="flex flex-wrap gap-2">
                          {apiKey.models.map((modelKey, idx) => {
                            const [provider, modelId] = modelKey.split(':');
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {modelId || modelKey}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Test Results */}
                    {testResults[apiKey.id] && (
                      <div className={`mb-4 p-3 rounded border ${
                        testResults[apiKey.id]!.success
                          ? 'border-green-500/30 bg-green-500/10'
                          : 'border-red-500/30 bg-red-500/10'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-sm font-medium ${
                            testResults[apiKey.id]!.success ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {testResults[apiKey.id]!.success ? '✓ Test Passed' : '✗ Test Failed'}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({testResults[apiKey.id]!.responseTimeMs}ms)
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">
                          {testResults[apiKey.id]!.message}
                        </p>
                        {testResults[apiKey.id]!.modelUsed && (
                          <p className="text-xs text-gray-400 mt-1">
                            Model: {testResults[apiKey.id]!.modelUsed}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <div className="text-white">
                          {new Date(apiKey.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Last Updated:</span>
                        <div className="text-white">
                          {new Date(apiKey.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Last Used:</span>
                        <div className="text-white">
                          {apiKey.last_used_at
                            ? new Date(apiKey.last_used_at).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        <h4 className="text-md font-semibold text-white mb-4">Edit API Key</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              defaultValue={apiKey.name}
                              onBlur={(e) => handleUpdate(apiKey.id, 'name', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                              Status
                            </label>
                            <select
                              defaultValue={apiKey.is_active.toString()}
                              onChange={(e) => handleUpdate(apiKey.id, 'is_active', e.target.value === 'true')}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Update API Key (leave empty to keep current)
                          </label>
                          <input
                            type="password"
                            placeholder="Enter new API key"
                            onBlur={(e) => {
                              if (e.target.value) {
                                handleUpdate(apiKey.id, 'api_key', e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                          />
                        </div>
                        {/* Model Selection in Edit Mode */}
                        {availableModels && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Associated Models (Optional)
                            </label>
                            <div className="max-h-48 overflow-y-auto border border-gray-700 rounded-md p-3 bg-gray-900">
                              {availableModels
                                .filter(m => m.provider === apiKey.provider)
                                .length === 0 ? (
                                <p className="text-gray-400 text-sm">No models available for this provider</p>
                              ) : (
                                <div className="space-y-2">
                                  {availableModels
                                    .filter(m => m.provider === apiKey.provider)
                                    .map(model => {
                                      const modelKey = `${model.provider}:${model.model_identifier}`;
                                      const currentModels = editingModels[apiKey.id] || (Array.isArray(apiKey.models) ? apiKey.models : []);
                                      const isSelected = currentModels.includes(modelKey);
                                      return (
                                        <label key={modelKey} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const current = editingModels[apiKey.id] || (Array.isArray(apiKey.models) ? apiKey.models : []);
                                              if (e.target.checked) {
                                                setEditingModels({
                                                  ...editingModels,
                                                  [apiKey.id]: [...current, modelKey]
                                                });
                                              } else {
                                                setEditingModels({
                                                  ...editingModels,
                                                  [apiKey.id]: current.filter(m => m !== modelKey)
                                                });
                                              }
                                            }}
                                            className="rounded border-gray-600"
                                          />
                                          <span className="text-sm text-gray-200">
                                            <span className="font-medium">{model.model_identifier}</span>
                                            <span className="text-gray-400 ml-2">({model.pool_description})</span>
                                          </span>
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const modelsToSave = editingModels[apiKey.id];
                                handleUpdate(apiKey.id, 'models', modelsToSave && modelsToSave.length > 0 ? modelsToSave : undefined);
                              }}
                              className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm"
                            >
                              Save Model Selection
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Panel>

      {/* Info Panel */}
      <Panel title="Security Notice">
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <strong className="text-white">API keys are encrypted</strong> and stored securely in the database.
            Keys are only decrypted in memory when needed for API calls.
          </p>
          <p>
            <strong className="text-white">Test functionality</strong> makes minimal API calls to verify keys work.
            Only small requests are made to avoid unnecessary token usage.
          </p>
          <p>
            <strong className="text-white">Never share API keys</strong> or commit them to version control.
            Use this interface to manage keys securely.
          </p>
          <p>
            <strong className="text-white">Environment variables</strong> are still supported as fallbacks,
            but stored keys take precedence for authenticated requests.
          </p>
        </div>
      </Panel>
    </PageLayout>
  );
}
