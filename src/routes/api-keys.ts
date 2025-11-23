// API key management routes - stores encrypted keys in main database
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth';
import { RouteService } from '../services/routes';
import { UserRole } from '../types';
import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'crypto';

interface ApiKeyRoutesOptions {
  authService: AuthService;
  prisma: PrismaClient;
  routeService: RouteService;
}

interface CreateApiKeyRequest {
  provider: string;
  name: string;
  api_key: string;
  models?: string[];
}

interface UpdateApiKeyRequest {
  name?: string;
  api_key?: string;
  is_active?: boolean;
  models?: string[];
}

const extractUser = (request: FastifyRequest) => request.user as { id: string; email: string; role: UserRole; tenant_slug?: string };

// Encryption utilities - API keys are stored encrypted (AES-256-GCM) in the database
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'your-32-character-encryption-key-here'; // Should be 32 chars
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function apiKeyRoutes(fastify: FastifyInstance, options: ApiKeyRoutesOptions) {
  const { prisma, authService, routeService } = options;

  const serializeModels = (list?: string[]): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
    if (list === undefined) return undefined;
    if (!Array.isArray(list) || list.length === 0) {
      return Prisma.JsonNull;
    }
    return list as Prisma.InputJsonValue;
  };

  // Auth middleware - requires authentication
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });

      const user = authService.getUserFromToken(token);
      request.user = user;
    } catch (e) {
      return reply.status(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
    }
  });

  // GET /api/api-keys - Get all API keys (encrypted keys are never returned)
  fastify.get('/api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const apiKeys = await prisma.apiKey.findMany({
        select: {
          id: true,
          provider: true,
          name: true,
          models: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          last_used_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      return reply.send({ api_keys: apiKeys });
    } catch (error: any) {
      console.error('Error fetching API keys:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch API keys' } });
    }
  });

  // GET /api/api-keys/:id - Get a specific API key (encrypted key is never returned)
  fastify.get('/api-keys/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { id } = request.params;

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id },
        select: {
          id: true,
          provider: true,
          name: true,
          models: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          last_used_at: true
        }
      });

      if (!apiKey) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
      }

      return reply.send({ api_key: apiKey });
    } catch (error: any) {
      console.error('Error fetching API key:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch API key' } });
    }
  });

  // POST /api/api-keys - Create a new API key
  fastify.post('/api-keys', async (request: FastifyRequest<{ Body: CreateApiKeyRequest }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { provider, name, api_key, models } = request.body;

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    if (!provider || !name || !api_key) {
      return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'Provider, name, and API key are required' } });
    }

    // Validate provider
    const validProviders = ['openai', 'gemini', 'ollama', 'azure_openai', 'gcp_vertex_ai'];
    if (!validProviders.includes(provider)) {
      return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: `Invalid provider. Must be one of: ${validProviders.join(', ')}` } });
    }

    try {
      // Encrypt the API key before storing (AES-256-GCM)
      const encryptedKey = encrypt(api_key);

      const serializedModels = serializeModels(models);
      const createData: any = {
        provider,
        name,
        encrypted_key: encryptedKey,
        is_active: true
      };
      if (serializedModels !== undefined) {
        createData.models = serializedModels;
      }

      const newApiKey = await prisma.apiKey.create({
        data: createData,
        select: {
          id: true,
          provider: true,
          name: true,
          models: true,
          is_active: true,
          created_at: true,
          updated_at: true
        }
      });

      return reply.status(201).send({ api_key: newApiKey });
    } catch (error: any) {
      console.error('Error creating API key:', error);

      if (error.code === 'P2002') {
        return reply.status(409).send({ error: { code: 'CONFLICT', message: 'An API key with this provider and name already exists' } });
      }

      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } });
    }
  });

  // PUT /api/api-keys/:id - Update an API key
  fastify.put('/api-keys/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: UpdateApiKeyRequest }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { id } = request.params;
    const { name, api_key, is_active, models } = request.body;

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    if (!name && api_key === undefined && is_active === undefined && models === undefined) {
      return reply.status(400).send({ error: { code: 'INVALID_INPUT', message: 'At least one field must be provided for update' } });
    }

    try {
      // Check if API key exists
      const existingKey = await prisma.apiKey.findUnique({ where: { id } });
      if (!existingKey) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
      }

      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (api_key !== undefined) updateData.encrypted_key = encrypt(api_key);
      const serializedModels = serializeModels(models);
      if (serializedModels !== undefined) {
        updateData.models = serializedModels;
      }

      const updatedApiKey = await prisma.apiKey.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          provider: true,
          name: true,
          models: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          last_used_at: true
        }
      });

      return reply.send({ api_key: updatedApiKey });
    } catch (error: any) {
      console.error('Error updating API key:', error);

      if (error.code === 'P2002') {
        return reply.status(409).send({ error: { code: 'CONFLICT', message: 'An API key with this provider and name already exists' } });
      }

      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update API key' } });
    }
  });

  // DELETE /api/api-keys/:id - Delete an API key
  fastify.delete('/api-keys/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { id } = request.params;

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      // Check if API key exists
      const existingKey = await prisma.apiKey.findUnique({ where: { id } });
      if (!existingKey) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
      }

      await prisma.apiKey.delete({ where: { id } });

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete API key' } });
    }
  });

  // POST /api/api-keys/:id/test - Test an API key
  fastify.post('/api-keys/:id/test', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = extractUser(request);
    const { id } = request.params;

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      // Get the API key from database
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { id }
      });

      if (!apiKeyRecord) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'API key not found' } });
      }

      if (!apiKeyRecord.is_active) {
        return reply.status(400).send({ error: { code: 'INVALID_STATE', message: 'API key is not active' } });
      }

      // Decrypt the key
      const apiKey = decrypt(apiKeyRecord.encrypted_key);

      // Test the key based on provider
      const testResult = await testApiKey(apiKeyRecord.provider, apiKey);

      // Update last_used_at
      await prisma.apiKey.update({
        where: { id },
        data: { last_used_at: new Date() }
      });

      return reply.send({
        success: testResult.success,
        message: testResult.message,
        response_time_ms: testResult.responseTimeMs,
        model_used: testResult.modelUsed
      });

    } catch (error: any) {
      console.error('Error testing API key:', error);
      return reply.status(500).send({
        error: {
          code: 'TEST_FAILED',
          message: error.message || 'Failed to test API key'
        }
      });
    }
  });

  // GET /api/api-keys/providers - Get available providers
  fastify.get('/api-keys/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    const providers = [
      { id: 'openai', name: 'OpenAI', description: 'GPT models from OpenAI' },
      { id: 'azure_openai', name: 'Azure OpenAI', description: 'OpenAI models hosted on Azure' },
      { id: 'gemini', name: 'Google Gemini', description: 'Gemini models from Google' },
      { id: 'gcp_vertex_ai', name: 'GCP Vertex AI', description: 'Google models on Vertex AI' },
      { id: 'ollama', name: 'Ollama', description: 'Local models via Ollama server' }
    ];

    return reply.send({ providers });
  });

  // GET /api/api-keys/models - Get available models from route targets
  fastify.get('/api-keys/models', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = extractUser(request);

    if (!authService.canPerformAction(user.role, 'manage_api_keys')) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    try {
      const pools = await routeService.getAllModelPools();
      const modelsMap = new Map<string, { provider: string; model_identifier: string; pool_id: string; pool_description: string }>();

      for (const pool of pools) {
        const targets = await routeService.getRouteTargetsForPool(pool.pool_id);
        for (const target of targets) {
          if (!target.is_active) continue;

          // Extract model identifier from profile
          const profile = target.profile as any;
          let modelIdentifier: string | undefined;

          if (profile?.capabilities && Array.isArray(profile.capabilities) && profile.capabilities.length > 0) {
            modelIdentifier = String(profile.capabilities[0]);
          } else if (profile?.tags?.default_model) {
            modelIdentifier = String(profile.tags.default_model);
          } else {
            modelIdentifier = target.endpoint || target.provider;
          }

          const key = `${target.provider}:${modelIdentifier}`;
          if (!modelsMap.has(key)) {
            modelsMap.set(key, {
              provider: target.provider,
              model_identifier: modelIdentifier,
              pool_id: pool.pool_id,
              pool_description: pool.description
            });
          }
        }
      }

      const models = Array.from(modelsMap.values()).sort((a, b) => {
        if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
        return a.model_identifier.localeCompare(b.model_identifier);
      });

      return reply.send({ models });
    } catch (error: any) {
      console.error('Error fetching available models:', error);
      return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch available models' } });
    }
  });
}

