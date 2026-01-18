/**
 * Agent Version Registry
 * 
 * Manages agent configurations across versions.
 * Provides version lookup, registration, and rollback capabilities.
 */

import type { AgentConfig, AgentVersion } from './types.js';
import { AgentConfigSchema } from './types.js';

/**
 * Registry for managing agent versions
 */
export class AgentRegistry {
  private configs: Map<AgentVersion, AgentConfig> = new Map();
  private defaultVersion: AgentVersion | null = null;

  /**
   * Register a new agent version
   */
  register(config: AgentConfig): void {
    // Validate configuration
    AgentConfigSchema.parse(config);
    
    // Store configuration
    this.configs.set(config.version, config);
    
    // Set as default if it's the first version or explicitly marked
    if (!this.defaultVersion) {
      this.defaultVersion = config.version;
    }
  }

  /**
   * Get agent configuration for a specific version
   */
  get(version: AgentVersion): AgentConfig | null {
    return this.configs.get(version) || null;
  }

  /**
   * Get all registered versions
   */
  getVersions(): AgentVersion[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Check if a version exists
   */
  has(version: AgentVersion): boolean {
    return this.configs.has(version);
  }

  /**
   * Set the default version
   */
  setDefaultVersion(version: AgentVersion): void {
    if (!this.configs.has(version)) {
      throw new Error(`Version ${version} not found in registry`);
    }
    this.defaultVersion = version;
  }

  /**
   * Get the default version
   */
  getDefaultVersion(): AgentVersion | null {
    return this.defaultVersion;
  }

  /**
   * Get the latest version (highest semantic version or most recent)
   */
  getLatestVersion(): AgentVersion | null {
    const versions = this.getVersions();
    if (versions.length === 0) return null;
    
    // Try to parse as semantic versions
    const semanticVersions = versions
      .map(v => {
        const match = v.match(/^v?(\d+)\.(\d+)(?:\.(\d+))?/);
        if (match) {
          return {
            version: v,
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3] || '0', 10),
          };
        }
        return null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => {
        if (a.major !== b.major) return b.major - a.major;
        if (a.minor !== b.minor) return b.minor - a.minor;
        return b.patch - a.patch;
      });
    
    if (semanticVersions.length > 0) {
      return semanticVersions[0].version;
    }
    
    // Fallback: return default or first version
    return this.defaultVersion || versions[0];
  }

  /**
   * Remove a version (for rollback scenarios)
   */
  remove(version: AgentVersion): boolean {
    if (this.defaultVersion === version) {
      throw new Error(`Cannot remove default version ${version}. Set a new default first.`);
    }
    return this.configs.delete(version);
  }

  /**
   * List all registered configurations
   */
  list(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Clear all versions (use with caution)
   */
  clear(): void {
    this.configs.clear();
    this.defaultVersion = null;
  }
}
