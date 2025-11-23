# Chat Router & Simulator Test Plan

## Overview
This document outlines the testing strategy for the Chat Router and Simulator functionality in AuzGuard.

## Components to Test

### 1. **Chat Playground (Frontend)**
- **Location**: `frontend/src/pages/ChatPlayground.tsx`
- **Purpose**: Interactive UI for testing routing decisions with chat-like interface
- **Key Features**:
  - Policy selection
  - Context JSON editor
  - Message input
  - Conversation history
  - Routing result display
  - Policy comparison

### 2. **Simulator (Frontend)**
- **Location**: `frontend/src/pages/Simulator.tsx`
- **Purpose**: Test policy evaluation without actual model invocation
- **Key Features**:
  - Dry-run policy evaluation
  - Rule matching visualization
  - Decision preview

### 3. **Routing Execution (Backend)**
- **Location**: `src/routes/routes.ts` - `/api/routes/execute`
- **Purpose**: Execute full routing pipeline with model invocation
- **Flow**:
  1. Authenticate user
  2. Enrich request payload (PII detection, etc.)
  3. Evaluate policy rules
  4. Select model pool based on policy decision
  5. Apply routing preferences (data residency, etc.)
  6. Select target from pool
  7. Initialize tenant-specific API keys
  8. Invoke model
  9. Return response with audit trail

### 4. **Simulation (Backend)**
- **Location**: `src/routes/evaluation.ts` - `/api/evaluate/simulate`
- **Purpose**: Evaluate policy without model invocation
- **Flow**:
  1. Enrich request payload
  2. Evaluate policy rules
  3. Return decision (ALLOW/DENY/ROUTE/etc.)
  4. No actual model invocation

## Test Scenarios

### Scenario 1: Basic Chat Routing
**Test**: Send a simple message through the router
```json
{
  "policy_id": "AuzGuard_AU_Base_v1",
  "request": {
    "message": "What is the weather today?",
    "data_class": "general",
    "environment": "production"
  },
  "org_id": "demo-org",
  "actor_id": "user-123"
}
```
**Expected**:
- ✅ Policy evaluation succeeds
- ✅ Decision: ALLOW or ROUTE
- ✅ Model pool selected
- ✅ Target selected from pool
- ✅ Model invoked (or stub response if no API key)
- ✅ Response returned with latency metrics

### Scenario 2: CDR Data with Residency Requirements
**Test**: Send CDR data requiring AU onshore processing
```json
{
  "policy_id": "AuzGuard_AU_Base_v1",
  "request": {
    "message": "Analyze this customer data",
    "data_class": "cdr_data",
    "environment": "production",
    "destination_region": "AU"
  }
}
```
**Expected**:
- ✅ Policy matches CDR rule
- ✅ Residency requirement: AU_ONSHORE
- ✅ Only AU targets selected
- ✅ Model invoked in AU region

### Scenario 3: Simulation (No Model Invocation)
**Test**: Simulate policy evaluation
```json
{
  "policy_id": "AuzGuard_AU_Base_v1",
  "request": {
    "message": "Test message",
    "data_class": "pii_data"
  }
}
```
**Expected**:
- ✅ Policy evaluated
- ✅ Decision returned
- ✅ Matched rule identified
- ✅ NO model invocation
- ✅ Fast response (<50ms)

### Scenario 4: Tenant-Specific API Keys
**Test**: Execute routing with tenant-specific OpenAI key
**Prerequisites**:
- Tenant logged in
- API key configured for tenant
**Expected**:
- ✅ Tenant context extracted from JWT
- ✅ Tenant API keys loaded
- ✅ Model invoked with tenant key
- ✅ API key `last_used_at` updated

### Scenario 5: Fallback to Environment Variables
**Test**: Execute routing without tenant API keys
**Expected**:
- ✅ Falls back to environment variable API keys
- ✅ Model invoked successfully
- ✅ Warning logged about missing tenant keys

### Scenario 6: Policy Comparison
**Test**: Compare two policies with same input
**Expected**:
- ✅ Both policies evaluated
- ✅ Differences highlighted
- ✅ Side-by-side comparison shown

## Current Implementation Status

