/**
 * API request/response types
 * Re-exports Ollama types and adds common API types
 */

// Re-export Ollama types for convenience
export type {
  OllamaMessage,
  OllamaOptions,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaModelInfo,
  OllamaListResponse,
  OllamaError
} from '@/types/ollama'

/**
 * Common API response wrapper
 */
export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string
  timeout?: number
}
