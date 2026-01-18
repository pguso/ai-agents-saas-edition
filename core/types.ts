/**
 * Core types for versioned agent system
 * 
 * These types define the structure for managing agent versions,
 * multi-tenancy, and execution tracking.
 */

import { z } from 'zod';

/**
 * Agent version identifier (e.g., "v1.0", "v2.1", "latest")
 */
export type AgentVersion = string;

/**
 * User identifier
 */
export type UserId = string;

/**
 * Tenant identifier for multi-tenant SaaS
 */
export type TenantId = string;

/**
 * Model provider type
 */
export type ModelProvider = 'openai' | 'anthropic';

/**
 * LLM model identifier
 */
export type ModelId = string;

/**
 * Agent configuration for a specific version
 */
export interface AgentConfig {
  /** Version identifier */
  version: AgentVersion;
  
  /** System prompt for the agent */
  prompt: string;
  
  /** Model provider */
  provider: ModelProvider;
  
  /** Model identifier (e.g., "gpt-4", "claude-3-opus") */
  model: ModelId;
  
  /** Temperature setting (0-2) */
  temperature: number;
  
  /** Maximum tokens for response */
  maxTokens?: number;
  
  /** Additional model-specific parameters */
  parameters?: Record<string, unknown>;
  
  /** Metadata about this version */
  metadata?: {
    description?: string;
    createdAt?: Date;
    createdBy?: string;
    tags?: string[];
  };
}

/**
 * Execution context for agent invocation
 */
export interface ExecutionContext {
  /** User making the request */
  userId: UserId;
  
  /** Tenant/organization context */
  tenantId?: TenantId;
  
  /** Explicit version override (optional) */
  version?: AgentVersion;
  
  /** Request input */
  input: string;
  
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Cost tracking for agent execution
 */
export interface ExecutionCost {
  /** Cost in USD */
  amount: number;
  
  /** Input tokens used */
  inputTokens: number;
  
  /** Output tokens used */
  outputTokens: number;
  
  /** Model used */
  model: ModelId;
  
  /** Provider used */
  provider: ModelProvider;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  /** The agent's response */
  output: string;
  
  /** Version of agent that executed */
  version: AgentVersion;
  
  /** Execution cost */
  cost: ExecutionCost;
  
  /** Execution metadata */
  metadata: {
    /** Timestamp of execution */
    timestamp: Date;
    
    /** Execution duration in milliseconds */
    duration: number;
    
    /** Whether guardrails were triggered */
    guardrailsTriggered?: boolean;
    
    /** Any warnings during execution */
    warnings?: string[];
  };
  
  /** Raw response from LLM (for debugging) */
  rawResponse?: unknown;
}

/**
 * User version pinning configuration
 */
export interface UserVersionPin {
  /** User ID */
  userId: UserId;
  
  /** Pinned version */
  version: AgentVersion;
  
  /** When pin was created */
  pinnedAt: Date;
  
  /** Reason for pinning */
  reason?: string;
}

/**
 * Tenant-specific configuration overrides
 */
export interface TenantConfig {
  /** Tenant ID */
  tenantId: TenantId;
  
  /** Default version for this tenant */
  defaultVersion?: AgentVersion;
  
  /** Tenant-specific prompt overrides */
  promptOverrides?: Partial<Pick<AgentConfig, 'temperature' | 'maxTokens' | 'model'>>;
  
  /** Cost limits per tenant */
  costLimits?: {
    daily?: number;
    monthly?: number;
  };
  
  /** Feature flags */
  features?: Record<string, boolean>;
}

/**
 * Global configuration defaults
 */
export interface GlobalConfig {
  /** Default agent version */
  defaultVersion: AgentVersion;
  
  /** Available versions */
  availableVersions: AgentVersion[];
  
  /** Global cost limits */
  globalCostLimits?: {
    daily?: number;
    monthly?: number;
  };
}

/**
 * Version routing strategy
 */
export type RoutingStrategy = 
  | 'pin'           // Pin user to specific version
  | 'latest'        // Always use latest version
  | 'tenant-default' // Use tenant's default version
  | 'global-default'; // Use global default version

/**
 * Execution request with routing options
 */
export interface ExecuteRequest {
  /** Execution context */
  context: ExecutionContext;
  
  /** Routing strategy */
  routingStrategy?: RoutingStrategy;
  
  /** Force specific version (overrides routing) */
  forceVersion?: AgentVersion;
}

/**
 * Structured log entry for agent execution
 */
export interface AgentLogEntry {
  /** Log entry ID */
  id: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** User ID */
  userId: UserId;
  
  /** Tenant ID */
  tenantId?: TenantId;
  
  /** Agent version used */
  version: AgentVersion;
  
  /** Input provided */
  input: string;
  
  /** Output generated */
  output: string;
  
  /** Cost information */
  cost: ExecutionCost;
  
  /** Execution duration */
  duration: number;
  
  /** Any errors */
  error?: string;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Zod schemas for validation
 */
export const AgentVersionSchema = z.string().min(1);
export const UserIdSchema = z.string().min(1);
export const TenantIdSchema = z.string().min(1);

export const AgentConfigSchema = z.object({
  version: AgentVersionSchema,
  prompt: z.string().min(1),
  provider: z.enum(['openai', 'anthropic']),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().positive().optional(),
  parameters: z.record(z.unknown()).optional(),
  metadata: z.object({
    description: z.string().optional(),
    createdAt: z.date().optional(),
    createdBy: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export const ExecutionContextSchema = z.object({
  userId: UserIdSchema,
  tenantId: TenantIdSchema.optional(),
  version: AgentVersionSchema.optional(),
  input: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});
