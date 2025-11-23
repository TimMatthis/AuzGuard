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
  Rule,
  ChatSession,
  ChatMessage,
  CreateChatSessionInput,
  UpdateChatSessionInput,
  ChatRole
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
    
    // Only set Content-Type for requests that have a body
    if (options.body) {
      headers.set('Content-Type', 'application/json');
    }

    // Always check localStorage for token
    const token = this.token || localStorage.getItem('auzguard_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { ...options, headers });

    // 204 No Content
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    // Read body once, then decide
    const raw = await response.text().catch(() => '');
    let data: any = undefined;
    try { data = raw ? JSON.parse(raw) : undefined; } catch { /* not JSON */ }

    if (!response.ok) {
      // If backend sent a structured error, throw it to preserve code/message
      if (data?.error) {
        throw data.error;
      }
      const message = data?.message || raw || `${response.status} ${response.statusText}`;
      throw new Error(message || 'Request failed');
    }

    return (data as T);
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
  // Routing profiles & groups
  async getRouteProfiles(): Promise<import('../types').RouteProfile[]> {
    return this.request('/routes/config/profiles');
  }
  async createRouteProfile(payload: { name: string; pool_id?: string; basic?: import('../types').RouteProfile['basic']; preferences?: import('../types').RoutingPreference }): Promise<import('../types').RouteProfile> {
    return this.request('/routes/config/profiles', { method: 'POST', body: JSON.stringify(payload) });
  }
  async updateRouteProfile(id: string, patch: Partial<Omit<import('../types').RouteProfile, 'id' | 'created_at'>>): Promise<import('../types').RouteProfile> {
    return this.request(`/routes/config/profiles/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  }
  async deleteRouteProfile(id: string): Promise<void> {
    return this.request(`/routes/config/profiles/${id}`, { method: 'DELETE' });
  }
  // User management
  async login(email: string, password: string): Promise<{ user: import('../types').User; token: string }> {
    return this.request('/tenant/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  }
  async register(email: string, password: string, org_id?: string, role?: string): Promise<{ user: import('../types').User; token: string }> {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, org_id, role }) });
  }
  
  // Multi-tenant company management
  async registerCompany(data: {
    slug: string;
    company_name: string;
    admin_email: string;
    admin_name?: string;
    admin_password: string;
    plan?: string;
  }): Promise<{ success: boolean; email_verification_required?: boolean; message?: string; tenant: { id: string; slug: string; company_name: string }; user: any; token: string; verification_url?: string }> {
    return this.request('/company/register', { method: 'POST', body: JSON.stringify(data) });
  }
  
  async verifyEmail(token: string, email: string, slug?: string): Promise<{
    success: boolean;
    message: string;
    already_verified?: boolean;
  }> {
    const qs = new URLSearchParams({ token, email });
    if (slug) qs.set('slug', slug);
    return this.request(`/verify-email?${qs.toString()}`, {
      method: 'GET'
    });
  }
  
  async tenantLogin(email: string, password: string, tenant_slug?: string): Promise<{
    success: boolean;
    tenant: { slug: string; company_name: string };
    user: any;
    token: string;
  }> {
    return this.request('/tenant/login', { method: 'POST', body: JSON.stringify({ email, password, tenant_slug }) });
  }
  
  async checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
    return this.request(`/company/check/${slug}`);
  }
  
  async getCompanyInfo(slug: string): Promise<{ slug: string; company_name: string; status: string; plan: string }> {
    return this.request(`/company/${slug}`);
  }
  
  // Tenant branding endpoints
  async getTenantBranding(): Promise<{ id?: string; company_name: string; logo_url: string | null }> {
    return this.request('/tenant/branding');
  }
  
  async updateTenantBranding(data: { company_name?: string; logo_url?: string | null }): Promise<{ id: string; company_name: string; logo_url: string | null }> {
    return this.request('/tenant/branding', { method: 'PUT', body: JSON.stringify(data) });
  }
  async getUsers(filters?: { org_id?: string; user_group_id?: string; is_active?: boolean }): Promise<import('../types').User[]> {
    const qs = new URLSearchParams();
    if (filters?.org_id) qs.append('org_id', filters.org_id);
    if (filters?.user_group_id) qs.append('user_group_id', filters.user_group_id);
    if (filters?.is_active !== undefined) qs.append('is_active', String(filters.is_active));
    const endpoint = qs.toString() ? `/users?${qs}` : '/users';
    return this.request(endpoint);
  }
  async getUser(id: string): Promise<any> {
    return this.request(`/users/${id}`);
  }
  async getCurrentUser(): Promise<import('../types').User> {
    return this.request('/users/me');
  }
  async createUser(user: { email: string; password: string; role?: string; org_id?: string; user_group_id?: string }): Promise<import('../types').User> {
    return this.request('/users', { method: 'POST', body: JSON.stringify(user) });
  }
  async updateUser(id: string, patch: { email?: string; password?: string; role?: string; org_id?: string; user_group_id?: string; is_active?: boolean }): Promise<import('../types').User> {
    return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  }
  async deleteUser(id: string): Promise<void> {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }
  async assignUserToGroup(userId: string, groupId: string | null): Promise<import('../types').User> {
    return this.request(`/users/${userId}/assign-group`, { method: 'POST', body: JSON.stringify({ group_id: groupId }) });
  }

  // User groups
  async getUserGroups(): Promise<Array<import('../types').UserGroup & { route_profile_id?: string }>> {
    return this.request('/user-groups');
  }
  async getUserGroup(id: string): Promise<any> {
    return this.request(`/user-groups/${id}`);
  }
  async createUserGroup(input: { name: string; default_pool_id?: string; allowed_pools?: string[]; default_policy_id?: string; allowed_policies?: string[]; route_profile_id?: string; product_access_group_id?: string }): Promise<import('../types').UserGroup> {
    return this.request('/user-groups', { method: 'POST', body: JSON.stringify(input) });
  }
  async updateUserGroup(id: string, patch: Partial<import('../types').UserGroup> & { route_profile_id?: string; product_access_group_id?: string }): Promise<import('../types').UserGroup> {
    return this.request(`/user-groups/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  }
  async deleteUserGroup(id: string): Promise<void> {
    return this.request(`/user-groups/${id}`, { method: 'DELETE' });
  }

  // Product access groups
  async getProductAccessGroups(): Promise<Array<{ id: string; name: string; description: string | null; products: string[]; created_at: string; updated_at: string; _count?: { userGroups: number } }>> {
    return this.request('/product-access-groups');
  }
  async getProductAccessGroup(id: string): Promise<any> {
    return this.request(`/product-access-groups/${id}`);
  }
  async createProductAccessGroup(input: { name: string; description?: string; products: string[] }): Promise<any> {
    return this.request('/product-access-groups', { method: 'POST', body: JSON.stringify(input) });
  }
  async updateProductAccessGroup(id: string, patch: { name?: string; description?: string | null; products?: string[] }): Promise<any> {
    return this.request(`/product-access-groups/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
  }
  async deleteProductAccessGroup(id: string): Promise<void> {
    return this.request(`/product-access-groups/${id}`, { method: 'DELETE' });
  }

  async getRoutingPaths(params: { from?: string; to?: string } = {}): Promise<{ nodes: any[]; edges: { source: string; target: string; count: number }[]; node_counts: Record<string, number> }> {
    const qs = new URLSearchParams();
    if (params.from) qs.append('from', params.from);
    if (params.to) qs.append('to', params.to);
    const endpoint = qs.toString() ? `/routes/metrics/paths?${qs.toString()}` : '/routes/metrics/paths';
    return this.request(endpoint);
  }

  // API Key management endpoints
  async getApiKeys(): Promise<Array<{ id: string; provider: string; name: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string }>> {
    const response = await this.request<{ api_keys: Array<{ id: string; provider: string; name: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string }> }>('/api-keys');
    return response.api_keys;
  }

  async createApiKey(data: { provider: string; name: string; api_key: string }): Promise<{ id: string; provider: string; name: string; is_active: boolean; created_at: string; updated_at: string }> {
    return this.request('/api-keys', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateApiKey(id: string, data: { name?: string; api_key?: string; is_active?: boolean }): Promise<{ id: string; provider: string; name: string; is_active: boolean; created_at: string; updated_at: string; last_used_at?: string }> {
    return this.request(`/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteApiKey(id: string): Promise<void> {
    return this.request(`/api-keys/${id}`, { method: 'DELETE' });
  }

  async getApiKeyProviders(): Promise<Array<{ id: string; name: string; description: string }>> {
    const response = await this.request<{ providers: Array<{ id: string; name: string; description: string }> }>('/api-keys/providers');
    return response.providers;
  }

  async testApiKey(id: string): Promise<{ success: boolean; message: string; response_time_ms: number; model_used?: string }> {
    return this.request('/api-keys/' + id + '/test', { method: 'POST' });
  }

  async getAvailableModels(): Promise<Array<{ provider: string; model_identifier: string; pool_id: string; pool_description: string }>> {
    const response = await this.request<{ models: Array<{ provider: string; model_identifier: string; pool_id: string; pool_description: string }> }>('/api-keys/models');
    return response.models;
  }

  // Chat session endpoints
  async getChatSessions(): Promise<ChatSession[]> {
    const response = await this.request<{ sessions: ChatSession[] }>('/chat/sessions');
    return response.sessions;
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await this.request<{ session: ChatSession }>(`/chat/sessions/${sessionId}`);
    return response.session;
  }

  async createChatSession(input: CreateChatSessionInput): Promise<ChatSession> {
    const response = await this.request<{ session: ChatSession }>('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return response.session;
  }

  async updateChatSession(sessionId: string, input: UpdateChatSessionInput): Promise<ChatSession> {
    const response = await this.request<{ session: ChatSession }>(`/chat/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    });
    return response.session;
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    return this.request(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async addChatMessage(sessionId: string, role: ChatRole, content: string): Promise<ChatMessage> {
    const response = await this.request<{ message: ChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content })
    });
    return response.message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await this.request<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
    return response.messages;
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



