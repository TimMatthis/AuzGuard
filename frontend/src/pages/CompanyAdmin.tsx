import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { PageLayout, Panel } from '../components/PageLayout';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';

export function CompanyAdmin() {
  const queryClient = useQueryClient();
  const { refreshBranding } = useBranding();
  const { token } = useAuth();
  
  // Fetch current branding
  const { data: branding, isLoading } = useQuery({ 
    queryKey: ['tenantBranding', token], 
    queryFn: () => apiClient.getTenantBranding() 
  });

  // Update branding mutation
  const updateBranding = useMutation({
    mutationFn: (data: { company_name?: string; logo_url?: string | null }) => 
      apiClient.updateTenantBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantBranding'] });
      // Refresh the header branding
      if (refreshBranding) {
        refreshBranding();
      }
      setIsEditing(false);
    }
  });

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    logo_url: ''
  });

  // Initialize form when branding data loads
  React.useEffect(() => {
    if (branding) {
      setFormData({
        company_name: branding.company_name || '',
        logo_url: branding.logo_url || ''
      });
    }
  }, [branding]);

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      alert('Company name is required');
      return;
    }

    updateBranding.mutate({
      company_name: formData.company_name,
      logo_url: formData.logo_url || null
    });
  };

  const handleCancel = () => {
    if (branding) {
      setFormData({
        company_name: branding.company_name || '',
        logo_url: branding.logo_url || ''
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <PageLayout title="Company Admin" subtitle="Manage your company settings">
        <div className="text-gray-400">Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Company Admin" subtitle="Manage your company branding and settings">
      <Panel title="Company Branding">
        <div className="space-y-6">
          {/* Display Mode */}
          {!isEditing && (
            <>
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Company Name</label>
                <div className="text-white text-lg">{branding?.company_name || 'Not set'}</div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">Company Logo</label>
                {branding?.logo_url ? (
                  <div className="space-y-3">
                    <img 
                      src={branding.logo_url} 
                      alt="Company Logo" 
                      className="h-16 object-contain bg-white/5 rounded p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="text-sm text-gray-400 break-all">{branding.logo_url}</div>
                  </div>
                ) : (
                  <div className="text-gray-400">No logo set</div>
                )}
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
              >
                Edit Branding
              </button>
            </>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <>
              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Your Company Name"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This will be displayed throughout the application
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 text-sm font-medium">
                  Company Logo URL
                </label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Enter a URL to your company logo image (PNG, SVG, or JPG)
                </p>
                
                {/* Logo Preview */}
                {formData.logo_url && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-300 mb-2">Preview:</div>
                    <img 
                      src={formData.logo_url} 
                      alt="Logo Preview" 
                      className="h-16 object-contain bg-white/5 rounded p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '';
                        (e.target as HTMLImageElement).alt = 'Failed to load image';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={updateBranding.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md disabled:opacity-50"
                >
                  {updateBranding.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={updateBranding.isPending}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </Panel>

      {/* Info Panel */}
      <Panel title="About Logo Upload">
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            To upload a company logo, you have several options:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong className="text-white">Image hosting services:</strong> Upload your logo to services like 
              Imgur, Cloudinary, or AWS S3, then use the public URL here.
            </li>
            <li>
              <strong className="text-white">Your own website:</strong> Host the logo on your company website 
              and use that URL.
            </li>
            <li>
              <strong className="text-white">Data URL:</strong> Convert your image to a base64 data URL 
              (for small images only).
            </li>
          </ul>
          <p className="text-gray-400 text-xs mt-4">
            Recommended: Use a transparent PNG or SVG format for best results. Ideal size: 200x50 pixels or similar aspect ratio.
          </p>
        </div>
      </Panel>
    </PageLayout>
  );
}

