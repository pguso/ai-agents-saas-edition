# Example 1: Versioned Agent System

This example demonstrates the core concepts from **Part 1: The Lifecycle Problem**.

## What This Demonstrates

1. **Agent Version Registration** - Register multiple versions of your agent
2. **User Version Pinning** - Pin users to specific versions
3. **Version Routing** - Automatic routing based on user/tenant/default
4. **Rollback Scenarios** - Quickly rollback users when issues occur
5. **Multi-Tenant Configuration** - Different tenants can have different defaults

## Documentation

For a detailed step-by-step explanation of the code, see [CODE.md](./CODE.md). It walks through each part of the demo, explaining what each function does and why it matters.

## Running the Demo

```bash
# Install dependencies first
npm install

# From project root
npm run demo:01

# Or directly
tsx examples/01-versioned-agent/demo.ts

# Run tests
tsx examples/01-versioned-agent/test.ts
```

## Environment Variables

For actual LLM execution, create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Then edit .env and add your API key:
OPENAI_API_KEY=sk-your-key-here
# or
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The demo will:
- Execute real LLM calls when API keys are found
- Show execution structure (without calls) when no API keys are set

**Note:** The `.env` file is gitignored for security.

## Key Concepts

### Version Pinning

Users can be pinned to specific versions, ensuring they don't get unexpected changes:

```typescript
router.pinUser('user_alice', 'v2.1', 'Early adopter');
```

### Multi-Tenant Routing

Different tenants can have different default versions:

```typescript
router.setTenantConfig('tenant_acme', {
  tenantId: 'tenant_acme',
  defaultVersion: 'v2.0',
  costLimits: { daily: 100 }
});
```

### Rollback

When a version has issues, rollback is instant:

```typescript
router.rollback('v2.1', 'v2.0'); // Migrates all v2.1 users to v2.0
```

## Architecture

```
User Request
    ↓
Version Router (resolves version)
    ↓
Agent Registry (gets config)
    ↓
Agent Executor (executes with LLM)
    ↓
Result (with version, cost, metadata)
```

## What's Next

- **Part 2**: Guardrails layer (cost limits, output validation)
- **Part 3**: Monitoring and observability (structured logging, metrics)
