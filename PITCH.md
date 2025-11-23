# AuzGuard Pitch — Sovereign AI Gateway for Regulated Industries

## 1. The Problem
- Regulated enterprises can’t safely plug generative AI into business workflows because they need provable compliance, data residency controls, and transparent routing.
- Current LLM gateways are US-centric black boxes: no immutable audit trail, no notion of “keep this workload on-prem in AU”, and no way to prove who changed a policy.
- Compliance teams, developers, and risk officers work in silos, forcing slow spreadsheets and manual approvals before any AI experiment can see production.

## 2. Our Solution
AuzGuard is a sovereign-by-default AI gateway. It lets organisations author policy-as-code, simulate decisions, and route traffic across approved model pools with full auditability and onshore residency guarantees.

• **Policy Workbench:** CEL-like rules, versioning, validation, and what-if simulator so compliance can iterate safely.  
• **Routing Orchestrator:** Define pools (on-prem, sovereign cloud, sandbox) and assign routing profiles to user groups. Residency defaults and overrides are enforced automatically.  
• **Immutable Audit Ledger:** Every decision is hashed, chained, and Merkle-proofed; auditors can verify the log without trusting us.  
• **Developer UX:** React/Vite console with live simulator, chat playground, model scoring visualisations, and API key management.  
• **Multi-Tenant Ready:** Tenant provisioning service, tenant-branded UI, per-tenant databases, and product-access guardrails.

## 3. Why We Win
1. **Sovereignty baked in:** Residency + on-prem routing are first class, not add-ons.  
2. **Transparency:** Immutable audit plus request replay make regulators comfortable.  
3. **Speed:** Simulator + chat playground shorten policy review loops from weeks to hours.  
4. **Extensibility:** Fastify + Prisma backend, React frontend, open schema—customers can self-host or extend with their own connectors.  
5. **Ready for production:** JWT auth, RBAC, API-first design, and a real seeding story for demo orgs.

## 4. How It Works (Architecture Snapshot)
| Layer | What Happens | Value |
|-------|---------------|-------|
| **Frontend (React/Vite)** | Simulator, chat router, routing config, audit explorer | Gives compliance + dev teams a shared workspace |
| **API (Fastify)** | Policies, evaluation, routing, audit, tenants, branding, API keys | Modular services, easy to extend |
| **Rule Engine** | CEL-ish evaluator inside `EvaluationService` | Deterministic, explainable decisions |
| **Routing Service** | Model pools, scoring, residency enforcement | Picks the right model per policy outcome |
| **Audit Service** | Hash-chain + Merkle proofs | Regulators can verify logs independently |
| **Prisma/Postgres** | Policies, routes, tenants, audit, invocations | Single source of truth, multi-tenant ready |

## 5. Traction & Use Cases
- **Financial services sandbox:** Route Consumer Data Right workloads only to AU-hosted pools.  
- **Health provider:** Block PHI from leaving the country; auditors can replay any decision.  
- **Government agency:** Multi-tenant deployment for agencies sharing the same platform with delegated admin.  
- **Enterprise innovation teams:** Run guarded experiments with the simulator and graduate them to production routing profiles.

## 6. Business Model
- **SaaS:** Per-tenant base fee + metered decision volume.  
- **Enterprise license:** Self-hosted with premium support/SOCs.  
- **Marketplace:** Curated model pools / connectors that meet AU sovereignty requirements.

## 7. Call to Action
Ready to prove responsible AI at production speed?  
- **Schedule a live demo:** We’ll show the simulator, routing planner, and audit proofs in under 30 minutes.  
- **Pilot deployment:** Deploy to your sovereign cloud or data centre in a week—bring your policies, we’ll import them.  
- **Partner with us:** Systems integrators and hyperscalers looking for an AU-compliant AI control plane can embed AuzGuard today.

> AuzGuard — Ship AI with confidence, backed by policy control, sovereign routing, and immutable evidence.


