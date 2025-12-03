/**
 * Unified API client
 * Central export point for all API functionality
 */

// Re-export Ollama API functions
export {
  getOllamaBaseUrl,
  checkOllamaConnection,
  listModels,
  chat,
  chatWithAbort,
  cancelCurrentRequest,
  pingOllama,
  parseConnectionError
} from './ollama'

// Re-export health check result type
export type { HealthCheckResult } from './ollama'

// Re-export API types
export type {
  ApiError,
  ApiResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaListResponse,
  HealthError,
  HealthErrorCode
} from './types'

export { OLLAMA_ENDPOINTS } from './types'
