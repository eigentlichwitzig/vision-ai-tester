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
  cancelCurrentRequest
} from './ollama'

// Re-export API types
export type {
  ApiError,
  ApiResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaListResponse
} from './types'

export { OLLAMA_ENDPOINTS } from './types'
