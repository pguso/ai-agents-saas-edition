/**
 * Configuration Builder
 * 
 * Helper for building multi-tenant configurations with
 * proper override hierarchy: Global → Tenant → User
 */

import type { AgentConfig, TenantConfig, GlobalConfig } from './types.js';
import { AgentRegistry } from './agent-registry.js';
import { VersionRouter } from './version-router.js';

/**
 * Builder for configuring the agent system
 */
export class ConfigBuilder {
  private registry: AgentRegistry;
  private router: VersionRouter;

  constructor(registry: AgentRegistry, router: VersionRouter) {
    this.registry = registry;
    this.router = router;
  }

  /**
   * Set up global defaults
   */
  withGlobalDefaults(config: GlobalConfig): this {
    this.router.setGlobalConfig(config);
    return this;
  }

  /**
   * Register an agent version
   */
  registerAgent(config: AgentConfig): this {
    this.registry.register(config);
    return this;
  }

  /**
   * Apply tenant-specific overrides
   */
  applyTenantOverrides(tenantId: string, config: TenantConfig): this {
    this.router.setTenantConfig(tenantId, config);
    return this;
  }

  /**
   * Pin a user to a specific version
   */
  pinUser(userId: string, version: string, reason?: string): this {
    this.router.pinUser(userId, version, reason);
    return this;
  }

  /**
   * Build and return the configured system
   */
  build(): {
    registry: AgentRegistry;
    router: VersionRouter;
  } {
    return {
      registry: this.registry,
      router: this.router,
    };
  }
}

/**
 * Factory function for creating a configured system
 */
export function createAgentSystem() {
  const registry = new AgentRegistry();
  const router = new VersionRouter(registry);
  return new ConfigBuilder(registry, router);
}
