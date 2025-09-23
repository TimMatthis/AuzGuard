import {
  Policy,
  SimulationInput,
  SimulationResult,
  AuditLogItem,
  ModelPool,
  RouteTarget,
  OverrideRequest,
  OverrideResponse,
  TestResult,
  FilterOptions,
  ValidationError,
  RoutingRequest,
  RoutingResponse,
  GatewayDashboardMetrics,
  Rule
} from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const headers = new Headers(options.headers ?? {});
    headers.set('Content-Type', 'application/json');

    // Always check localStorage for token
    const token = this.token || localStorage.getItem('auzguard_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: 'NETWORK_ERROR', message: 'Network error' }
      }));
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  // Policy endpoints
  async getPolicies(): Promise<Policy[]> {
    return this.request<Policy[]>('/policies');
  }

  async getPolicy(policyId: string): Promise<Policy> {
    return this.request<Policy>(`/policies/${policyId}`);
  }

  // Rule catalog endpoints
  async getRuleCatalog(): Promise<import('../types').CatalogRuleSummary[]> {
    return this.request<import('../types').CatalogRuleSummary[]>('/policies/rules/catalog');
  }

  async getRuleFromCatalog(ruleId: string): Promise<Rule> {
    return this.request<Rule>(`/policies/rules/catalog/${ruleId}`);
  }

  async addRulesFromCatalog(
    policyId: string,
    payload: { rule_ids: string[]; overrides?: Record<string, Partial<Rule>>; behavior?: 'replace' | 'skip' | 'duplicate' }
  ): Promise<Policy> {
    return this.request<Policy>(`/policies/${policyId}/rules/add-from-catalog`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createPolicy(policy: Policy): Promise<Policy> {
    return this.request<Policy>('/policies/import', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  async updatePolicy(policyId: string, policy: Policy): Promise<Policy> {
    return this.request<Policy>(`/policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    });
  }

  async deletePolicy(policyId: string): Promise<void> {
    return this.request<void>(`/policies/${policyId}`, {
      method: 'DELETE',
    });
  }

  async validatePolicy(policy: Policy): Promise<{ valid: boolean; errors: ValidationError[] }> {
    return this.request<{ valid: boolean; errors: ValidationError[] }>(`/policies/${policy.policy_id}/validate`, {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  }

  async testRule(
    policyId: string, 
    ruleId: string, 
    testRequest: Record<string, unknown>
  ): Promise<{ pass: boolean; results: TestResult[] }> {
    return this.request<{ pass: boolean; results: TestResult[] }>(`/policies/${policyId}/rules/${ruleId}/test`, {
      method: 'POST',
      body: JSON.stringify({ request: testRequest }),
    });
  }

  // Evaluation endpoints
  async evaluate(input: SimulationInput): Promise<SimulationResult> {
    return this.request<SimulationResult>('/evaluate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async simulate(input: SimulationInput): Promise<SimulationResult> {
    return this.request<SimulationResult>('/evaluate/simulate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // Audit endpoints
  async getAuditLogs(filters: FilterOptions = {}): Promise<AuditLogItem[]> {
    const params = new URLSearchParams();
    
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.org_id) params.append('org_id', filters.org_id);
    if (filters.rule_id) params.append('rule_id', filters.rule_id);
    if (filters.effect) params.append('effect', filters.effect);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/audit?${queryString}` : '/audit';
    
    return this.request<AuditLogItem[]>(endpoint);
  }

  async getAuditLog(id: string): Promise<AuditLogItem> {
    return this.request<AuditLogItem>(`/audit/${id}`);
  }

  async getLatestProof(): Promise<{ merkle_root: string; height: number; last_index: number }> {
    return this.request<{ merkle_root: string; height: number; last_index: number }>('/audit/proof/latest');
  }

  async verifyIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    return this.request<{ valid: boolean; errors: string[] }>('/audit/verify', {
      method: 'POST',
    });
  }

  // Route endpoints
  async getModelPools(): Promise<ModelPool[]> {
    return this.request<ModelPool[]>('/routes/pools');
  }

  async getModelPool(poolId: string): Promise<ModelPool> {
    return this.request<ModelPool>(`/routes/pools/${poolId}`);
  }

  async createModelPool(pool: Omit<ModelPool, 'health'>): Promise<ModelPool> {
    return this.request<ModelPool>('/routes/pools', {
      method: 'POST',
      body: JSON.stringify(pool),
    });
  }

  async updateModelPool(poolId: string, pool: Partial<ModelPool>): Promise<ModelPool> {
    return this.request<ModelPool>(`/routes/pools/${poolId}`, {
      method: 'PUT',
      body: JSON.stringify(pool),
    });
  }

  async deleteModelPool(poolId: string): Promise<void> {
    return this.request<void>(`/routes/pools/${poolId}`, {
      method: 'DELETE',
    });
  }

  async getRouteTargets(): Promise<RouteTarget[]> {
    return this.request<RouteTarget[]>('/routes/targets');
  }

  async createRouteTarget(target: Omit<RouteTarget, 'id'>): Promise<RouteTarget> {
    return this.request<RouteTarget>('/routes/targets', {
      method: 'POST',
      body: JSON.stringify(target),
    });
  }

  async updateRouteTarget(id: string, target: Partial<RouteTarget>): Promise<RouteTarget> {
    return this.request<RouteTarget>(`/routes/targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(target),
    });
  }

  async deleteRouteTarget(id: string): Promise<void> {
    return this.request<void>(`/routes/targets/${id}`, {
      method: 'DELETE',
    });
  }

  async getRouteTargetsForPool(poolId: string): Promise<RouteTarget[]> {
    return this.request<RouteTarget[]>(`/routes/pools/${poolId}/targets`);
  }

  async updatePoolHealth(
    poolId: string, 
    health: { status: 'healthy' | 'degraded' | 'unhealthy'; errors?: string[] }
  ): Promise<void> {
    return this.request<void>(`/routes/pools/${poolId}/health`, {
      method: 'POST',
      body: JSON.stringify(health),
    });
  }


  async executeRouting(request: RoutingRequest): Promise<RoutingResponse> {
    return this.request<RoutingResponse>('/routes/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRoutingMetrics(): Promise<GatewayDashboardMetrics> {
    return this.request<GatewayDashboardMetrics>('/routes/metrics/summary');
  }

  async previewRanking(poolId: string, preferences: import('../types').RoutingPreference): Promise<import('../types').RoutingDecision> {
    return this.request<import('../types').RoutingDecision>(`/routes/pools/${poolId}/preview-ranking`, {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    });
  }

  async getRoutingPaths(params: { from?: string; to?: string } = {}): Promise<{ nodes: any[]; edges: { source: string; target: string; count: number }[]; node_counts: Record<string, number> }> {
    const qs = new URLSearchParams();
    if (params.from) qs.append('from', params.from);
    if (params.to) qs.append('to', params.to);
    const endpoint = qs.toString() ? `/routes/metrics/paths?${qs.toString()}` : '/routes/metrics/paths';
    return this.request(endpoint);
  }

  // Override endpoints
  async executeOverride(request: OverrideRequest): Promise<OverrideResponse> {
    return this.request<OverrideResponse>('/overrides/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiClient = new ApiClient();



