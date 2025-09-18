import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { AuditLogItem, Effect, FilterOptions } from '../types';

export function Audit() {
  const [filters, setFilters] = useState<FilterOptions>({
    limit: 50,
    offset: 0
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => apiClient.getAuditLogs(filters),
  });

  const { data: latestProof } = useQuery({
    queryKey: ['audit-proof'],
    queryFn: () => apiClient.getLatestProof(),
  });

  const getEffectColor = (effect: Effect) => {
    switch (effect) {
      case 'ALLOW': return 'text-green-400';
      case 'BLOCK': return 'text-red-400';
      case 'ROUTE': return 'text-blue-400';
      case 'REQUIRE_OVERRIDE': return 'text-yellow-400';
      case 'WARN_ROUTE': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getEffectIcon = (effect: Effect) => {
    switch (effect) {
      case 'ALLOW': return '✅';
      case 'BLOCK': return '🚫';
      case 'ROUTE': return '🔄';
      case 'REQUIRE_OVERRIDE': return '⚠️';
      case 'WARN_ROUTE': return '⚠️';
      default: return '❓';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset offset when filters change
    }));
  };

  const loadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 50)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400">Immutable audit trail of all policy decisions</p>
        </div>
        
        {latestProof && (
          <div className="text-right">
            <p className="text-sm text-gray-400">Latest Merkle Proof</p>
            <p className="text-xs text-gray-500 font-mono">
              Root: {latestProof.merkle_root.substring(0, 16)}...
            </p>
            <p className="text-xs text-gray-500">
              Height: {latestProof.height} • Index: {latestProof.last_index}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">From Date</label>
            <input
              type="datetime-local"
              value={filters.from || ''}
              onChange={(e) => handleFilterChange('from', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">To Date</label>
            <input
              type="datetime-local"
              value={filters.to || ''}
              onChange={(e) => handleFilterChange('to', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Organization ID</label>
            <input
              type="text"
              value={filters.org_id || ''}
              onChange={(e) => handleFilterChange('org_id', e.target.value || undefined)}
              placeholder="e.g., hospital-123"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Effect</label>
            <select
              value={filters.effect || ''}
              onChange={(e) => handleFilterChange('effect', e.target.value || undefined)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Effects</option>
              <option value="ALLOW">ALLOW</option>
              <option value="BLOCK">BLOCK</option>
              <option value="ROUTE">ROUTE</option>
              <option value="REQUIRE_OVERRIDE">REQUIRE_OVERRIDE</option>
              <option value="WARN_ROUTE">WARN_ROUTE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Audit Entries</h2>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center text-gray-400">
            Loading audit logs...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rule ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Effect
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {auditLogs?.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {log.org_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                      {log.rule_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getEffectIcon(log.effect)}</span>
                        <span className={`text-sm font-medium ${getEffectColor(log.effect)}`}>
                          {log.effect}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {log.actor_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {auditLogs && auditLogs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-700">
            <button
              onClick={loadMore}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-white">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">ID</label>
                  <p className="text-white font-mono text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Timestamp</label>
                  <p className="text-white">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Organization ID</label>
                  <p className="text-white">{selectedLog.org_id || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Actor ID</label>
                  <p className="text-white">{selectedLog.actor_id || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Rule ID</label>
                  <p className="text-white font-mono">{selectedLog.rule_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Effect</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getEffectIcon(selectedLog.effect)}</span>
                    <span className={`font-medium ${getEffectColor(selectedLog.effect)}`}>
                      {selectedLog.effect}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Hashed Fields</label>
                <div className="bg-gray-700 rounded p-3">
                  <pre className="text-sm text-gray-300 font-mono">
                    {JSON.stringify(selectedLog.fields_hashed, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
