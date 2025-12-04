/**
 * Composable for executing test pipelines
 * Manages multimodal pipeline execution, state, and error handling
 */

import { ref, toRaw } from 'vue'
import { chatWithAbort, cancelCurrentRequest } from '@/api'
import { useConfigStore } from '@/stores/configStore'
import { useTestStore } from '@/stores/testStore'
import { useSchemaStore } from '@/stores/schemaStore'
import { useSchemaValidator } from '@/composables/useSchemaValidator'
import { useOllamaHealth } from '@/composables/useOllamaHealth'
import { cleanJsonSchemaForOllama } from '@/utils/schemaConverter'
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
 * Parameters for OCR-then-parse pipeline execution
 */
export interface OcrPipelineParams {
  /** File data with base64 content */
  file: FileUploadData
  /** OCR model name (e.g., 'deepseek-ocr', 'minicpm-v') */
  ocrModel?: string
  /** Parse model name (e.g., 'qwen2.5:7b') */
  parseModel?: string
  /** 
   * @deprecated Use ocrConfig.userPrompt instead
   * OCR prompt for text extraction 
   */
  ocrPrompt?: string
  /** 
   * @deprecated Use parseConfig.systemPrompt instead
   * System prompt for parsing step 
   */
  systemPrompt?: string
  /** 
   * @deprecated Use parseConfig.userPrompt instead
   * User prompt for parsing step 
   */
  userPrompt?: string
  /** 
   * @deprecated Use ocrConfig/parseConfig temperature instead
   * Temperature (0 for deterministic output) 
   */
  temperature?: number
  /** 
   * @deprecated Use ocrConfig/parseConfig maxTokens instead
   * Maximum tokens to generate 
   */
  maxTokens?: number
  /** 
   * @deprecated Use ocrConfig/parseConfig numCtx instead
   * Context window size 
   */
  numCtx?: number
  /** JSON schema for structured output */
  schema?: object
  
  /** Separate OCR step configuration */
  ocrConfig?: {
    temperature: number
    maxTokens: number
    numCtx: number
    systemPrompt: string
    userPrompt: string
  }
  
  /** Separate Parse step configuration */
  parseConfig?: {
    temperature: number
    maxTokens: number
    numCtx: number
    systemPrompt: string
    userPrompt: string
  }
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
  | 'OCR_EXTRACTION_FAILED'
  | 'OCR_EMPTY_RESULT'
  | 'PARSE_STEP_FAILED'
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
  const currentStep = ref<string>('')
  const progressPercent = ref<number>(0)
  const canCancel = ref(true)

  /**
   * Verify Ollama server connectivity before pipeline execution
   * @throws PipelineError if server is unreachable
   */
  async function ensureOllamaConnected(): Promise<void> {
    const { isOnline, checkHealth } = useOllamaHealth()
    
    if (!isOnline.value) {
      await checkHealth()
    }
    
    if (!isOnline.value) {
      throw {
        code: 'SERVER_UNREACHABLE',
        message: 'Ollama server is not reachable. Please check connectivity.',
        details: 'Start Ollama and ensure it is running on localhost:11434'
      } as PipelineError
    }
  }

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

