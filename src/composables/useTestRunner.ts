/**
 * Composable for executing test pipelines
 * Manages multimodal pipeline execution, state, and error handling
 */

import { ref } from 'vue'
import { chatWithAbort, cancelCurrentRequest } from '@/api'
import { useConfigStore } from '@/stores/configStore'
import { useTestStore } from '@/stores/testStore'
import { useSchemaStore } from '@/stores/schemaStore'
import type { 
  TestRun, 
  TestInput, 
  TestOutput,
  FileUploadData 
} from '@/types/models'
import type { OllamaChatRequest, OllamaMessage } from '@/types/ollama'

/**
 * Parameters for direct multimodal pipeline execution
 */
export interface DirectPipelineParams {
  /** File data with base64 content */
  file: FileUploadData
  /** Model name to use (e.g., 'qwen2.5vl:7b') */
  model?: string
  /** System prompt */
  systemPrompt?: string
  /** User prompt */
  userPrompt?: string
  /** Temperature (0 for deterministic output) */
  temperature?: number
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Context window size */
  numCtx?: number
  /** JSON schema for structured output */
  schema?: object
}

/**
 * Error codes for pipeline execution failures
 */
export type PipelineErrorCode = 
  | 'SERVER_UNREACHABLE'
  | 'MODEL_NOT_AVAILABLE'
  | 'INVALID_RESPONSE'
  | 'JSON_PARSE_ERROR'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'NETWORK_TIMEOUT'
  | 'REQUEST_CANCELLED'
  | 'MISSING_FILE'
  | 'MISSING_SCHEMA'
  | 'UNKNOWN_ERROR'

/**
 * Pipeline execution error with categorized code
 */
export interface PipelineError {
  code: PipelineErrorCode
  message: string
  details?: string
}

/**
 * Strip base64 data URI prefix from image content
 * Handles formats like: data:image/png;base64, data:application/pdf;base64,
 * @param base64 - Base64 string potentially with data URI prefix
 * @returns Raw base64 content without prefix
 */
export function stripBase64Prefix(base64: string): string {
  // Match data URI format: data:[<mediatype>][;base64],<data>
  const match = base64.match(/^data:[^;]+;base64,(.+)$/)
  if (match) {
    return match[1]
  }
  // Already stripped or invalid format - return as-is
  return base64
}

/**
 * Parse JSON from model response, handling potential markdown code blocks
 * @param content - Raw response content from model
 * @returns Parsed JSON object
 * @throws Error if JSON parsing fails
 */
function parseJsonFromResponse(content: string): object {
  // First try direct parsing
  try {
    return JSON.parse(content)
  } catch {
    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim())
    }
    
    // Try finding JSON object boundaries
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // Nothing worked, throw the original parse error
    throw new Error(`Failed to parse JSON from response: ${content.substring(0, 100)}...`)
  }
}

/**
 * Categorize error for user-friendly display
 */
function categorizeError(error: unknown): PipelineError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Network/connection errors
    if (message.includes('fetch') || message.includes('network') || message.includes('econnrefused')) {
      return {
        code: 'SERVER_UNREACHABLE',
        message: 'Cannot connect to Ollama server. Make sure Ollama is running.',
        details: error.message
      }
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        code: 'NETWORK_TIMEOUT',
        message: 'Request timed out. The model may be loading or the request was too large.',
        details: error.message
      }
    }
    
    // Model not found
    if (message.includes('model') && (message.includes('not found') || message.includes('not available'))) {
      return {
        code: 'MODEL_NOT_AVAILABLE',
        message: 'The selected model is not available. Please check if the model is installed.',
        details: error.message
      }
    }
    
    // JSON parsing errors
    if (message.includes('json') || message.includes('parse')) {
      return {
        code: 'JSON_PARSE_ERROR',
        message: 'Failed to parse model response as JSON.',
        details: error.message
      }
    }
    
    // Request cancelled
    if (message.includes('cancel')) {
      return {
        code: 'REQUEST_CANCELLED',
        message: 'Request was cancelled.',
        details: error.message
      }
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error.stack
    }
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    details: String(error)
  }
}

/**
 * Composable for test pipeline execution
 * Provides state management and execution logic for direct multimodal pipeline
 */
