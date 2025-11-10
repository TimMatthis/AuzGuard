import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { PageLayout, Panel } from '../components/PageLayout';
import { ALL_PRODUCTS } from '../utils/productAccess';
import type { ProductKey } from '../types';

export function ProductAccessGroups() {
  const queryClient = useQueryClient();
  const { data: groups } = useQuery({ 
    queryKey: ['productAccessGroups'], 
    queryFn: () => apiClient.getProductAccessGroups() 
  });

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selected, setSelected] = React.useState<Record<ProductKey, boolean>>(() => 
    Object.fromEntries(ALL_PRODUCTS.map(p => [p.key, false])) as Record<ProductKey, boolean>
  );

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string; products: string[] }) => 
      apiClient.createProductAccessGroup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productAccessGroups'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { products: string[] } }) => 
      apiClient.updateProductAccessGroup(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productAccessGroups'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteProductAccessGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productAccessGroups'] });
    }
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelected(Object.fromEntries(ALL_PRODUCTS.map(p => [p.key, false])) as Record<ProductKey, boolean>);
  };

  const create = () => {
    const products = ALL_PRODUCTS.map(p => p.key).filter(k => selected[k]);
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      products
    });
  };

  const toggleInGroup = (groupId: string, key: ProductKey) => {
    const g = groups?.find(group => group.id === groupId);
    if (!g) return;
    const set = new Set<string>(g.products || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    updateMutation.mutate({ id: groupId, patch: { products: Array.from(set) } });
  };

  return (
    <PageLayout title="Product Access Groups" subtitle="Define which products/features are visible to group members.">
      <Panel title="Create Product Access Group">
        <div className="grid gap-3 md:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Group name (e.g., Chat Only)" 
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" 
            />
            <input 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Description (optional)" 
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" 
            />
            <button 
              onClick={create} 
              disabled={createMutation.isPending}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
          <div>
            <div className="text-sm text-gray-300 mb-2">Select products</div>
            <div className="flex flex-wrap gap-2">
              {ALL_PRODUCTS.map(p => (
                <label 
                  key={p.key} 
                  className={`px-2 py-1 rounded border text-xs cursor-pointer ${
                    selected[p.key] 
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-200' 
                      : 'bg-gray-900/60 border-gray-700 text-gray-300'
                  }`}
                  onClick={() => setSelected(s => ({ ...s, [p.key]: !s[p.key] }))}
                >
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Existing Product Access Groups">
        <div className="space-y-3">
          {groups?.map(g => (
            <div key={g.id} className="rounded border border-gray-700 bg-gray-900/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{g.name}</div>
                  {g._count && g._count.userGroups > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {g._count.userGroups} user group{g._count.userGroups !== 1 ? 's' : ''} assigned
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => deleteMutation.mutate(g.id)} 
                    disabled={deleteMutation.isPending}
                    className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {g.description && <div className="text-xs text-gray-400 mt-1">{g.description}</div>}
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_PRODUCTS.map(p => {
                  const checked = Array.isArray(g.products) && g.products.includes(p.key);
                  return (
                    <label 
                      key={p.key} 
                      className={`px-2 py-1 rounded border text-xs cursor-pointer ${
                        checked 
                          ? 'bg-sky-500/10 border-sky-500/40 text-sky-200' 
                          : 'bg-gray-900/60 border-gray-700 text-gray-300'
                      }`}
                      onClick={() => toggleInGroup(g.id, p.key)}
                    >
                      {p.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {(!groups || groups.length === 0) && (
            <div className="text-sm text-gray-400">No product access groups yet.</div>
          )}
        </div>
      </Panel>
    </PageLayout>
  );
}

export default ProductAccessGroups;
