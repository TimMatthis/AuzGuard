import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { PageLayout, Panel } from '../components/PageLayout';

export function Users() {
  const queryClient = useQueryClient();
  
  // Fetch data
  const { data: users, isLoading: usersLoading } = useQuery({ 
    queryKey: ['users'], 
    queryFn: () => apiClient.getUsers() 
  });
  
  const { data: groups } = useQuery({ 
    queryKey: ['userGroups'], 
    queryFn: () => apiClient.getUserGroups() 
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: (data: { email: string; password: string; role?: string; user_group_id?: string }) => 
      apiClient.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateForm(false);
      setNewUser({ email: '', password: '', role: 'viewer', user_group_id: '' });
    }
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => 
      apiClient.updateUser(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: (id: string) => apiClient.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Assign user to group mutation
  const assignUserToGroup = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string | null }) => 
      apiClient.assignUserToGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'viewer',
    user_group_id: ''
  });

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      alert('Email and password are required');
      return;
    }

    if (newUser.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    const data: any = {
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
    };

    if (newUser.user_group_id) {
      data.user_group_id = newUser.user_group_id;
    }

    createUser.mutate(data);
  };

  if (usersLoading) {
    return (
      <PageLayout title="User Management" subtitle="Create and manage users">
        <div className="text-gray-400">Loading users...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="User Management" subtitle="Create and manage users, assign them to groups">
      {/* Create User Button */}
      <Panel title="Users">
        <div className="mb-4">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
          >
            {showCreateForm ? 'Cancel' : 'Create New User'}
          </button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 bg-gray-900/60 border border-gray-700 rounded-md">
            <h3 className="text-white font-medium mb-4">Create New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1 text-sm">User Group</label>
                <select
                  value={newUser.user_group_id}
                  onChange={(e) => setNewUser({ ...newUser, user_group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                >
                  <option value="">-- No Group --</option>
                  {groups?.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreateUser}
                disabled={createUser.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md disabled:opacity-50"
              >
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-3">
          {users && users.length === 0 && (
            <div className="text-gray-400 text-center py-8">
              No users found. Create your first user above.
            </div>
          )}
          
          {users?.map((user: any) => (
            <div key={user.id} className="rounded border border-gray-700 bg-gray-900/60 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white font-medium">{user.email}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Role: <span className="text-emerald-400">{user.role}</span>
                    {user.userGroup && (
                      <span className="ml-3">
                        Group: <span className="text-sky-400">{user.userGroup.name}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created: {new Date(user.created_at).toLocaleDateString()}
                    {user.last_login && (
                      <span className="ml-3">
                        Last login: {new Date(user.last_login).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete user ${user.email}?`)) {
                        deleteUser.mutate(user.id);
                      }
                    }}
                    className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* User controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <label className="block text-gray-300 mb-1">Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => updateUser.mutate({ id: user.id, patch: { role: e.target.value } })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">User Group</label>
                  <select
                    value={user.user_group_id || ''}
                    onChange={(e) => assignUserToGroup.mutate({ 
                      userId: user.id, 
                      groupId: e.target.value || null 
                    })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  >
                    <option value="">-- No Group --</option>
                    {groups?.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Status</label>
                  <select
                    value={user.is_active ? 'active' : 'inactive'}
                    onChange={(e) => updateUser.mutate({ 
                      id: user.id, 
                      patch: { is_active: e.target.value === 'active' } 
                    })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </PageLayout>
  );
}