// Test API key function
interface TestResult {
  success: boolean;
  message: string;
  responseTimeMs: number;
  modelUsed?: string;
}

async function testApiKey(provider: string, apiKey: string): Promise<TestResult> {
  const start = Date.now();

  try {
    switch (provider) {
      case 'openai':
        return await testOpenAI(apiKey);
      case 'azure_openai':
        return await testOpenAI(apiKey); // Same as OpenAI for now
      case 'gemini':
      case 'gcp_vertex_ai':
        return await testGemini(apiKey);
      case 'ollama':
        return await testOllama(apiKey);
      default:
        return {
          success: false,
          message: `Unsupported provider: ${provider}`,
          responseTimeMs: Date.now() - start
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      responseTimeMs: Date.now() - start
    };
  }
}

async function testOpenAI(apiKey: string): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
        max_tokens: 10,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({ error: { message: 'Unknown error' } }))) as any;
      throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;
    const responseTime = Date.now() - start;

    return {
      success: true,
      message: `Successfully connected to OpenAI (${data.usage?.total_tokens || 0} tokens used)`,
      responseTimeMs: responseTime,
      modelUsed: data.model || 'gpt-3.5-turbo'
    };
  } catch (error: any) {
    throw new Error(`OpenAI test failed: ${error.message}`);
  }
}

async function testGemini(apiKey: string): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Say "Hello" in one word.' }]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10
        }
      })
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({ error: { message: 'Unknown error' } }))) as any;
      throw new Error(errorBody.error?.message || `HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;
    const responseTime = Date.now() - start;

    return {
      success: true,
      message: 'Successfully connected to Google Gemini',
      responseTimeMs: responseTime,
      modelUsed: 'gemini-pro'
    };
  } catch (error: any) {
    throw new Error(`Gemini test failed: ${error.message}`);
  }
}

async function testOllama(apiKey: string): Promise<TestResult> {
  const start = Date.now();
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama2', // Default model, might not exist
        messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
        stream: false,
        options: {
          temperature: 0,
          num_predict: 10
        }
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Ollama server not found. Make sure Ollama is running.');
      }
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = (await response.json()) as any;
    const responseTime = Date.now() - start;

    return {
      success: true,
      message: `Successfully connected to Ollama (${data.model || 'unknown model'})`,
      responseTimeMs: responseTime,
      modelUsed: data.model || 'llama2'
    };
  } catch (error: any) {
    throw new Error(`Ollama test failed: ${error.message}`);
  }
}
