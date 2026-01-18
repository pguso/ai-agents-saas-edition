/**
 * Simple test to verify versioned agent system works
 * 
 * Run with: tsx examples/01-versioned-agent/test.ts
 */

import {
  AgentRegistry,
  VersionRouter,
  createAgentSystem,
  type AgentConfig,
} from '../../core/index.js';

function testVersionRegistry() {
  console.log('Testing Agent Registry...');
  
  const registry = new AgentRegistry();
  
  const config: AgentConfig = {
    version: 'v1.0',
    prompt: 'Test prompt',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  };
  
  registry.register(config);
  
  const retrieved = registry.get('v1.0');
  if (!retrieved || retrieved.version !== 'v1.0') {
    throw new Error('Registry test failed');
  }
  
  console.log('✅ Registry test passed');
}

function testVersionRouter() {
  console.log('Testing Version Router...');
  
  const registry = new AgentRegistry();
  const router = new VersionRouter(registry);
  
  // Register a version
  registry.register({
    version: 'v1.0',
    prompt: 'Test',
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
  });
  
  // Set global config
  router.setGlobalConfig({
    defaultVersion: 'v1.0',
    availableVersions: ['v1.0'],
  });
  
  // Test routing
  const version = router.resolveVersion({
    userId: 'test_user',
    input: 'test',
  });
  
  if (version !== 'v1.0') {
    throw new Error('Router test failed');
  }
  
  // Test pinning
  router.pinUser('test_user', 'v1.0');
  const pin = router.getUserPin('test_user');
  if (!pin || pin.version !== 'v1.0') {
    throw new Error('User pinning test failed');
  }
  
  console.log('✅ Router test passed');
}

function testConfigBuilder() {
  console.log('Testing Config Builder...');
  
  const builder = createAgentSystem();
  
  builder
    .registerAgent({
      version: 'v1.0',
      prompt: 'Test',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
    })
    .withGlobalDefaults({
      defaultVersion: 'v1.0',
      availableVersions: ['v1.0'],
    })
    .pinUser('user1', 'v1.0')
    .applyTenantOverrides('tenant1', {
      tenantId: 'tenant1',
      defaultVersion: 'v1.0',
    });
  
  const { registry } = builder.build();
  
  if (!registry.has('v1.0')) {
    throw new Error('Config builder test failed');
  }
  
  console.log('✅ Config builder test passed');
}

async function runTests() {
  console.log('Running tests...\n');
  
  try {
    testVersionRegistry();
    testVersionRouter();
    testConfigBuilder();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
