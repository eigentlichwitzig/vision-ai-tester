/**
 * Test store - manages test execution state
 * 
 * TODO: Implement full state management for:
 * - Current test run configuration
 * - Test execution state
 * - Results display
 */

import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'
import type { TestRun, TestInput, TestParameters, PipelineType } from '@/types/models'

export const useTestStore = defineStore('test', () => {
  // Current configuration
  const selectedModel: Ref<string | null> = ref(null)
  const selectedOcrModel: Ref<string | null> = ref(null)
  const selectedPipeline: Ref<PipelineType> = ref('direct-multimodal')
  
  // Current input
  const currentInput: Ref<TestInput | null> = ref(null)
  
  // Current parameters
  const parameters: Ref<TestParameters> = ref({
    temperature: 0,
    maxTokens: 4096,
    numCtx: 8192,
    systemPrompt: `You are a structured data extraction assistant. Your task is to extract information from documents and output valid JSON that strictly conforms to the provided schema.

Rules:
- Output ONLY valid JSON, no explanations or additional text
- Use null for missing or unclear fields
- Use ISO-8601 format for dates (YYYY-MM-DD)
- Use numbers (not strings) for all numeric values
- Preserve original text accuracy`,
    userPrompt: 'Extract all fields from this document according to the schema. Be precise and accurate.'
  })
  
  // Current run state
  const isRunning: Ref<boolean> = ref(false)
  const currentRun: Ref<TestRun | null> = ref(null)
  const error: Ref<string | null> = ref(null)

  // Actions
  function setModel(model: string): void {
    selectedModel.value = model
  }

  function setOcrModel(model: string): void {
    selectedOcrModel.value = model
  }

  function setPipeline(pipeline: PipelineType): void {
    selectedPipeline.value = pipeline
  }

  function setInput(input: TestInput): void {
    currentInput.value = input
  }

  function setParameters(params: Partial<TestParameters>): void {
    parameters.value = { ...parameters.value, ...params }
  }

  function setCurrentRun(run: TestRun | null): void {
    currentRun.value = run
    error.value = run?.output.error || null
  }

  function setRunning(running: boolean): void {
    isRunning.value = running
  }

  function reset(): void {
    currentInput.value = null
    currentRun.value = null
    error.value = null
    isRunning.value = false
  }

  return {
    // State
    selectedModel,
    selectedOcrModel,
    selectedPipeline,
    currentInput,
    parameters,
    isRunning,
    currentRun,
    error,
    // Actions
    setModel,
    setOcrModel,
    setPipeline,
    setInput,
    setParameters,
    setCurrentRun,
    setRunning,
    reset
  }
})
