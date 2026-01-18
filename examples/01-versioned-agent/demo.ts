/**
 * Demo: Versioned Agent System
 * 
 * Demonstrates:
 * - Agent version registration
 * - User version pinning
 * - Version routing strategies
 * - Rollback scenarios
 * - Multi-tenant configuration
 */

import 'dotenv/config';
import {
  AgentRegistry,
  VersionRouter,
  AgentExecutor,
  createAgentSystem,
  type AgentConfig,
  type ExecutionContext,
} from '../../core/index.js';

/**
 * Example: Setting up a versioned agent system
 */
async function setupAgentSystem() {
  console.log('Setting up versioned agent system...\n');

  // Create the system
  const builder = createAgentSystem();

  // Register multiple agent versions
  const v1Config: AgentConfig = {
    version: 'v1.0',
    prompt: 'You are a helpful assistant. Be concise and professional.',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 500,
    metadata: {
      description: 'Initial version - conservative and cost-effective',
      createdAt: new Date('2024-01-01'),
      tags: ['stable', 'cost-effective'],
    },
  };

  const v2Config: AgentConfig = {
    version: 'v2.0',
    prompt: 'You are an expert assistant. Provide detailed, comprehensive answers with examples.',
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.8,
    maxTokens: 1000,
    metadata: {
      description: 'Enhanced version - more detailed responses',
      createdAt: new Date('2024-02-01'),
      tags: ['enhanced', 'detailed'],
    },
  };

  const v2_1Config: AgentConfig = {
    version: 'v2.1',
    prompt: 'You are an expert assistant. Provide detailed, comprehensive answers with examples. Always cite sources when possible.',
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.8,
    maxTokens: 1000,
    metadata: {
      description: 'v2.0 with source citation requirement',
      createdAt: new Date('2024-02-15'),
      tags: ['enhanced', 'detailed', 'citations'],
    },
  };

  // Register versions
  builder
    .registerAgent(v1Config)
    .registerAgent(v2Config)
    .registerAgent(v2_1Config)
    .withGlobalDefaults({
      defaultVersion: 'v1.0',
      availableVersions: ['v1.0', 'v2.0', 'v2.1'],
    });

  // Configure tenants
  builder.applyTenantOverrides('tenant_acme', {
    tenantId: 'tenant_acme',
    defaultVersion: 'v2.0',
    costLimits: {
      daily: 100,
      monthly: 2000,
    },
  });

  builder.applyTenantOverrides('tenant_startup', {
    tenantId: 'tenant_startup',
    defaultVersion: 'v1.0', // Cost-conscious startup
    costLimits: {
      daily: 10,
      monthly: 200,
    },
  });

  const { registry, router } = builder.build();

  console.log('System configured with versions:', registry.getVersions());
  console.log('  Default version:', router.getGlobalConfig()?.defaultVersion);
  console.log('');

  return { registry, router };
}

/**
 * Example: User version pinning
 */
function demonstrateUserPinning(router: VersionRouter) {
  console.log('Demonstrating user version pinning...\n');

  // Pin some users to specific versions
  router.pinUser('user_alice', 'v2.1', 'Early adopter - testing new features');
  router.pinUser('user_bob', 'v1.0', 'Prefers stable version');
  router.pinUser('user_charlie', 'v2.0', 'Beta tester');

  console.log('Pinned users:');
  console.log('  - user_alice → v2.1 (early adopter)');
  console.log('  - user_bob → v1.0 (stable)');
  console.log('  - user_charlie → v2.0 (beta)');
  console.log('');

  // Show how routing works
  const testContexts: ExecutionContext[] = [
    { userId: 'user_alice', input: 'Test query' },
    { userId: 'user_bob', input: 'Test query' },
    { userId: 'user_charlie', input: 'Test query' },
    { userId: 'user_new', input: 'Test query' }, // Not pinned
  ];

  console.log('Version routing results:');
  for (const context of testContexts) {
    const version = router.resolveVersion(context);
    const pin = router.getUserPin(context.userId);
    console.log(`  ${context.userId}: ${version} ${pin ? '(pinned)' : '(default)'}`);
  }
  console.log('');
}

/**
 * Example: Multi-tenant routing
 */
function demonstrateMultiTenantRouting(router: VersionRouter) {
  console.log('Demonstrating multi-tenant routing...\n');

  const testContexts: ExecutionContext[] = [
    { userId: 'user_1', tenantId: 'tenant_acme', input: 'Test query' },
    { userId: 'user_2', tenantId: 'tenant_startup', input: 'Test query' },
    { userId: 'user_3', tenantId: 'tenant_unknown', input: 'Test query' },
  ];

  console.log('Tenant-based routing:');
  for (const context of testContexts) {
    const version = router.resolveVersion(context, 'tenant-default');
    const tenantConfig = context.tenantId ? router.getTenantConfig(context.tenantId) : null;
    console.log(`  ${context.userId} (${context.tenantId || 'no tenant'}): ${version}`);
    if (tenantConfig?.defaultVersion) {
      console.log(`    → Tenant default: ${tenantConfig.defaultVersion}`);
    }
  }
  console.log('');
}

