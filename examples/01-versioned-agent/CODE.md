# Code Walkthrough: Versioned Agent Demo

This document explains the demo code step by step, showing how the versioned agent system works.

## Overview

The demo demonstrates a production-ready agent system where:
- Multiple versions of an agent can exist simultaneously
- Users can be pinned to specific versions
- Different tenants can have different defaults
- Rollbacks are instant and safe
- Real LLM calls are made when API keys are available

## Step 1: Imports and Setup

```typescript
import 'dotenv/config';
import {
  AgentRegistry,
  VersionRouter,
  AgentExecutor,
  createAgentSystem,
  type AgentConfig,
  type ExecutionContext,
} from '../../core/index.js';
```

**What this does:**
- Loads environment variables from `.env` file (for API keys)
- Imports the core components needed for the demo
- `AgentRegistry` stores agent configurations
- `VersionRouter` handles version selection logic
- `AgentExecutor` runs the actual LLM calls
- `createAgentSystem` is a helper to set everything up

## Step 2: Setting Up the System

The `setupAgentSystem()` function creates and configures the agent system.

### Creating Agent Versions

Three different agent versions are defined:

**Version 1.0** - Basic, cost-effective:
- Uses GPT-3.5-turbo (cheaper model)
- Short, concise responses (max 500 tokens)
- Conservative temperature (0.7)

**Version 2.0** - Enhanced:
- Uses GPT-4 (more capable model)
- Longer, detailed responses (max 1000 tokens)
- Higher temperature (0.8) for more creative responses

**Version 2.1** - Enhanced with citations:
- Same as v2.0 but requires source citations
- Latest version with new feature

Each version has:
- A unique version identifier
- A system prompt (instructions for the AI)
- Model and provider settings
- Metadata (description, creation date, tags)

### Registering Versions

```typescript
builder
  .registerAgent(v1Config)
  .registerAgent(v2Config)
  .registerAgent(v2_1Config)
  .withGlobalDefaults({
    defaultVersion: 'v1.0',
    availableVersions: ['v1.0', 'v2.0', 'v2.1'],
  });
```

**What this does:**
- Registers all three versions in the system
- Sets v1.0 as the global default (new users get this)
- Lists all available versions

### Configuring Tenants

```typescript
builder.applyTenantOverrides('tenant_acme', {
  tenantId: 'tenant_acme',
  defaultVersion: 'v2.0',
  costLimits: { daily: 100, monthly: 2000 },
});
```

**What this does:**
- Sets tenant-specific defaults
- `tenant_acme` gets v2.0 by default (they want the enhanced version)
- `tenant_startup` gets v1.0 by default (cost-conscious)
- Each tenant can have different cost limits

### Building the System

```typescript
const { registry, router } = builder.build();
```

**What this does:**
- Finalizes the configuration
- Returns the registry (stores agent configs) and router (handles version selection)
- These are used throughout the demo

## Step 3: User Version Pinning

The `demonstrateUserPinning()` function shows how users can be pinned to specific versions.

```typescript
router.pinUser('user_alice', 'v2.1', 'Early adopter - testing new features');
router.pinUser('user_bob', 'v1.0', 'Prefers stable version');
router.pinUser('user_charlie', 'v2.0', 'Beta tester');
```

**What this does:**
- Pins users to specific versions
- `user_alice` always gets v2.1 (testing new features)
- `user_bob` always gets v1.0 (wants stability)
- `user_charlie` gets v2.0 (beta testing)

**Why this matters:**
- Users don't get unexpected changes
- You can test new versions with specific users
- Easy to rollback if something breaks

### Testing Routing

```typescript
const version = router.resolveVersion(context);
```

**What this does:**
- Determines which version to use for a user
- Checks in order: user pin → tenant default → global default → latest
- Returns the version identifier

## Step 4: Multi-Tenant Routing

The `demonstrateMultiTenantRouting()` function shows tenant-based defaults.

```typescript
const version = router.resolveVersion(context, 'tenant-default');
```

**What this does:**
- Uses tenant-specific routing strategy
- Users from `tenant_acme` get v2.0 (their default)
- Users from `tenant_startup` get v1.0 (their default)
- Users from unknown tenants get global default (v1.0)

**Why this matters:**
- Different customers can have different agent behaviors
- Enterprise customers might want enhanced features
- Startups might prefer cost-effective options

## Step 5: Rollback Scenario

