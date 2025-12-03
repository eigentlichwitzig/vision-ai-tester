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
import type { ApiResponse, ApiError } from './types'
import { OLLAMA_ENDPOINTS } from './types'

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
