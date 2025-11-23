import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Branding = {
  brandName: string;
  logoUrl?: string;
  poweredBySuffix?: string; // e.g., "powered by AuzGuard"
  setOrgId?: (orgId?: string) => void;
  refreshBranding?: () => void;
};

const BrandingContext = createContext<Branding | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const env: any = (import.meta as any)?.env || {};
  const [brand, setBrand] = useState<Branding>({
    brandName: env.VITE_BRAND_NAME || 'AuzGuard',
    logoUrl: env.VITE_BRAND_LOGO_URL || undefined,
    poweredBySuffix: env.VITE_BRAND_POWERED_BY || 'Sovereign AI Gateway',
  });
  const [orgId, setOrgIdState] = useState<string | undefined>(() => {
    const fromStorage = localStorage.getItem('auzguard_org_id') || undefined;
    const fromQs = new URLSearchParams(window.location.search).get('org_id') || undefined;
    return fromQs || fromStorage;
  });
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auzguard_token'));

  const setOrgId = (val?: string) => {
    setOrgIdState(val || undefined);
    if (val && val.trim()) {
      localStorage.setItem('auzguard_org_id', val.trim());
      const url = new URL(window.location.href);
      url.searchParams.set('org_id', val.trim());
      window.history.replaceState({}, '', url.toString());
    } else {
      localStorage.removeItem('auzguard_org_id');
      const url = new URL(window.location.href);
      url.searchParams.delete('org_id');
      window.history.replaceState({}, '', url.toString());
    }
    // Trigger refetch below (effect depends on orgId)
  };

  const refreshBranding = () => {
    setRefreshCounter(prev => prev + 1);
  };

  useEffect(() => {
    // Listen for token changes triggered by AuthContext
    const onTokenChanged = () => setToken(localStorage.getItem('auzguard_token'));
    window.addEventListener('auzguard-token-changed', onTokenChanged);
    // Also listen to storage events (cross-tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auzguard_token') setToken(localStorage.getItem('auzguard_token'));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('auzguard-token-changed', onTokenChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    // Try fetching dynamic branding from backend (authenticated endpoint); fall back to defaults
    const controller = new AbortController();
    const currentToken = token;
    
    // Only fetch if user is authenticated
    if (!currentToken) {
      // Reset to defaults when logged out
      setBrand({
        brandName: env.VITE_BRAND_NAME || 'AuzGuard',
        logoUrl: env.VITE_BRAND_LOGO_URL || undefined,
        poweredBySuffix: env.VITE_BRAND_POWERED_BY || 'Sovereign AI Gateway',
      });
      return;
    }

    fetch(`/api/tenant/branding`, { 
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${currentToken}`
      }
    })
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setBrand({
          brandName: data.company_name || brand.brandName,
          logoUrl: data.logo_url ?? brand.logoUrl,
          poweredBySuffix: brand.poweredBySuffix,
        });
      })
      .catch(() => {})
    return () => controller.abort();
  // Refetch when orgId, localStorage token, or refreshCounter changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, refreshCounter, token]);

  const value = useMemo(() => Object.assign({}, brand, { setOrgId, refreshBranding }), [brand]);

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): Branding {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