### ✅ Working Components
1. **Policy Evaluation**: Evaluates rules and returns decisions
2. **Routing Decision**: Selects pools and targets based on preferences
3. **Model Garden**: Invokes models with proper connectors
4. **Audit Logging**: Records decisions (with graceful fallback)
5. **Preprocessing**: Enriches payloads with PII detection
6. **Chat Session Management**: CRUD operations for chat sessions
7. **Tenant API Keys**: Encrypted storage and retrieval

### ⚠️ Potential Issues to Verify

1. **Tenant Context in Routing**
   - Line 320-342 in `routes.ts`: Tenant API key initialization
   - **Risk**: If JWT doesn't have `tenant_slug`, falls back to env vars
   - **Test**: Verify both paths work

2. **Chat Sessions Table**
   - Requires `chat_sessions` and `chat_messages` tables
   - **Risk**: May not exist in tenant databases
   - **Test**: Create session and verify storage

3. **Model Invocation Persistence**
   - Line 344-357 in `routes.ts`: Model invocation
   - **Risk**: If `model_invocations` table missing, should gracefully degrade
   - **Test**: Verify response even if DB write fails

4. **Stub Responses**
   - When no API keys configured
   - **Test**: Verify stub responses work

## Manual Testing Steps

### Step 1: Test Simulator (No Model Invocation)
1. Navigate to `/simulator`
2. Select policy "AuzGuard_AU_Base_v1"
3. Enter test payload:
   ```json
   {
     "message": "Test message",
     "data_class": "general"
   }
   ```
4. Click "Run Simulation"
5. **Verify**: Decision shown, no model invocation

### Step 2: Test Chat Playground (With Model Invocation)
1. Navigate to `/chat-playground`
2. Select policy
3. Enter message: "What is AI?"
4. Click "Send & Route"
5. **Verify**: 
   - Decision shown
   - Model invoked
   - Response displayed
   - Latency metrics shown

### Step 3: Test with API Key
1. Navigate to `/api-keys`
2. Add OpenAI API key
3. Return to `/chat-playground`
4. Send message
5. **Verify**: Real OpenAI response (not stub)

### Step 4: Test Chat Sessions
1. Navigate to `/chat` (if exists)
2. Create new session
3. Send messages
4. **Verify**: Messages persist
5. Refresh page
6. **Verify**: Session restored

## API Endpoints Reference

### Execute Routing
```http
POST /api/routes/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "policy_id": "AuzGuard_AU_Base_v1",
  "request": {
    "message": "Hello",
    "data_class": "general"
  },
  "org_id": "demo-org",
  "actor_id": "user-123"
}
```

### Simulate Policy
```http
POST /api/evaluate/simulate
Authorization: Bearer <token>
Content-Type: application/json

{
  "policy_id": "AuzGuard_AU_Base_v1",
  "request": {
    "message": "Hello",
    "data_class": "general"
  }
}
```

### Chat Sessions
```http
# List sessions
GET /api/chat/sessions
Authorization: Bearer <token>

# Create session
POST /api/chat/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Chat",
  "policy_id": "AuzGuard_AU_Base_v1"
}

# Add message
POST /api/chat/sessions/:sessionId/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "user",
  "content": "Hello"
}
```

## Success Criteria

✅ **Simulator**:
- Evaluates policies without model invocation
- Returns decisions in <100ms
- Shows matched rules

✅ **Chat Playground**:
- Sends messages through router
- Displays responses
- Shows routing decisions
- Handles errors gracefully

✅ **Routing Execution**:
- Evaluates policies
- Selects appropriate pools/targets
- Invokes models (or stubs)
- Returns responses with metrics
- Logs audit trail

✅ **Chat Sessions**:
- Creates and lists sessions
- Stores messages
- Retrieves conversation history

✅ **Tenant API Keys**:
- Uses tenant-specific keys when available
- Falls back to env vars when needed
- Updates last_used_at timestamp

## Next Steps

1. ✅ **Verify Backend Compiles** - DONE
2. 🔄 **Test Simulator** - Navigate to `/simulator` and run test
3. 🔄 **Test Chat Playground** - Navigate to `/chat-playground` and send message
4. 🔄 **Test with API Key** - Add key and verify real responses
5. 🔄 **Test Chat Sessions** - Create session and verify persistence
6. 📝 **Document Results** - Update this file with test results