The `demonstrateRollback()` function shows how to rollback when something breaks.

```typescript
const migrated = router.rollback('v2.1', 'v2.0');
```

**What this does:**
- Finds all users on v2.1
- Moves them to v2.0
- Returns the number of users migrated

**Why this matters:**
- If a new version has a bug, you can instantly rollback
- No need to redeploy or restart services
- Users are automatically moved to a safe version

## Step 6: Gradual Migration

The `demonstrateMigration()` function shows how to gradually roll out new versions.

```typescript
router.pinUser('user_test1', 'v2.1', 'Migration test');
router.pinUser('user_test2', 'v2.1', 'Migration test');
```

**What this does:**
- Pins a small group to the new version
- Allows testing before full rollout
- Can monitor performance and costs

**Migration Strategy:**
1. Test with small group (2 users)
2. Monitor performance and costs
3. Gradually migrate more users
4. Full rollout when stable

## Step 7: Agent Execution

The `demonstrateExecution()` function shows how to actually run agent requests.

### Checking for API Keys

```typescript
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
```

**What this does:**
- Checks if API keys are available
- If no keys: shows what would happen (structure only)
- If keys exist: makes real LLM calls

### Without API Keys

```typescript
const version = router.resolveVersion(context);
const config = registry.get(version);
```

**What this does:**
- Resolves which version to use
- Gets the agent configuration
- Shows what model and provider would be used
- Doesn't make actual API calls

### With API Keys

```typescript
const executor = new AgentExecutor(registry, router);
const result = await executor.execute({ context });
```

**What this does:**
1. Creates an executor (handles LLM calls)
2. Resolves the version for the user
3. Gets the agent configuration
4. Makes the actual LLM API call
5. Returns the response with cost and metadata

**Result includes:**
- `output`: The AI's response text
- `cost`: How much the call cost (in USD)
- `inputTokens`: Tokens used for the input
- `outputTokens`: Tokens used for the output
- `duration`: How long it took (in milliseconds)
- `version`: Which agent version was used

**Why this matters:**
- You can see actual costs per request
- Track which version is being used
- Monitor performance (duration)
- Debug issues by knowing exact version and config

## Step 8: Main Function

The `main()` function orchestrates everything:

```typescript
async function main() {
  const { registry, router } = await setupAgentSystem();
  demonstrateUserPinning(router);
  demonstrateMultiTenantRouting(router);
  demonstrateRollback(router);
  demonstrateMigration(router);
  await demonstrateExecution(registry, router);
}
```

**What this does:**
1. Sets up the system (registers versions, configures tenants)
2. Demonstrates user pinning
3. Demonstrates multi-tenant routing
4. Demonstrates rollback
5. Demonstrates migration
6. Demonstrates execution (with or without API keys)

## Key Concepts

### Version Resolution Order

When a user makes a request, the system checks in this order:

1. **Explicit version** (if specified in request) - highest priority
2. **User pin** (if user is pinned to a version)
3. **Tenant default** (if user belongs to a tenant)
4. **Global default** (system-wide default)
5. **Latest version** (most recent version)

### Why Versioning Matters

**Without versioning:**
- Changing a prompt affects all users immediately
- No way to rollback if something breaks
- Can't test changes safely
- Hard to debug which version caused issues

**With versioning:**
- Users stay on their assigned version
- Can test new versions with specific users
- Instant rollback if needed
- Clear tracking of which version was used

### Multi-Tenancy

Different tenants (customers) can have:
- Different default versions
- Different cost limits
- Different feature flags
- Different prompt overrides

This allows customization per customer without code changes.

## How It All Works Together

1. **User makes a request** with their user ID and input
2. **Router resolves version** based on user pin, tenant, or default
3. **Registry provides config** for that version (prompt, model, etc.)
4. **Executor makes LLM call** using the resolved configuration
5. **Result is returned** with response, cost, and metadata
6. **Logger records** the execution for debugging

This creates a system where:
- Versions are explicit and traceable
- Changes are safe and reversible
- Different users can have different experiences
- Costs and performance are tracked
- Rollbacks are instant

## Next Steps

After understanding this demo, you can:
- Add guardrails (cost limits, output validation) - Part 2 (Coming Soon)
- Add monitoring and observability - Part 3 (Coming Soon)
- Implement/Use A/B testing frameworks
- Build cost optimization strategies
- Create/Use eval systems for testing
