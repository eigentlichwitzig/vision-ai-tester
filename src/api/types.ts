/**
 * API request/response types for the Vision AI Tester application
 */

import type { OllamaChatRequest, OllamaChatResponse, OllamaListResponse } from '@/types/ollama'

// Re-export Ollama types for convenience
export type { OllamaChatRequest, OllamaChatResponse, OllamaListResponse }

/**
 * Generic API error response
 */
export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
  success: boolean
}

/**
 * Ollama API endpoints
 */
export const OLLAMA_ENDPOINTS = {
  CHAT: '/api/chat',
  TAGS: '/api/tags',
  GENERATE: '/api/generate',
  SHOW: '/api/show'
} as const
