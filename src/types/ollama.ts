/**
 * Ollama API types and interfaces
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: string[]  // Base64 encoded images (without data URI prefix)
}

export interface OllamaOptions {
  temperature?: number
  num_predict?: number  // maxTokens
  num_ctx?: number      // context window
  top_k?: number
  top_p?: number
}

export interface OllamaChatRequest {
  model: string
  messages: OllamaMessage[]
  format?: object       // JSON Schema for structured output
  stream?: boolean
  options?: OllamaOptions
}

export interface OllamaChatResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
    /** Thinking/reasoning content from models like DeepSeek-R1 */
    thinking?: string
  }
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

export interface OllamaModelInfo {
  name: string
  modified_at: string
  size: number
  digest: string
  details: {
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

export interface OllamaListResponse {
  models: OllamaModelInfo[]
}

export interface OllamaError {
  error: string
}