/**
 * Example: Rollback scenario
 */
function demonstrateRollback(router: VersionRouter) {
  console.log('Demonstrating rollback scenario...\n');

  // Simulate: v2.1 has a bug, need to rollback users
  console.log('Scenario: v2.1 has a critical bug, rolling back users...');
  
  const usersBefore = router.getUsersPinnedToVersion('v2.1');
  console.log(`  Users on v2.1 before rollback: ${usersBefore.length}`);
  
  // Rollback all v2.1 users to v2.0
  const migrated = router.rollback('v2.1', 'v2.0');
  console.log(`  Rolled back ${migrated} users from v2.1 → v2.0`);
  
  const usersAfter = router.getUsersPinnedToVersion('v2.1');
  console.log(`  Users on v2.1 after rollback: ${usersAfter.length}`);
  console.log('');
}

/**
 * Example: Version migration (gradual rollout)
 */
function demonstrateMigration(router: VersionRouter) {
  console.log('Demonstrating gradual migration...\n');

  // Pin a few users to new version for testing
  router.pinUser('user_test1', 'v2.1', 'Migration test');
  router.pinUser('user_test2', 'v2.1', 'Migration test');
  
  console.log('Gradual migration strategy:');
  console.log('  1. Test with small group (2 users)');
  console.log('  2. Monitor performance and costs');
  console.log('  3. Gradually migrate more users');
  console.log('  4. Full rollout when stable');
  console.log('');
  
  // Simulate gradual migration
  const usersOnV1 = router.getUsersPinnedToVersion('v1.0');
  console.log(`  Users on v1.0: ${usersOnV1.length}`);
  console.log(`  Users on v2.1: ${router.getUsersPinnedToVersion('v2.1').length}`);
  console.log('');
}

/**
 * Example: Execution (real LLM calls when API keys are available)
 */
async function demonstrateExecution(registry: AgentRegistry, router: VersionRouter) {
  console.log('Demonstrating agent execution...\n');

  // Check for API keys
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  
  if (!hasOpenAIKey && !hasAnthropicKey) {
    console.log('   No API keys found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env file');
    console.log('   Showing execution structure without actual LLM calls:\n');
    
    const contexts: ExecutionContext[] = [
      {
        userId: 'user_alice',
        tenantId: 'tenant_acme',
        input: 'What is the capital of France?',
      },
      {
        userId: 'user_bob',
        input: 'Explain quantum computing in simple terms.',
      },
    ];

    for (const context of contexts) {
      const version = router.resolveVersion(context);
      const config = registry.get(version);
      
      console.log(`  User: ${context.userId}`);
      console.log(`  Version: ${version}`);
      console.log(`  Model: ${config?.model} (${config?.provider})`);
      console.log(`  Input: "${context.input}"`);
      console.log(`  → Would execute with ${config?.provider} API\n`);
    }
    return;
  }

  // We have API keys - execute real LLM calls
  console.log('API keys detected. Executing real LLM calls...\n');
  
  const executor = new AgentExecutor(registry, router);
  
  const contexts: ExecutionContext[] = [
    {
      userId: 'user_alice',
      tenantId: 'tenant_acme',
      input: 'What is the capital of France? Answer in one sentence.',
    },
    {
      userId: 'user_bob',
      input: 'Explain quantum computing in 2-3 sentences.',
    },
  ];

  for (const context of contexts) {
    const version = router.resolveVersion(context);
    const config = registry.get(version);
    
    console.log(`\n  User: ${context.userId}`);
    console.log(`  Version: ${version}`);
    console.log(`  Model: ${config?.model} (${config?.provider})`);
    console.log(`  Input: "${context.input}"`);
    console.log(`  Executing...`);
    
    try {
      const result = await executor.execute({
        context,
      });
      
      console.log(`  Response: ${result.output.trim()}`);
      console.log(`  Cost: $${result.cost.amount.toFixed(6)}`);
      console.log(`  Tokens: ${result.cost.inputTokens} in + ${result.cost.outputTokens} out`);
      console.log(`  Duration: ${result.metadata.duration}ms`);
    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log('');
}

/**
 * Main demo function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Versioned Agent System - Part 1 Demo');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Setup
    const { registry, router } = await setupAgentSystem();

    // Demonstrate features
    demonstrateUserPinning(router);
    demonstrateMultiTenantRouting(router);
    demonstrateRollback(router);
    demonstrateMigration(router);
    await demonstrateExecution(registry, router);

    console.log('═══════════════════════════════════════════════════════');
    console.log('  Demo completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('Key takeaways:');
    console.log('  • Users can be pinned to specific versions');
    console.log('  • Tenants can have default versions');
    console.log('  • Rollback is instant and safe');
    console.log('  • Gradual migrations are supported');
    console.log('  • Version routing is explicit and traceable');
    console.log('');
    
    console.log('Next steps:');
    console.log('  • Set OPENAI_API_KEY or ANTHROPIC_API_KEY to test real execution');
    console.log('  • See Part 2 for guardrails and cost controls');
    console.log('  • See Part 3 for monitoring and observability');
    console.log('');

  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run demo
main();
