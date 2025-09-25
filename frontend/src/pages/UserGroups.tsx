import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { PageLayout, Panel } from '../components/PageLayout';

export function UserGroups() {
  const queryClient = useQueryClient();
  const { data: groups } = useQuery({ queryKey: ['userGroups'], queryFn: () => apiClient.getUserGroups() });
  const { data: profiles } = useQuery({ queryKey: ['routeProfiles'], queryFn: () => apiClient.getRouteProfiles() });
  const { data: pools } = useQuery({ queryKey: ['modelPools'], queryFn: () => apiClient.getModelPools() });
  const { data: policies } = useQuery({ queryKey: ['policies'], queryFn: () => apiClient.getPolicies() });

  const createGroup = useMutation({
    mutationFn: (name: string) => apiClient.createUserGroup(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userGroups'] })
  });
  const updateGroup = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => apiClient.updateUserGroup(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userGroups'] })
  });
  const deleteGroup = useMutation({
    mutationFn: (id: string) => apiClient.deleteUserGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userGroups'] })
  });

  const [name, setName] = React.useState('');

  return (
    <PageLayout title="User Groups" subtitle="Assign routing profiles, default pools and policies to groups.">
      <Panel title="Create Group">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g., Developers)" className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
          <button onClick={() => { if (name.trim()) { createGroup.mutate(name.trim()); setName(''); } }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md" disabled={createGroup.isPending}>{createGroup.isPending ? 'Creating…' : 'Add Group'}</button>
        </div>
      </Panel>

      <Panel title="Groups">
        <div className="space-y-3">
          {(groups as any[] | undefined)?.map(g => (
            <div key={g.id} className="rounded border border-gray-700 bg-gray-900/60 p-3">
              <div className="flex items-center justify-between">
                <div className="text-white font-medium">{g.name}</div>
                <button onClick={() => deleteGroup.mutate(g.id)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white">Delete</button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-gray-300 mb-1">Routing Profile</label>
                  <select value={g.route_profile_id || ''} onChange={(e) => updateGroup.mutate({ id: g.id, patch: { route_profile_id: e.target.value } })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
                    <option value="">-- Not assigned --</option>
                    {(profiles as any[] | undefined)?.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Default Pool</label>
                  <select value={g.default_pool_id || ''} onChange={(e) => updateGroup.mutate({ id: g.id, patch: { default_pool_id: e.target.value || undefined } })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
                    <option value="">-- None --</option>
                    {(pools as any[] | undefined)?.map(p => (<option key={p.pool_id} value={p.pool_id}>{p.pool_id}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Allowed Pools</label>
                  <div className="flex flex-wrap gap-2">
                    {(pools as any[] | undefined)?.map(p => {
                      const checked = Array.isArray(g.allowed_pools) && g.allowed_pools.includes(p.pool_id);
                      return (
                        <label key={p.pool_id} className={`px-2 py-1 rounded border text-xs cursor-pointer ${checked ? 'bg-sky-500/10 border-sky-500/40 text-sky-200' : 'bg-gray-900/60 border-gray-700 text-gray-300'}`}
                          onClick={() => {
                            const set = new Set<string>(g.allowed_pools || []);
                            if (set.has(p.pool_id)) set.delete(p.pool_id); else set.add(p.pool_id);
                            updateGroup.mutate({ id: g.id, patch: { allowed_pools: Array.from(set) } });
                          }}
                        >{p.pool_id}</label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Default Policy</label>
                  <select value={g.default_policy_id || ''} onChange={(e) => updateGroup.mutate({ id: g.id, patch: { default_policy_id: e.target.value || undefined } })} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
                    <option value="">-- None --</option>
                    {(policies as any[] | undefined)?.map(p => (<option key={p.policy_id} value={p.policy_id}>{p.title}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1">Allowed Policies</label>
                  <div className="flex flex-wrap gap-2">
                    {(policies as any[] | undefined)?.map(p => {
                      const checked = Array.isArray(g.allowed_policies) && g.allowed_policies.includes(p.policy_id);
                      return (
                        <label key={p.policy_id} className={`px-2 py-1 rounded border text-xs cursor-pointer ${checked ? 'bg-sky-500/10 border-sky-500/40 text-sky-200' : 'bg-gray-900/60 border-gray-700 text-gray-300'}`}
                          onClick={() => {
                            const set = new Set<string>(g.allowed_policies || []);
                            if (set.has(p.policy_id)) set.delete(p.policy_id); else set.add(p.policy_id);
                            updateGroup.mutate({ id: g.id, patch: { allowed_policies: Array.from(set) } });
                          }}
                        >{p.title}</label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!groups || !(groups as any[]).length ? <div className="text-sm text-gray-400">No groups yet.</div> : null}
        </div>
      </Panel>
    </PageLayout>
  );
}

export default UserGroups;

