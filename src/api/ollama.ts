/**
 * Ollama API client implementation
 */

import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaListResponse,
  OllamaError
} from '@/types/ollama'

const OLLAMA_BASE_URL = '/api/ollama'

/**
 * Send a chat request to Ollama
 */
export async function sendChatRequest(request: OllamaChatRequest): Promise<OllamaChatResponse> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const errorData = await response.json() as OllamaError
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<OllamaChatResponse>
}

/**
 * List available models from Ollama
 */
export async function listModels(): Promise<OllamaListResponse> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
  
  if (!response.ok) {
    const errorData = await response.json() as OllamaError
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  return response.json() as Promise<OllamaListResponse>
}

/**
 * Check if Ollama server is reachable
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    return response.ok
  } catch {
    return false
  }
}
