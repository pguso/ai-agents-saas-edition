/**
 * Agent Executor
 * 
 * Executes agent requests using the version router and LLM providers.
 * Handles execution, cost tracking, and basic logging.
 */

import type {
  AgentConfig,
  ExecutionContext,
  AgentExecutionResult,
  ExecuteRequest,
} from './types.js';
import { AgentRegistry } from './agent-registry.js';
import { VersionRouter } from './version-router.js';
import { ILLMProvider, LLMProviderFactory } from './llm-provider.js';
import { IStructuredLogger, ConsoleStructuredLogger, createLogEntry } from './logger.js';

/**
 * Logger interface for structured logging
 */
export interface ILogger {
  log(entry: {
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
  }): void;
}

/**
 * Simple console logger implementation
 */
export class ConsoleLogger implements ILogger {
  log(entry: {
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
  }): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    
    if (entry.data) {
      console.log(`${prefix} ${entry.message}`, entry.data);
    } else {
      console.log(`${prefix} ${entry.message}`);
    }
  }
}

/**
 * Agent executor that handles version routing and execution
 */
export class AgentExecutor {
  private registry: AgentRegistry;
  private router: VersionRouter;
  private logger: ILogger;
  private structuredLogger: IStructuredLogger;
  private providers: Map<string, ILLMProvider> = new Map();

  constructor(
    registry: AgentRegistry,
    router: VersionRouter,
    logger?: ILogger,
    structuredLogger?: IStructuredLogger
  ) {
    this.registry = registry;
    this.router = router;
    this.logger = logger || new ConsoleLogger();
    this.structuredLogger = structuredLogger || new ConsoleStructuredLogger();
  }

  /**
   * Execute an agent request
   */
  async execute(request: ExecuteRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const { context, routingStrategy, forceVersion } = request;

    try {
      // Resolve version
      const version = forceVersion || this.router.resolveVersion(context, routingStrategy);
      
      this.logger.log({
        level: 'info',
        message: `Executing agent request`,
        data: {
          userId: context.userId,
          tenantId: context.tenantId,
          version,
          routingStrategy: routingStrategy || 'pin',
        },
      });

      // Get agent configuration
      const config = this.registry.get(version);
      if (!config) {
        throw new Error(`Agent version ${version} not found`);
      }

      // Get or create provider
      const providerKey = `${config.provider}-${config.model}`;
      if (!this.providers.has(providerKey)) {
        this.providers.set(
          providerKey,
          LLMProviderFactory.create(config.provider)
        );
      }
      const provider = this.providers.get(providerKey)!;

      // Apply tenant-specific overrides if applicable
      const finalConfig = this.applyTenantOverrides(config, context);

      // Execute LLM request
      const llmResult = await provider.complete(finalConfig, context.input);

      const duration = Date.now() - startTime;

      // Build result
      const result: AgentExecutionResult = {
        output: llmResult.text,
        version,
        cost: llmResult.cost,
        metadata: {
          timestamp: new Date(),
          duration,
        },
        rawResponse: llmResult.rawResponse,
      };

      // Log execution
      this.logger.log({
        level: 'info',
        message: `Agent execution completed`,
        data: {
          userId: context.userId,
          tenantId: context.tenantId,
          version,
          cost: result.cost.amount,
          duration,
          inputTokens: result.cost.inputTokens,
          outputTokens: result.cost.outputTokens,
        },
      });

      // Structured logging for observability
      const logEntry = createLogEntry(context, result);
      this.structuredLogger.logExecution(logEntry);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.log({
        level: 'error',
        message: `Agent execution failed`,
        data: {
          userId: context.userId,
          tenantId: context.tenantId,
          duration,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      // Log error in structured format
      const errorResult: AgentExecutionResult = {
        output: '',
        version: 'unknown',
        cost: {
          amount: 0,
          inputTokens: 0,
          outputTokens: 0,
          model: 'unknown',
          provider: 'openai',
        },
        metadata: {
          timestamp: new Date(),
          duration,
        },
      };
      const errorLogEntry = createLogEntry(context, errorResult, error as Error);
      this.structuredLogger.logExecution(errorLogEntry);

      throw error;
    }
  }

  /**
   * Apply tenant-specific configuration overrides
   */
  private applyTenantOverrides(
    config: AgentConfig,
    context: ExecutionContext
  ): AgentConfig {
    if (!context.tenantId) {
      return config;
    }

    const tenantConfig = this.router.getTenantConfig(context.tenantId);
    if (!tenantConfig?.promptOverrides) {
      return config;
    }

    return {
      ...config,
      ...tenantConfig.promptOverrides,
    };
  }

  /**
   * Get execution statistics (for monitoring)
   */
  getStats(): {
    totalExecutions: number;
    totalCost: number;
    averageDuration: number;
  } {
    // This would typically come from a metrics store
    // For now, return placeholder
    return {
      totalExecutions: 0,
      totalCost: 0,
      averageDuration: 0,
    };
  }
}
