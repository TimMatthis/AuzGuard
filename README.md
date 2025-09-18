# AuzGuard - Sovereign AI Gateway

AuzGuard is a comprehensive policy/routing MVP for regulated industries, providing compliance-by-default AI gateway functionality with immutable audit trails.

## Features

- **Policy Management**: Create, edit, and validate compliance policies with JSON schema validation
- **Rule Engine**: CEL-like expression evaluator for complex policy conditions
- **Request Simulator**: Test policies against sample requests with detailed evaluation traces
- **Immutable Audit Logging**: Tamper-proof audit trails with hash chain verification
- **Model Pool Routing**: Manage AI model pools and routing targets
- **Model Garden Connectors**: Policy-aware routing across OpenAI, Gemini, and Ollama connectors
- **Latency & Cost Analytics**: Capture per-invocation latency with dashboard summaries
- **Role-Based Access Control**: Admin, Compliance, Developer, and Viewer roles
- **Real-time Dashboard**: Monitor requests, block rates, and system health

## Architecture

### Backend (Node.js + TypeScript + Fastify)
- **Policy Service**: CRUD operations with JSON schema validation
- **Evaluation Service**: CEL-like rule evaluation engine
- **Audit Service**: Immutable logging with hash chain
- **Route Service**: Model pool and routing management
- **Auth Service**: JWT-based authentication and RBAC

### Frontend (React + TypeScript + Vite)
- **Modern SPA**: React with TypeScript and Tailwind CSS
- **State Management**: React Query for server state
- **Routing**: React Router for navigation
- **Components**: Reusable UI components with role-based access

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.example .env
   # Edit .env with your database and JWT settings
   ```

3. **Set up database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the backend**:
   ```bash
   npm run dev:backend
   ```

The API will be available at `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the frontend**:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

### Full Stack Development

From the root directory:
```bash
npm run dev
```

This starts both backend and frontend concurrently.

## API Endpoints

### Policy Management
- `GET /api/policies` - List all policies
- `POST /api/policies/import` - Import policy from JSON
- `GET /api/policies/:policyId` - Get specific policy
- `PUT /api/policies/:policyId` - Update policy
- `POST /api/policies/:policyId/validate` - Validate policy
- `POST /api/policies/:policyId/rules/:ruleId/test` - Test rule

### Evaluation & Simulation
- `POST /api/evaluate` - Evaluate policy against request
- `POST /api/evaluate/simulate` - Simulate evaluation (alias)

### Audit Logging
- `GET /api/audit` - Get audit logs with filtering
- `GET /api/audit/:id` - Get specific audit log entry
- `GET /api/audit/proof/latest` - Get latest Merkle proof
- `POST /api/audit/verify` - Verify audit log integrity

### Routes & Models
- `GET /api/routes/pools` - Get all model pools
- `POST /api/routes/pools` - Create model pool
- `PUT /api/routes/pools/:poolId` - Update model pool
- `GET /api/routes/targets` - Get all route targets
- `POST /api/routes/targets` - Create route target

### Overrides
- `POST /api/overrides/execute` - Execute policy override

## Demo Data

The system comes pre-loaded with Australian compliance rules:

- **HEALTH_NO_OFFSHORE**: Blocks health data processing outside AU
- **PRIV_APP8_CROSS_BORDER**: Requires override for cross-border personal data
- **CDR_DATA_SOVEREIGNTY**: Routes CDR data to Australian pools
- **AI_RISK_BIAS_AUDIT**: Routes high-risk AI to bias-audited models
- **SANDBOX_NO_PERSIST**: Routes sandbox requests to non-persistent pools

## User Roles

- **Viewer**: Read-only access to policies and audit logs
- **Developer**: Edit rules, run simulations, test policies
- **Compliance**: Publish rules, manage overrides, full audit access
- **Admin**: Full system access, manage routes and settings

## CEL-like Expression Language

The rule engine supports a subset of CEL (Common Expression Language):

- **Literals**: `true`, `false`, `"string"`, `123`
- **Operators**: `&&`, `||`, `!`, `==`, `!=`
- **Comparisons**: `>`, `<`, `>=`, `<=`
- **Functions**: `has('field')`, `in(array, value)`
- **Field Access**: `org_id`, `data_class`, `destination_region`

Example conditions:
```cel
data_class in ['health_record', 'medical_data'] && destination_region != 'AU'
personal_information == true && destination_region != 'AU'
environment in ['sandbox', 'testing', 'development']
```

## Security Features

- **Immutable Audit Logs**: Hash chain prevents tampering
- **Merkle Tree Proofs**: Cryptographic verification of log integrity
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Data Redaction**: Sensitive fields hashed before logging

## Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
npx prisma migrate dev
```

### Building for Production
```bash
npm run build
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For questions or issues, please open a GitHub issue or contact the development team.
