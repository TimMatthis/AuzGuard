import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage organization settings and user roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">User Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <p className="text-white">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Organization ID</label>
              <p className="text-white">{user?.org_id || 'Not assigned'}</p>
            </div>
          </div>
        </div>

        {/* Organization Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Organization Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Organization ID</label>
              <input
                type="text"
                defaultValue={user?.org_id || ''}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., hospital-123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Organization Tags</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="healthcare, regulated, critical"
              />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Save Settings
            </button>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Webhook Targets</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">DPO Notification URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://dpo.company.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Export Control URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://export.company.com/webhook"
              />
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Save Webhooks
            </button>
          </div>
        </div>

        {/* Role Management */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Role Management</h2>
          <div className="space-y-3">
            {[
              { role: 'viewer', description: 'Read-only access to policies and audit logs' },
              { role: 'developer', description: 'Edit rules, run simulations, test policies' },
              { role: 'compliance', description: 'Publish rules, manage overrides, full audit access' },
              { role: 'admin', description: 'Full system access, manage routes and settings' }
            ].map((roleInfo) => (
              <div key={roleInfo.role} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <div>
                  <span className="font-medium text-white capitalize">{roleInfo.role}</span>
                  <p className="text-sm text-gray-400">{roleInfo.description}</p>
                </div>
                <span className="text-sm text-gray-400">0 users</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
