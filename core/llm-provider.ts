/**
 * LLM Provider Abstraction
 * 
 * Provides a unified interface for different LLM providers
 * (OpenAI, Anthropic, etc.)
 */

import type { AgentConfig, ExecutionCost, ModelProvider } from './types.js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Result from LLM provider
 */
export interface LLMResult {
  /** Generated text */
  text: string;
  
  /** Cost information */
  cost: ExecutionCost;
  
  /** Raw response for debugging */
  rawResponse: unknown;
}

/**
 * Abstract LLM provider interface
 */
export interface ILLMProvider {
  /**
   * Execute a completion request
   */
  complete(config: AgentConfig, input: string): Promise<LLMResult>;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async complete(config: AgentConfig, input: string): Promise<LLMResult> {
    if (config.provider !== 'openai') {
      throw new Error('OpenAIProvider can only handle OpenAI models');
    }

    const response = await this.client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: config.prompt },
        { role: 'user', content: input },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      ...config.parameters,
    });

    const output = response.choices[0]?.message?.content || '';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    // Approximate cost calculation (prices as of 2024)
    // These should be updated based on current pricing
    const costPerToken = this.getCostPerToken(config.model, inputTokens, outputTokens);
    const cost: ExecutionCost = {
      amount: costPerToken,
      inputTokens,
      outputTokens,
      model: config.model,
      provider: 'openai',
    };

    return {
      text: output,
      cost,
      rawResponse: response,
    };
  }

  private getCostPerToken(model: string, inputTokens: number, outputTokens: number): number {
    // Approximate pricing (update with current rates)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.00003, output: 0.00006 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
      'gpt-3.5-turbo': { input: 0.0000015, output: 0.000002 },
    };

    const rates = pricing[model] || pricing['gpt-3.5-turbo'];
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(config: AgentConfig, input: string): Promise<LLMResult> {
    if (config.provider !== 'anthropic') {
      throw new Error('AnthropicProvider can only handle Anthropic models');
    }

    const response = await this.client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 1024,
      temperature: config.temperature,
      system: config.prompt,
      messages: [
        { role: 'user', content: input },
      ],
      ...config.parameters as Record<string, unknown>,
    });

    const output = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // Approximate cost calculation
    const costPerToken = this.getCostPerToken(config.model, inputTokens, outputTokens);
    const cost: ExecutionCost = {
      amount: costPerToken,
      inputTokens,
      outputTokens,
      model: config.model,
      provider: 'anthropic',
    };

    return {
      text: output,
      cost,
      rawResponse: response,
    };
  }

  private getCostPerToken(model: string, inputTokens: number, outputTokens: number): number {
    // Approximate pricing (update with current rates)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus': { input: 0.000015, output: 0.000075 },
      'claude-3-sonnet': { input: 0.000003, output: 0.000015 },
      'claude-3-haiku': { input: 0.00000025, output: 0.00000125 },
    };

    const rates = pricing[model] || pricing['claude-3-sonnet'];
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }
}

/**
 * Provider factory
 */
export class LLMProviderFactory {
  static create(provider: ModelProvider, apiKey?: string): ILLMProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'anthropic':
        return new AnthropicProvider(apiKey);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
