/**
 * Structured Logger
 * 
 * Provides structured logging for agent execution tracking.
 * This is the foundation for observability (covered in Part 4).
 */

import type { AgentLogEntry, ExecutionContext, AgentExecutionResult } from './types.js';

/**
 * Logger interface
 */
export interface IStructuredLogger {
  /**
   * Log an agent execution
   */
  logExecution(entry: AgentLogEntry): Promise<void> | void;
  
  /**
   * Query execution logs
   */
  queryLogs(filters: {
    userId?: string;
    tenantId?: string;
    version?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<AgentLogEntry[]> | AgentLogEntry[];
}

/**
 * In-memory logger (for demo/testing)
 */
export class InMemoryLogger implements IStructuredLogger {
  private logs: AgentLogEntry[] = [];

  logExecution(entry: AgentLogEntry): void {
    this.logs.push(entry);
  }

  queryLogs(filters: {
    userId?: string;
    tenantId?: string;
    version?: string;
    startTime?: Date;
    endTime?: Date;
  }): AgentLogEntry[] {
    return this.logs.filter(log => {
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.tenantId && log.tenantId !== filters.tenantId) return false;
      if (filters.version && log.version !== filters.version) return false;
      if (filters.startTime && log.timestamp < filters.startTime) return false;
      if (filters.endTime && log.timestamp > filters.endTime) return false;
      return true;
    });
  }

  getAllLogs(): AgentLogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

/**
 * Console logger with structured output
 */
export class ConsoleStructuredLogger implements IStructuredLogger {
  logExecution(entry: AgentLogEntry): void {
    const logData = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      tenantId: entry.tenantId,
      version: entry.version,
      cost: entry.cost.amount,
      duration: entry.duration,
      inputLength: entry.input.length,
      outputLength: entry.output.length,
      error: entry.error,
    };

    if (entry.error) {
      console.error('[AGENT_EXECUTION_ERROR]', JSON.stringify(logData, null, 2));
    } else {
      console.log('[AGENT_EXECUTION]', JSON.stringify(logData, null, 2));
    }
  }

  queryLogs(): AgentLogEntry[] {
    console.warn('ConsoleStructuredLogger does not support querying logs');
    return [];
  }
}

/**
 * Helper to create log entry from execution
 */
export function createLogEntry(
  context: ExecutionContext,
  result: AgentExecutionResult,
  error?: Error
): AgentLogEntry {
  return {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: result.metadata.timestamp,
    userId: context.userId,
    tenantId: context.tenantId,
    version: result.version,
    input: context.input,
    output: result.output,
    cost: result.cost,
    duration: result.metadata.duration,
    error: error?.message,
    metadata: {
      ...context.context,
    },
  };
}
