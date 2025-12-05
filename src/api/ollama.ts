/**
 * Ollama API client implementation using official ollama package
 * Handles communication with the local Ollama server
 */

import { Ollama } from 'ollama/browser'
import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaModelInfo
} from '@/types/ollama'
import type { ApiResponse, HealthError } from './types'

/**
 * Default timeout for health check requests (5 seconds)
 */
const HEALTH_CHECK_TIMEOUT_MS = 5000

/**
 * Get the Ollama base URL from environment or use default
 */
export function getOllamaBaseUrl(): string {
  return import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
}

/**
 * Create Ollama client instance
 */
function createOllamaClient(): Ollama {
  return new Ollama({ host: getOllamaBaseUrl() })
}

/**
 * Create an API error from an error
 */
function createApiError(error: unknown): { message: string; code: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'FETCH_ERROR'
    }
  }
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR'
  }
}

/**
 * Check if the Ollama server is reachable
 */
export async function checkOllamaConnection(): Promise<ApiResponse<boolean>> {
  try {
    const ollama = createOllamaClient()
    await ollama.list()
    return { data: true, error: null, success: true }
  } catch (error) {
    return {
      data: false,
      error: createApiError(error),
      success: false
    }
  }
}

/**
 * List available models from Ollama
 */
export async function listModels(): Promise<ApiResponse<OllamaModelInfo[]>> {
  try {
    const ollama = createOllamaClient()
    const response = await ollama.list()

    // Map the official package response to our types
    const models: OllamaModelInfo[] = response.models.map(model => ({
      name: model.name,
      // Handle both Date objects and string timestamps
      modified_at: model.modified_at instanceof Date
        ? model.modified_at.toISOString()
        : String(model.modified_at),
      size: model.size,
      digest: model.digest,
      details: {
        format: model.details.format,
        family: model.details.family,
        families: model.details.families || [],
        parameter_size: model.details.parameter_size,
        quantization_level: model.details.quantization_level
      }
    }))

    return { data: models, error: null, success: true }
  } catch (error) {
    return {
      data: null,
      error: createApiError(error),
      success: false
    }
  }
}

/**
 * Send a chat completion request to Ollama
 */
export async function chat(request: OllamaChatRequest): Promise<ApiResponse<OllamaChatResponse>> {
  try {
    const ollama = createOllamaClient()

    // Build the request for the official package
    const response = await ollama.chat({
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.images
      })),
      format: request.format, // Pass schema directly - the key fix!
      stream: false,
      options: request.options ? {
        temperature: request.options.temperature,
        num_predict: request.options.num_predict,
        num_ctx: request.options.num_ctx,
        top_k: request.options.top_k,
        top_p: request.options.top_p
      } : undefined,
      think: request.think
    })

    // Map response to our types
    const chatResponse: OllamaChatResponse = {
      model: response.model,
      // Handle both Date objects and string timestamps
      created_at: response.created_at instanceof Date
        ? response.created_at.toISOString()
        : String(response.created_at),
      message: {
        role: response.message.role,
        content: response.message.content,
        thinking: (response.message as { thinking?: string }).thinking
      },
      done: response.done,
      total_duration: response.total_duration,
      load_duration: response.load_duration,
      prompt_eval_count: response.prompt_eval_count,
      prompt_eval_duration: response.prompt_eval_duration,
      eval_count: response.eval_count,
      eval_duration: response.eval_duration
    }

    return { data: chatResponse, error: null, success: true }
  } catch (error) {
    return {
      data: null,
      error: createApiError(error),
      success: false
    }
  }
}

/**
 * Abort controller for cancelling requests
 */
let currentAbortController: AbortController | null = null

/**
 * Send a chat completion request with cancellation support
 */
