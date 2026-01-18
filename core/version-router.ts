/**
 * Version Router
 * 
 * Handles routing logic for agent versions:
 * - User version pinning
 * - Tenant-specific defaults
 * - Global defaults
 * - Rollback support
 */

import type {
  AgentVersion,
  UserId,
  TenantId,
  RoutingStrategy,
  ExecutionContext,
  UserVersionPin,
  TenantConfig,
  GlobalConfig,
} from './types.js';
import { AgentRegistry } from './agent-registry.js';

/**
 * Router for determining which agent version to use
 */
export class VersionRouter {
  private registry: AgentRegistry;
  private userPins: Map<UserId, UserVersionPin> = new Map();
  private tenantConfigs: Map<TenantId, TenantConfig> = new Map();
  private globalConfig: GlobalConfig | null = null;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Set global configuration
   */
  setGlobalConfig(config: GlobalConfig): void {
    this.globalConfig = config;
    
    // Ensure default version exists in registry
    if (!this.registry.has(config.defaultVersion)) {
      throw new Error(`Default version ${config.defaultVersion} not found in registry`);
    }
    
    // Set registry default
    this.registry.setDefaultVersion(config.defaultVersion);
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalConfig | null {
    return this.globalConfig;
  }

  /**
   * Pin a user to a specific version
   */
  pinUser(userId: UserId, version: AgentVersion, reason?: string): void {
    if (!this.registry.has(version)) {
      throw new Error(`Version ${version} not found in registry`);
    }
    
    this.userPins.set(userId, {
      userId,
      version,
      pinnedAt: new Date(),
      reason,
    });
  }

  /**
   * Unpin a user (they'll use default routing)
   */
  unpinUser(userId: UserId): boolean {
    return this.userPins.delete(userId);
  }

  /**
   * Get user's pinned version
   */
  getUserPin(userId: UserId): UserVersionPin | null {
    return this.userPins.get(userId) || null;
  }

  /**
   * Set tenant configuration
   */
  setTenantConfig(tenantId: TenantId, config: TenantConfig): void {
    this.tenantConfigs.set(tenantId, config);
    
    // Validate default version if provided
    if (config.defaultVersion && !this.registry.has(config.defaultVersion)) {
      throw new Error(`Tenant default version ${config.defaultVersion} not found in registry`);
    }
  }

  /**
   * Get tenant configuration
   */
  getTenantConfig(tenantId: TenantId): TenantConfig | null {
    return this.tenantConfigs.get(tenantId) || null;
  }

  /**
   * Resolve which version to use for a given execution context
   */
  resolveVersion(
    context: ExecutionContext,
    strategy?: RoutingStrategy
  ): AgentVersion {
    // Explicit version override (highest priority)
    if (context.version) {
      if (!this.registry.has(context.version)) {
        throw new Error(`Requested version ${context.version} not found in registry`);
      }
      return context.version;
    }

    // Use specified routing strategy or default to 'pin'
    const routingStrategy = strategy || 'pin';

    // Handle 'pin' strategy with fallthrough behavior
    if (routingStrategy === 'pin') {
      const userPin = this.userPins.get(context.userId);
      if (userPin) {
        return userPin.version;
      }
      // Fall through to tenant-default behavior
    }

    // Handle 'tenant-default' strategy with fallthrough behavior
    if (routingStrategy === 'pin' || routingStrategy === 'tenant-default') {
      if (context.tenantId) {
        const tenantConfig = this.tenantConfigs.get(context.tenantId);
        if (tenantConfig?.defaultVersion) {
          return tenantConfig.defaultVersion;
        }
      }
      // Fall through to global-default behavior
    }

    // Handle 'global-default' strategy with fallthrough behavior
    if (routingStrategy === 'pin' || routingStrategy === 'tenant-default' || routingStrategy === 'global-default') {
      if (this.globalConfig?.defaultVersion) {
        return this.globalConfig.defaultVersion;
      }
      // Fall through to latest behavior
    }

    // Handle 'latest' strategy (or fallback)
    if (routingStrategy === 'latest' || routingStrategy === 'pin' || routingStrategy === 'tenant-default' || routingStrategy === 'global-default') {
      const latest = this.registry.getLatestVersion();
      if (!latest) {
        throw new Error('No agent versions available in registry');
      }
      return latest;
    }

    throw new Error(`Unknown routing strategy: ${routingStrategy}`);
  }

  /**
   * Get all users pinned to a specific version (useful for rollback)
   */
  getUsersPinnedToVersion(version: AgentVersion): UserId[] {
    const users: UserId[] = [];
    for (const [userId, pin] of this.userPins.entries()) {
      if (pin.version === version) {
        users.push(userId);
      }
    }
    return users;
  }

  /**
   * Migrate all users from one version to another
   * (useful for gradual rollouts or rollbacks)
   */
  migrateUsers(fromVersion: AgentVersion, toVersion: AgentVersion): number {
    if (!this.registry.has(toVersion)) {
      throw new Error(`Target version ${toVersion} not found in registry`);
    }
    
    const users = this.getUsersPinnedToVersion(fromVersion);
    let migrated = 0;
    
    for (const userId of users) {
      this.pinUser(userId, toVersion, `Migrated from ${fromVersion}`);
      migrated++;
    }
    
    return migrated;
  }

  /**
   * Rollback: Pin all users of a version to a previous version
   */
  rollback(fromVersion: AgentVersion, toVersion: AgentVersion): number {
    return this.migrateUsers(fromVersion, toVersion);
  }
}