export function useTestRunner() {
  // Execution state
  const isRunning = ref(false)
  const error = ref<string | null>(null)
  const progress = ref<string>('')

  /**
   * Execute the direct multimodal pipeline
   * Sends image directly to vision model with JSON schema for structured extraction
   * 
   * @param params - Pipeline execution parameters
   * @returns Completed TestRun object
   * @throws PipelineError if execution fails
   */
  async function runDirectPipeline(params: DirectPipelineParams): Promise<TestRun> {
    const configStore = useConfigStore()
    const testStore = useTestStore()
    const schemaStore = useSchemaStore()

    // Validate required inputs
    if (!params.file) {
      throw {
        code: 'MISSING_FILE',
        message: 'No file provided for extraction.',
        details: 'Please upload a file before running the pipeline.'
      } as PipelineError
    }

    // Get configuration with fallbacks
    const model = params.model ?? configStore.selectedModel
    const systemPrompt = params.systemPrompt ?? configStore.systemPrompt
    const userPrompt = params.userPrompt ?? configStore.userPrompt
    const temperature = params.temperature ?? configStore.temperature
    const maxTokens = params.maxTokens ?? configStore.maxTokens
    const numCtx = params.numCtx ?? configStore.numCtx
    const schema = params.schema ?? schemaStore.activeSchema?.schema

    // Reset state
    error.value = null
    isRunning.value = true
    progress.value = 'Preparing request...'

    // Create test input from file data
    // Note: base64Content is intentionally empty to avoid storing large file content in test history.
    // The original file can be re-uploaded if needed. This saves memory and IndexedDB storage.
    const testInput: TestInput = {
      fileName: params.file.fileName,
      fileType: params.file.fileType,
      mimeType: params.file.mimeType,
      size: params.file.size,
      base64Content: '',
      thumbnail: params.file.thumbnail
    }

    // Create test run record
    const testRun = testStore.createTestRun({
      modelName: model,
      pipeline: 'direct-multimodal',
      parameters: {
        temperature,
        maxTokens,
        numCtx,
        systemPrompt,
        userPrompt,
        schemaId: configStore.selectedSchemaId || undefined
      },
      input: testInput
    })

    // Mark execution as started
    testStore.startExecution()
    const startTime = performance.now()

    try {
      // Strip base64 prefix from image content
      const base64Image = stripBase64Prefix(params.file.base64Content)

      // Build messages array
      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt,
          images: [base64Image]
        }
      ]

      // Build request
      const request: OllamaChatRequest = {
        model,
        messages,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
          num_ctx: numCtx
        }
      }

      // Add schema for structured output if available
      if (schema) {
        request.format = schema
      }

      progress.value = 'Sending request to model...'

      // Execute API call
      const response = await chatWithAbort(request)

      // Calculate duration
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      // Handle API errors
      if (!response.success || !response.data) {
        const apiError = response.error
        let errorCode: PipelineErrorCode = 'UNKNOWN_ERROR'
        let errorMessage = apiError?.message ?? 'Unknown API error'

        // Categorize API errors
        if (apiError?.code === 'CANCELLED') {
          errorCode = 'REQUEST_CANCELLED'
          errorMessage = 'Request was cancelled.'
        } else if (apiError?.code === 'FETCH_ERROR' || apiError?.code === 'CONNECTION_ERROR') {
          errorCode = 'SERVER_UNREACHABLE'
          errorMessage = 'Cannot connect to Ollama server.'
        } else if (apiError?.code === 'REQUEST_FAILED') {
          errorCode = 'INVALID_RESPONSE'
          errorMessage = apiError.message
        }

        isRunning.value = false
        error.value = errorMessage
        progress.value = ''

        await testStore.failExecution(errorMessage)

        throw {
          code: errorCode,
          message: errorMessage,
          details: apiError?.message
        } as PipelineError
      }

      progress.value = 'Parsing response...'

      // Extract response content
      const rawContent = response.data.message.content

      // Build output object
      const output: TestOutput = {
        raw: rawContent,
        promptTokens: response.data.prompt_eval_count,
        completionTokens: response.data.eval_count,
        totalDuration: response.data.total_duration
      }

      // Try to parse JSON from response
      try {
        const parsed = parseJsonFromResponse(rawContent)
        output.parsed = parsed

        // Validate against schema if available
        if (schema) {
          const validationResult = schemaStore.validateAgainstSchema(parsed)
          if (validationResult !== true) {
            output.error = `Schema validation: ${validationResult}`
          }
        }
      } catch (parseError) {
        // JSON parsing failed - store error but don't fail the test
        output.error = parseError instanceof Error 
          ? parseError.message 
          : 'Failed to parse response as JSON'
      }

      // Complete execution successfully
      await testStore.completeExecution(output, duration)

      isRunning.value = false
      error.value = null
      progress.value = ''

      // Return the completed test run
      const completedTestRun = testStore.currentTestRun
      if (!completedTestRun) {
        throw {
          code: 'UNKNOWN_ERROR',
          message: 'Test run was not created properly.',
          details: 'currentTestRun is null after completion'
        } as PipelineError
      }
      
      return completedTestRun
    } catch (err) {
      // Handle unexpected errors
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)
      
      isRunning.value = false
      progress.value = ''

      // Check if already handled (PipelineError)
      if (typeof err === 'object' && err !== null && 'code' in err) {
        throw err
      }

      // Categorize and handle the error
      const pipelineError = categorizeError(err)
      error.value = pipelineError.message

      await testStore.failExecution(pipelineError.message)

      throw pipelineError
    }
  }

  /**
   * Cancel the current pipeline execution
   */
  function cancelExecution(): void {
    if (isRunning.value) {
      cancelCurrentRequest()
      isRunning.value = false
      progress.value = ''
      error.value = 'Execution cancelled'
      
      // Update test store
      const testStore = useTestStore()
      testStore.cancelExecution()
    }
  }

  return {
    // State
    isRunning,
    error,
    progress,
    
    // Actions
    runDirectPipeline,
    cancelExecution
  }
}