export async function chatWithAbort(request: OllamaChatRequest): Promise<ApiResponse<OllamaChatResponse>> {
  // Cancel any existing request
  if (currentAbortController) {
    currentAbortController.abort()
  }

  currentAbortController = new AbortController()

  try {
    const ollama = createOllamaClient()

    // Debug logging for schema being sent
    if (import.meta.env.DEV && request.format) {
      console.log('📋 Schema being sent to Ollama:', JSON.stringify(request.format, null, 2))
    }

    // Build the request for the official package
    const response = await ollama.chat({
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        images: msg.images
      })),
      format: request.format, // Pass schema directly - the key fix!
      stream: false,
      options: request.options ? {
        temperature: request.options.temperature,
        num_predict: request.options.num_predict,
        num_ctx: request.options.num_ctx,
        top_k: request.options.top_k,
        top_p: request.options.top_p
      } : undefined,
      think: request.think
    })

    // Map response to our types
    const chatResponse: OllamaChatResponse = {
      model: response.model,
      // Handle both Date objects and string timestamps
      created_at: response.created_at instanceof Date
        ? response.created_at.toISOString()
        : String(response.created_at),
      message: {
        role: response.message.role,
        content: response.message.content,
        thinking: (response.message as { thinking?: string }).thinking
      },
      done: response.done,
      total_duration: response.total_duration,
      load_duration: response.load_duration,
      prompt_eval_count: response.prompt_eval_count,
      prompt_eval_duration: response.prompt_eval_duration,
      eval_count: response.eval_count,
      eval_duration: response.eval_duration
    }

    if (import.meta.env.DEV) {
      console.log('📡 Ollama API response:', {
        model: chatResponse.model,
        messageRole: chatResponse.message?.role,
        contentLength: chatResponse.message?.content?.length,
        thinkingLength: chatResponse.message?.thinking?.length,
        done: chatResponse.done,
        evalCount: chatResponse.eval_count
      })
    }

    return { data: chatResponse, error: null, success: true }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        data: null,
        error: { message: 'Request was cancelled', code: 'CANCELLED' },
        success: false
      }
    }
    return {
      data: null,
      error: createApiError(error),
      success: false
    }
  } finally {
    currentAbortController = null
  }
}

/**
 * Cancel the current in-flight request
 */
export function cancelCurrentRequest(): void {
  if (currentAbortController) {
    currentAbortController.abort()
    currentAbortController = null
  }
}

/**
 * Parse connection errors and provide troubleshooting guidance
 *
 * Note: Error detection relies on error types and names rather than messages
 * where possible, as messages can vary between browsers and versions.
 */
export function parseConnectionError(error: unknown): HealthError {
  // Timeout errors (AbortError from AbortSignal.timeout)
  // This is a reliable check based on error name, not message content
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      code: 'TIMEOUT',
      message: 'Connection timeout',
      guidance: [
        'Check if Ollama is responding (may be busy processing)',
        'Verify firewall settings allow localhost:11434',
        'Try restarting Ollama'
      ]
    }
  }

  // Network/fetch errors - TypeErrors from fetch API indicate network issues
  // In browsers, a TypeError is thrown when fetch cannot connect to the server
  // This covers connection refused, DNS failures, and network errors
  if (error instanceof TypeError) {
    // TypeErrors from fetch are almost always connection failures
    // Default to CONNECTION_REFUSED as it's the most common cause
    return {
      code: 'CONNECTION_REFUSED',
      message: 'Ollama server is not running',
      guidance: [
        'Start Ollama: Open Ollama app or run `ollama serve`',
        'Verify Ollama is running on localhost:11434',
        'Check if another application is using port 11434'
      ]
    }
  }

  // Check for response with status 0 (often CORS or network error)
  if (typeof error === 'object' && error !== null && 'status' in error && (error as { status: number }).status === 0) {
    return {
      code: 'CORS_ERROR',
      message: 'CORS configuration error',
      guidance: [
        'Set environment variable: OLLAMA_ORIGINS=*',
        'Windows: Add to System Environment Variables',
        'Mac/Linux: Add to ~/.ollama/config',
        'Restart Ollama after making changes'
      ]
    }
  }

  // Unknown error
  return {
    code: 'UNKNOWN',
    message: 'Failed to connect to Ollama',
    guidance: [
      'Verify Ollama is installed and running',
      'Check console for detailed error messages'
    ]
  }
}

/**
 * Health check response
 */
export interface HealthCheckResult {
  success: boolean
  status?: string
  error?: HealthError
}

/**
 * Ping Ollama server to check connectivity
 * Uses a short timeout to quickly determine if server is available
 */
export async function pingOllama(): Promise<HealthCheckResult> {
  try {
    const ollama = createOllamaClient()

    // Use Promise.race to implement timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error = new DOMException('Timeout', 'AbortError')
        reject(error)
      }, HEALTH_CHECK_TIMEOUT_MS)
    })

    await Promise.race([
      ollama.list(),
      timeoutPromise
    ])

    return {
      success: true,
      status: 'online'
    }
  } catch (error) {
    return {
      success: false,
      error: parseConnectionError(error)
    }
  }
}
