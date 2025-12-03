/**
 * User preferences and configuration state management
 * Persisted to localStorage using pinia-plugin-persistedstate
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PipelineType, TestParameters, FileUploadData } from '@/types/models'

/**
 * Default system prompt for structured extraction
 */
const DEFAULT_SYSTEM_PROMPT = `You are a structured data extraction assistant. Your task is to extract information from documents and output valid JSON that strictly conforms to the provided schema.

Rules:
- Output ONLY valid JSON, no explanations or additional text
- Use null for missing or unclear fields
- Use ISO-8601 format for dates (YYYY-MM-DD)
- Use numbers (not strings) for all numeric values
- Preserve original text accuracy`

/**
 * Default user prompt
 */
const DEFAULT_USER_PROMPT = 'Extract all fields from this document according to the schema. Be precise and accurate.'

/**
 * Default OCR prompt (Pipeline 1, Step 1)
 */
const DEFAULT_OCR_PROMPT = 'Extract all visible text from this document. Preserve the layout and structure. Output the text exactly as it appears.'

/**
 * Default parameter values
 */
const DEFAULT_PARAMETERS: Omit<TestParameters, 'schemaId'> = {
  temperature: 0,
  maxTokens: 4096,
  numCtx: 8192,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  userPrompt: DEFAULT_USER_PROMPT
}

export const useConfigStore = defineStore('config', () => {
  // State - persisted
  const selectedPipeline = ref<PipelineType>('direct-multimodal')
  const selectedModel = ref<string>('qwen2.5vl:7b')
  const selectedOcrModel = ref<string>('deepseek-ocr')
  const selectedParseModel = ref<string>('qwen2.5:7b')
  const selectedSchemaId = ref<string | null>(null)
  
  // Default parameters
  const temperature = ref<number>(DEFAULT_PARAMETERS.temperature)
  const maxTokens = ref<number>(DEFAULT_PARAMETERS.maxTokens!)
  const numCtx = ref<number>(DEFAULT_PARAMETERS.numCtx!)
  const systemPrompt = ref<string>(DEFAULT_PARAMETERS.systemPrompt)
  const userPrompt = ref<string>(DEFAULT_PARAMETERS.userPrompt)
  const ocrPrompt = ref<string>(DEFAULT_OCR_PROMPT)
  
  // UI preferences
  const showAdvancedOptions = ref<boolean>(false)
  const autoSaveTests = ref<boolean>(true)
  const theme = ref<'light' | 'dark'>('light')
  
  // Current file state (not persisted - file data is transient)
  const currentFile = ref<FileUploadData | null>(null)

  // Getters
  const isOcrPipeline = computed(() => selectedPipeline.value === 'ocr-then-parse')
  
  const currentModel = computed(() => {
    if (selectedPipeline.value === 'ocr-then-parse') {
      return selectedParseModel.value
    }
    return selectedModel.value
  })
  
  const currentParameters = computed((): TestParameters => ({
    temperature: temperature.value,
    maxTokens: maxTokens.value,
    numCtx: numCtx.value,
    systemPrompt: systemPrompt.value,
    userPrompt: userPrompt.value,
    schemaId: selectedSchemaId.value ?? undefined
  }))

  /**
   * Set the pipeline type
   */
  function setPipeline(pipeline: PipelineType): void {
    selectedPipeline.value = pipeline
  }

  /**
   * Set the model for direct multimodal pipeline
   */
  function setModel(model: string): void {
    selectedModel.value = model
  }

  /**
   * Set the OCR model (for ocr-then-parse pipeline)
   */
  function setOcrModel(model: string): void {
    selectedOcrModel.value = model
  }

  /**
   * Set the parse model (for ocr-then-parse pipeline)
   */
  function setParseModel(model: string): void {
    selectedParseModel.value = model
  }

  /**
   * Set the selected schema
   */
  function setSchema(schemaId: string | null): void {
    selectedSchemaId.value = schemaId
  }

  /**
   * Update parameters
   */
  function updateParameters(params: Partial<TestParameters>): void {
    if (params.temperature !== undefined) temperature.value = params.temperature
    if (params.maxTokens !== undefined) maxTokens.value = params.maxTokens
    if (params.numCtx !== undefined) numCtx.value = params.numCtx
    if (params.systemPrompt !== undefined) systemPrompt.value = params.systemPrompt
    if (params.userPrompt !== undefined) userPrompt.value = params.userPrompt
  }

  /**
   * Reset parameters to defaults
   */
  function resetParameters(): void {
    temperature.value = DEFAULT_PARAMETERS.temperature
    maxTokens.value = DEFAULT_PARAMETERS.maxTokens!
    numCtx.value = DEFAULT_PARAMETERS.numCtx!
    systemPrompt.value = DEFAULT_PARAMETERS.systemPrompt
    userPrompt.value = DEFAULT_PARAMETERS.userPrompt
    ocrPrompt.value = DEFAULT_OCR_PROMPT
  }

  /**
   * Toggle advanced options visibility
   */
  function toggleAdvancedOptions(): void {
    showAdvancedOptions.value = !showAdvancedOptions.value
  }

  /**
   * Set theme
   */
  function setTheme(newTheme: 'light' | 'dark'): void {
    theme.value = newTheme
  }

  /**
   * Set the current uploaded file
   */
  function setFile(fileData: FileUploadData | null): void {
    currentFile.value = fileData
  }

  /**
   * Clear the current uploaded file
   */
  function clearFile(): void {
    currentFile.value = null
  }

  return {
    // State
    selectedPipeline,
    selectedModel,
    selectedOcrModel,
    selectedParseModel,
    selectedSchemaId,
    temperature,
    maxTokens,
    numCtx,
    systemPrompt,
    userPrompt,
    ocrPrompt,
    showAdvancedOptions,
    autoSaveTests,
    theme,
    currentFile,
    
    // Getters
    isOcrPipeline,
    currentModel,
    currentParameters,
    
    // Actions
    setPipeline,
    setModel,
    setOcrModel,
    setParseModel,
    setSchema,
    updateParameters,
    resetParameters,
    toggleAdvancedOptions,
    setTheme,
    setFile,
    clearFile
  }
}, {
  persist: true
})