    // Check Ollama connectivity before running
    await ensureOllamaConnected()

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
    currentStep.value = 'Preparing request...'
    progressPercent.value = 0
    canCancel.value = true

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
        request.format = cleanJsonSchemaForOllama(schema)
      }

      currentStep.value = 'Sending request to model...'
      progressPercent.value = 25

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
        currentStep.value = ''
        progressPercent.value = 0

        await testStore.failExecution(errorMessage)

        throw {
          code: errorCode,
          message: errorMessage,
          details: apiError?.message
        } as PipelineError
      }

      currentStep.value = 'Validating response...'
      progressPercent.value = 75

      // Extract response content - check both content and thinking fields
      // Reasoning models like DeepSeek-R1 may put output in thinking field
      let rawContent = response.data.message.content
      const thinkingContent = response.data.message.thinking

      console.log('🔍 Direct Pipeline - Raw response received')
      console.log('  Content Length:', rawContent?.length ?? 0)
      console.log('  Thinking Length:', thinkingContent?.length ?? 0)
      console.log('  Content Preview:', rawContent?.substring(0, 200))

      // If content is empty but thinking has content, try to extract from thinking
      if ((!rawContent || rawContent.trim().length === 0) && thinkingContent && thinkingContent.trim().length > 0) {
        console.log('🔄 Content empty, attempting to extract from thinking content...')
        // Try to find JSON in thinking content (reasoning models sometimes put answer in thinking)
        const jsonMatch = thinkingContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          rawContent = jsonMatch[0]
          console.log('✅ Extracted JSON from thinking content')
        }
      }

      // Build output object - ALWAYS populate raw content
      const output: TestOutput = {
        raw: rawContent || '',  // Ensure raw is always set
        thinking: thinkingContent,  // Store thinking content for debugging
        promptTokens: response.data.prompt_eval_count,
        completionTokens: response.data.eval_count,
        totalDuration: response.data.total_duration
      }

      // Validate we have content
      if (!rawContent || rawContent.trim().length === 0) {
        // Provide more specific error message for reasoning models
        if (thinkingContent && thinkingContent.trim().length > 0) {
          output.error = 'Reasoning model returned only thinking content, no final output. Try increasing maxTokens or using a non-reasoning model.'
        } else {
          output.error = 'Model returned empty response'
        }
        output.isValid = false
        console.error('❌ Empty response from model')
      } else {
        // Try to parse JSON from response
        try {
          const parsed = parseJsonFromResponse(rawContent)
          output.parsed = parsed
          console.log('✅ JSON parsed successfully')

          // Validate against schema if available
          if (schema) {
            const schemaValidator = useSchemaValidator()
            const validResult = schemaValidator.validate(parsed, schema)
            output.isValid = validResult
            
            if (!validResult) {
              // Use toRaw() to unwrap Vue reactive proxy before assignment
              // This prevents DataCloneError when saving to IndexedDB
              output.validationErrors = toRaw(schemaValidator.errors.value)
              output.error = 'JSON output failed schema validation - see validation errors for details'
              console.warn('⚠️ Schema validation failed:', output.validationErrors)
            } else {
              output.validationErrors = []
              console.log('✅ Schema validation passed')
            }
          } else {
            // No schema to validate against - consider it valid
            output.isValid = true
            output.validationErrors = []
            console.log('ℹ️ No schema provided - skipping validation')
          }
        } catch (parseError) {
          // JSON parsing failed - store error but keep raw content
          const errorMessage = parseError instanceof Error 
            ? parseError.message 
            : 'Failed to parse response as JSON'
          
          output.error = errorMessage
          output.isValid = false
          output.validationErrors = []
          
          console.warn('⚠️ JSON parse failed:', errorMessage)
          console.log('  Raw content will still be available for review')
          // Note: We don't fail the test here - raw output is still valuable
        }
      }

      // Disable cancel during save
      canCancel.value = false
      currentStep.value = 'Saving results...'
      progressPercent.value = 95

      // Complete execution successfully
      await testStore.completeExecution(output, duration)

      currentStep.value = 'Complete!'
      progressPercent.value = 100
      isRunning.value = false
      error.value = null

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
      currentStep.value = ''
      progressPercent.value = 0

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
   * Execute the OCR-then-parse pipeline
   * Step 1: Extract text from image using OCR model
   * Step 2: Parse extracted text into structured JSON using text-only LLM
   * 
   * @param params - Pipeline execution parameters
   * @returns Completed TestRun object
   * @throws PipelineError if execution fails
   */
  async function runOcrPipeline(params: OcrPipelineParams): Promise<TestRun> {
    const configStore = useConfigStore()
    const testStore = useTestStore()
    const schemaStore = useSchemaStore()

    // Check Ollama connectivity before running
    await ensureOllamaConnected()

    // Validate required inputs
    if (!params.file) {
      throw {
        code: 'MISSING_FILE',
        message: 'No file provided for extraction.',
        details: 'Please upload a file before running the pipeline.'
      } as PipelineError
    }

    // Get configuration with fallbacks - use separate configs if available
    const ocrModel = params.ocrModel ?? configStore.selectedOcrModel
    const parseModel = params.parseModel ?? configStore.selectedParseModel
    const schema = params.schema ?? schemaStore.activeSchema?.schema
    
    // OCR step configuration (prioritize ocrConfig, then legacy params, then store defaults)
    const ocrTemperature = params.ocrConfig?.temperature ?? params.temperature ?? configStore.ocrConfig.temperature
    const ocrMaxTokens = params.ocrConfig?.maxTokens ?? params.maxTokens ?? configStore.ocrConfig.maxTokens
    const ocrNumCtx = params.ocrConfig?.numCtx ?? params.numCtx ?? configStore.ocrConfig.numCtx
    const ocrSystemPrompt = params.ocrConfig?.systemPrompt ?? configStore.ocrConfig.systemPrompt
    const ocrUserPrompt = params.ocrConfig?.userPrompt ?? params.ocrPrompt ?? configStore.ocrConfig.userPrompt
    
    // Parse step configuration (prioritize parseConfig, then legacy params, then store defaults)
    const parseTemperature = params.parseConfig?.temperature ?? params.temperature ?? configStore.parseConfig.temperature
    const parseMaxTokens = params.parseConfig?.maxTokens ?? params.maxTokens ?? configStore.parseConfig.maxTokens
    const parseNumCtx = params.parseConfig?.numCtx ?? params.numCtx ?? configStore.parseConfig.numCtx
    const parseSystemPrompt = params.parseConfig?.systemPrompt ?? params.systemPrompt ?? configStore.parseConfig.systemPrompt
    const parseUserPrompt = params.parseConfig?.userPrompt ?? params.userPrompt ?? configStore.parseConfig.userPrompt

    // Reset state
    error.value = null
    isRunning.value = true
    currentStep.value = 'Step 1/2: Extracting text with OCR...'
    progressPercent.value = 10
    canCancel.value = true

    // Create test input from file data
    const testInput: TestInput = {
      fileName: params.file.fileName,
      fileType: params.file.fileType,
      mimeType: params.file.mimeType,
      size: params.file.size,
      base64Content: '',
      thumbnail: params.file.thumbnail
    }

    // Create test run record with separate OCR and Parse parameters
    const testRun = testStore.createTestRun({
      modelName: parseModel,
      pipeline: 'ocr-then-parse',
      ocrModel: ocrModel,
      parameters: {
        temperature: parseTemperature,
        maxTokens: parseMaxTokens,
        numCtx: parseNumCtx,
        systemPrompt: parseSystemPrompt,
        userPrompt: parseUserPrompt,
        schemaId: configStore.selectedSchemaId || undefined,
        ocrParameters: {
          temperature: ocrTemperature,
          maxTokens: ocrMaxTokens,
          numCtx: ocrNumCtx,
          systemPrompt: ocrSystemPrompt,
          userPrompt: ocrUserPrompt
        },
        parseParameters: {
          temperature: parseTemperature,
          maxTokens: parseMaxTokens,
          numCtx: parseNumCtx,
          systemPrompt: parseSystemPrompt,
          userPrompt: parseUserPrompt,
          schemaId: configStore.selectedSchemaId || undefined
        }
      },
      input: testInput
    })

    // Mark execution as started
    testStore.startExecution()
    const startTime = performance.now()

    try {
      // Strip base64 prefix from image content
      const base64Image = stripBase64Prefix(params.file.base64Content)

      // ==========================================
      // STEP 1: OCR Extraction
      // ==========================================
      
      // Build OCR request with OCR-specific configuration
      const ocrMessages: OllamaMessage[] = [
        {
          role: 'system',
          content: ocrSystemPrompt
        },
        {
          role: 'user',
          content: ocrUserPrompt,
          images: [base64Image]
        }
      ]

      const ocrRequest: OllamaChatRequest = {
        model: ocrModel,
        messages: ocrMessages,
        stream: false,
        options: {
          temperature: ocrTemperature,
          num_predict: ocrMaxTokens,
          num_ctx: ocrNumCtx
        }
      }

      // Execute OCR API call
      const ocrResponse = await chatWithAbort(ocrRequest)

      // Handle OCR API errors
      if (!ocrResponse.success || !ocrResponse.data) {
        const apiError = ocrResponse.error
        let errorCode: PipelineErrorCode = 'OCR_EXTRACTION_FAILED'
        let errorMessage = apiError?.message ?? 'OCR extraction failed'

        // Categorize API errors
        if (apiError?.code === 'CANCELLED') {
          errorCode = 'REQUEST_CANCELLED'
          errorMessage = 'Request was cancelled.'
        } else if (apiError?.code === 'FETCH_ERROR' || apiError?.code === 'CONNECTION_ERROR') {
          errorCode = 'SERVER_UNREACHABLE'
          errorMessage = 'Cannot connect to Ollama server.'
        } else if (apiError?.code === 'REQUEST_FAILED') {
          errorCode = 'OCR_EXTRACTION_FAILED'
          errorMessage = `OCR extraction failed: ${apiError.message}`
        }

        isRunning.value = false
        error.value = errorMessage
        currentStep.value = ''
        progressPercent.value = 0

        await testStore.failExecution(errorMessage)

        throw {
          code: errorCode,
          message: errorMessage,
          details: apiError?.message
        } as PipelineError
      }

      // OCR step complete
      currentStep.value = 'Step 1/2: OCR complete'
      progressPercent.value = 40

      // Extract OCR text from response
      const ocrText = ocrResponse.data.message.content

      // Validate OCR result
      if (!ocrText || ocrText.trim().length === 0) {
        const errorMessage = 'OCR extraction returned empty result. The image may be unreadable.'
        
        isRunning.value = false
        error.value = errorMessage
        currentStep.value = ''
        progressPercent.value = 0

        await testStore.failExecution(errorMessage)

        throw {
          code: 'OCR_EMPTY_RESULT',
          message: errorMessage,
          details: 'OCR model returned empty or whitespace-only content'
        } as PipelineError
      }

      // ==========================================
      // STEP 2: Parse Text into Structured JSON
      // ==========================================
      
      currentStep.value = 'Step 2/2: Parsing text into JSON...'
      progressPercent.value = 50

      // Build parse request with extracted text using Parse-specific configuration
      const parseMessages: OllamaMessage[] = [
        {
          role: 'system',
          content: parseSystemPrompt
        },
        {
          role: 'user',
          content: `${parseUserPrompt}\n\nText:\n${ocrText}`
        }
      ]

      const parseRequest: OllamaChatRequest = {
        model: parseModel,
        messages: parseMessages,
        stream: false,
        options: {
          temperature: parseTemperature,
          num_predict: parseMaxTokens,
          num_ctx: parseNumCtx
        }
      }

      // Add schema for structured output if available
      if (schema) {
        parseRequest.format = cleanJsonSchemaForOllama(schema)
      }

      // Execute parse API call
      const parseResponse = await chatWithAbort(parseRequest)

      // Calculate duration (includes both steps)
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      // Handle parse API errors
      if (!parseResponse.success || !parseResponse.data) {
        const apiError = parseResponse.error
        let errorCode: PipelineErrorCode = 'PARSE_STEP_FAILED'
        let errorMessage = apiError?.message ?? 'Parse step failed'

        // Categorize API errors
        if (apiError?.code === 'CANCELLED') {
          errorCode = 'REQUEST_CANCELLED'
          errorMessage = 'Request was cancelled.'
        } else if (apiError?.code === 'FETCH_ERROR' || apiError?.code === 'CONNECTION_ERROR') {
          errorCode = 'SERVER_UNREACHABLE'
          errorMessage = 'Cannot connect to Ollama server.'
        } else if (apiError?.code === 'REQUEST_FAILED') {
          errorCode = 'PARSE_STEP_FAILED'
          errorMessage = `Parse step failed: ${apiError.message}`
        }

        isRunning.value = false
        error.value = errorMessage
        currentStep.value = ''
        progressPercent.value = 0

        await testStore.failExecution(errorMessage)

        throw {
          code: errorCode,
          message: errorMessage,
          details: apiError?.message
        } as PipelineError
      }

      currentStep.value = 'Validating output...'
      progressPercent.value = 85

      // Extract parse response content - check both content and thinking fields
      // Reasoning models like DeepSeek-R1 may put output in thinking field
      let rawContent = parseResponse.data.message.content
      const thinkingContent = parseResponse.data.message.thinking

      console.log('🔍 OCR Pipeline - Parse response received')
      console.log('  Content Length:', rawContent?.length ?? 0)
      console.log('  Thinking Length:', thinkingContent?.length ?? 0)
      console.log('  Content Preview:', rawContent?.substring(0, 200))
      console.log('  OCR Text Length:', ocrText?.length ?? 0)

      // If content is empty but thinking has content, try to extract from thinking
      if ((!rawContent || rawContent.trim().length === 0) && thinkingContent && thinkingContent.trim().length > 0) {
        console.log('🔄 Content empty, attempting to extract from thinking content...')
        // Try to find JSON in thinking content (reasoning models sometimes put answer in thinking)
        const jsonMatch = thinkingContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          rawContent = jsonMatch[0]
          console.log('✅ Extracted JSON from thinking content')
        }
      }

      // Build output object with OCR text - ALWAYS populate raw and ocrText
      const output: TestOutput = {
        raw: rawContent || '',  // Ensure raw is always set
        ocrText,  // Always include OCR text
        thinking: thinkingContent,  // Store thinking content for debugging
        promptTokens: (ocrResponse.data.prompt_eval_count ?? 0) + (parseResponse.data.prompt_eval_count ?? 0),
        completionTokens: (ocrResponse.data.eval_count ?? 0) + (parseResponse.data.eval_count ?? 0),
        totalDuration: (ocrResponse.data.total_duration ?? 0) + (parseResponse.data.total_duration ?? 0)
      }

      // Validate we have content
      if (!rawContent || rawContent.trim().length === 0) {
        // Provide more specific error message for reasoning models
        if (thinkingContent && thinkingContent.trim().length > 0) {
          output.error = 'Reasoning model returned only thinking content, no final output. Try increasing maxTokens or using a non-reasoning model.'
        } else {
          output.error = 'Parse model returned empty response'
        }
        output.isValid = false
        console.error('❌ Empty response from parse model')
      } else {
        // Try to parse JSON from response
        try {
          const parsed = parseJsonFromResponse(rawContent)
          output.parsed = parsed
          console.log('✅ JSON parsed successfully')

          // Validate against schema if available
          if (schema) {
            const schemaValidator = useSchemaValidator()
            const validResult = schemaValidator.validate(parsed, schema)
            output.isValid = validResult
            
            if (!validResult) {
              // Use toRaw() to unwrap Vue reactive proxy before assignment
              // This prevents DataCloneError when saving to IndexedDB
              output.validationErrors = toRaw(schemaValidator.errors.value)
              output.error = 'JSON output failed schema validation - see validation errors for details'
              console.warn('⚠️ Schema validation failed:', output.validationErrors)
            } else {
              output.validationErrors = []
              console.log('✅ Schema validation passed')
            }
          } else {
            // No schema to validate against - consider it valid
            output.isValid = true
            output.validationErrors = []
            console.log('ℹ️ No schema provided - skipping validation')
          }
        } catch (parseError) {
          // JSON parsing failed - store error but keep raw content
          const errorMessage = parseError instanceof Error 
            ? parseError.message 
            : 'Failed to parse response as JSON'
          
          output.error = errorMessage
          output.isValid = false
          output.validationErrors = []
          
          console.warn('⚠️ JSON parse failed:', errorMessage)
          console.log('  Raw content and OCR text will still be available for review')
          // Note: We don't fail the test here - raw output is still valuable
        }
      }

      // Disable cancel during save
      canCancel.value = false
      currentStep.value = 'Saving results...'
      progressPercent.value = 95

      // Complete execution successfully
      await testStore.completeExecution(output, duration)

      currentStep.value = 'Complete!'
      progressPercent.value = 100
      isRunning.value = false
      error.value = null

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
      isRunning.value = false
      currentStep.value = ''
      progressPercent.value = 0

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
      currentStep.value = 'Cancelled by user'
      progressPercent.value = 0
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
    currentStep,
    progressPercent,
    canCancel,
    
    // Actions
    runDirectPipeline,
    runOcrPipeline,
    cancelExecution
  }
}
