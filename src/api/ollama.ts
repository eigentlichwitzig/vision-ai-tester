/**
 * Ollama API client implementation
 * Handles communication with the local Ollama server
 */

import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaListResponse,
  OllamaModelInfo
} from '@/types/ollama'
import type { ApiResponse, ApiError, HealthError, HealthErrorCode } from './types'
import { OLLAMA_ENDPOINTS } from './types'

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
 * Create an API error from a fetch error
 */
function createApiError(error: unknown): ApiError {
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
    const response = await fetch(`${getOllamaBaseUrl()}${OLLAMA_ENDPOINTS.TAGS}`)
    if (response.ok) {
      return { data: true, error: null, success: true }
    }
    return {
      data: false,
      error: { message: `Server responded with status ${response.status}`, code: 'CONNECTION_ERROR' },
      success: false
    }
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
    const response = await fetch(`${getOllamaBaseUrl()}${OLLAMA_ENDPOINTS.TAGS}`)
    
    if (!response.ok) {
      return {
        data: null,
        error: { message: `Failed to fetch models: ${response.statusText}`, code: 'FETCH_ERROR' },
        success: false
      }
    }

    const data: OllamaListResponse = await response.json()
    return { data: data.models, error: null, success: true }
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
    const response = await fetch(`${getOllamaBaseUrl()}${OLLAMA_ENDPOINTS.CHAT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: false // Always disable streaming for this client
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        data: null,
        error: { message: errorText || `Request failed: ${response.statusText}`, code: 'REQUEST_FAILED' },
        success: false
      }
    }

    const data: OllamaChatResponse = await response.json()
    return { data, error: null, success: true }
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
    const response = await fetch(`${getOllamaBaseUrl()}${OLLAMA_ENDPOINTS.CHAT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...request,
        stream: false
      }),
      signal: currentAbortController.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        data: null,
        error: { message: errorText || `Request failed: ${response.statusText}`, code: 'REQUEST_FAILED' },
        success: false
      }
    }

    const data: OllamaChatResponse = await response.json()
    console.log('📡 Ollama API response:', {
      model: data.model,
      messageRole: data.message?.role,
      contentLength: data.message?.content?.length,
      done: data.done,
      evalCount: data.eval_count
    })
    return { data, error: null, success: true }
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
    const response = await fetch(`${getOllamaBaseUrl()}${OLLAMA_ENDPOINTS.TAGS}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS)
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: `Ollama returned status ${response.status}`,
          guidance: [
            'Ollama server may be misconfigured',
            'Check Ollama logs for errors',
            'Try restarting Ollama'
          ]
        }
      }
    }
    
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
