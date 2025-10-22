import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Branding = {
  brandName: string;
  logoUrl?: string;
  poweredBySuffix?: string; // e.g., "powered by AuzGuard"
  setOrgId?: (orgId?: string) => void;
};

const BrandingContext = createContext<Branding | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const env: any = (import.meta as any)?.env || {};
  const [brand, setBrand] = useState<Branding>({
    brandName: env.VITE_BRAND_NAME || 'AuzGuard',
    logoUrl: env.VITE_BRAND_LOGO_URL || undefined,
    poweredBySuffix: env.VITE_BRAND_POWERED_BY || 'powered by AuzGuard',
  });
  const [orgId, setOrgIdState] = useState<string | undefined>(() => {
    const fromStorage = localStorage.getItem('auzguard_org_id') || undefined;
    const fromQs = new URLSearchParams(window.location.search).get('org_id') || undefined;
    return fromQs || fromStorage;
  });

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

  useEffect(() => {
    // Try fetching dynamic branding from backend; fall back to env
    const controller = new AbortController();
    const qs = orgId ? `?org_id=${encodeURIComponent(orgId)}` : '';
    fetch(`/api/branding${qs}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setBrand({
          brandName: data.brandName || brand.brandName,
          logoUrl: data.logoUrl ?? brand.logoUrl,
          poweredBySuffix: data.poweredBySuffix || brand.poweredBySuffix,
        });
      })
      .catch(() => {})
    return () => controller.abort();
  // Refetch when orgId changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const value = useMemo(() => Object.assign({}, brand, { setOrgId }), [brand]);

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
