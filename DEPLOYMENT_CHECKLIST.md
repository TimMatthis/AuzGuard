# AuzGuard Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Configuration
- [ ] Copy `env.example` to `.env`
- [ ] Set `DATABASE_URL` to your PostgreSQL connection string
- [ ] Generate secure `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Generate secure `HASH_SALT` (use: `openssl rand -base64 32`)
- [ ] Configure `OPENAI_API_KEY` if using OpenAI models
- [ ] Configure `GEMINI_API_KEY` if using Google AI models
- [ ] Set `OLLAMA_BASE_URL` if using local Ollama
- [ ] Set `DEFAULT_MODEL_POOL` to your preferred pool ID
- [ ] Set `MODEL_GARDEN_STUB_RESPONSES=false` for production
- [ ] Set `NODE_ENV=production` for production deployment

### 2. Database Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Or use migrations for production
npx prisma migrate deploy
```

### 3. Build Application
```bash
# Build backend TypeScript
npm run build:backend

# Install frontend dependencies
cd frontend
npm install

# Build frontend
npm run build

# Return to root
cd ..
```

### 4. Verify Build
- [ ] Check `dist/` folder exists with compiled JavaScript
- [ ] Check `frontend/dist/` folder exists with built assets
- [ ] Verify no TypeScript compilation errors
- [ ] Check all environment variables are set

## Deployment Options

### Option 1: Local/VM Deployment

```bash
# Start production server
npm start
```

Server will run on port specified in `PORT` env variable (default: 3001)

### Option 2: Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install --production
RUN cd frontend && npm install --production && cd ..

# Copy source code
COPY . .

# Build application
RUN npm run build:backend
RUN cd frontend && npm run build && cd ..

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: auzguard
      POSTGRES_USER: auzguard
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://auzguard:changeme@postgres:5432/auzguard
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - postgres

volumes:
  postgres_data:
```

```bash
# Build and run
docker-compose up -d
```

### Option 3: Cloud Deployment (AWS/Azure/GCP)

#### Prerequisites:
- Container registry (Docker Hub, ECR, ACR, GCR)
- Managed PostgreSQL instance
- Container orchestration (ECS, AKS, GKE, or K8s)

#### Steps:
1. Push Docker image to registry
2. Create managed PostgreSQL database
3. Configure environment variables in cloud platform
4. Deploy container with orchestration service
5. Configure load balancer/ingress
6. Set up SSL/TLS certificates

## Post-Deployment Verification

### 1. Health Checks
```bash
# Check server health
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-11T...",
  "version": "1.0.0"
}
```

### 2. Database Verification
```bash
# Connect to database
npx prisma studio

# Or use SQL client
psql $DATABASE_URL
```

Check that tables exist:
- `policies`
- `audit_log`
- `model_pools`
- `route_targets`
- `model_invocations`

### 3. Frontend Verification
- [ ] Navigate to http://localhost:3001 (or your domain)
- [ ] Verify landing page loads
- [ ] Login with different roles (viewer, developer, compliance, admin)
- [ ] Check dashboard loads
- [ ] Verify policies page works
- [ ] Test simulator functionality
- [ ] Check audit log displays

### 4. API Verification
```bash
# Get JWT token (in development mode)
# Login via UI and check localStorage for 'auzguard_token'

# Test API endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/policies

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/audit

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/routes/pools
```

## Security Checklist

### Production Security
- [ ] Use strong, unique secrets for `JWT_SECRET` and `HASH_SALT`
- [ ] Never commit `.env` file to version control
- [ ] Use HTTPS in production (configure reverse proxy/load balancer)
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS to restrict origins (update `src/server.ts`)
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Implement monitoring and alerting
- [ ] Review and harden network security groups/firewall rules

### Database Security
- [ ] Use strong database password
- [ ] Restrict database access to application only
- [ ] Enable SSL for database connections
- [ ] Regular backups configured
- [ ] Point-in-time recovery enabled (if available)

### Application Security
- [ ] API keys stored securely (use secrets manager in production)
- [ ] Audit logs enabled and monitored
- [ ] Input validation active
- [ ] Authentication required for all protected routes
- [ ] Role-based access control enforced

## Monitoring & Maintenance

### Metrics to Monitor
- API response times
- Error rates
- Database query performance
- Memory usage
- CPU usage
- Model invocation latency
- Audit log integrity

### Regular Maintenance
- [ ] Review audit logs weekly
- [ ] Check database size and plan scaling
- [ ] Update dependencies monthly
- [ ] Review access logs for suspicious activity
- [ ] Test backup restoration quarterly
- [ ] Review and update policies as needed

## Troubleshooting

### Common Issues

**Issue: Prisma client not generated**
```bash
# Solution
npx prisma generate
```

**Issue: Database connection fails**
```bash
# Check DATABASE_URL format:
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# Test connection
npx prisma db pull
```

**Issue: Frontend 404 errors**
```bash
# Ensure frontend is built
cd frontend && npm run build

# Check dist folder exists
ls frontend/dist/
```

**Issue: API 401 Unauthorized**
```bash
# Verify JWT_SECRET matches between server and token generation
# Check token expiration
# Ensure Authorization header format: "Bearer YOUR_TOKEN"
```

**Issue: Port already in use**
```bash
# Change PORT in .env
PORT=3002

# Or kill process on port (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or (Linux/Mac)
lsof -ti:3001 | xargs kill -9
```

## Rollback Plan

If deployment fails:

1. Stop application:
   ```bash
   # PM2
   pm2 stop auzguard
   
   # Docker
   docker-compose down
   
   # Manual
   pkill -f "node dist/server.js"
   ```

2. Restore previous version from git:
   ```bash
   git checkout <previous-tag>
   npm run build
   npm start
   ```

3. Database rollback (if using migrations):
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

## Success Criteria

Deployment is successful when:
- [ ] Server starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Database tables created successfully
- [ ] Frontend loads and renders correctly
- [ ] Users can login
- [ ] API endpoints respond correctly
- [ ] Policies can be viewed and edited
- [ ] Simulator executes evaluations
- [ ] Audit logs are being created
- [ ] Model invocations work (with configured providers)

## Support Contacts

- Technical Lead: [Your contact]
- DevOps Team: [Your contact]
- Database Admin: [Your contact]
- Security Team: [Your contact]

## Next Steps After Deployment

1. Monitor application for 24 hours
2. Review error logs
3. Check audit trail integrity
4. Verify backup schedule
5. Update documentation with production URLs
6. Train users on the system
7. Schedule regular review meetings

---

**Note**: This checklist should be customized based on your specific infrastructure and organizational requirements.

