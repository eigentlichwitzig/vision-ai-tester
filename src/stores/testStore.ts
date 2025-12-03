/**
 * Test execution state management
 * Manages current test run, test history, and execution state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TestRun, TestParameters, TestInput, PipelineType } from '@/types/models'
import { saveTestRun, getTestRuns, getTestRun, deleteTestRun } from '@/db'

/**
 * Test execution status
 */
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled'

export const useTestStore = defineStore('test', () => {
  // State
  const currentTestRun = ref<TestRun | null>(null)
  const testHistory = ref<TestRun[]>([])
  const executionStatus = ref<ExecutionStatus>('idle')
  const executionError = ref<string | null>(null)
  const isLoading = ref(false)

  // Getters
  const isRunning = computed(() => executionStatus.value === 'running')
  const hasCurrentTest = computed(() => currentTestRun.value !== null)
  const recentTests = computed(() => testHistory.value.slice(0, 10))

  /**
   * Create a new test run
   * Note: Initial status is set to 'success' as a placeholder.
   * It will be updated by completeExecution(), failExecution(), or cancelExecution()
   * before the test run is saved to the database.
   */
  function createTestRun(params: {
    modelName: string
    pipeline: PipelineType
    ocrModel?: string
    parameters: TestParameters
    input: TestInput
  }): TestRun {
    const testRun: TestRun = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      modelName: params.modelName,
      pipeline: params.pipeline,
      ocrModel: params.ocrModel,
      parameters: params.parameters,
      input: params.input,
      output: {
        raw: ''
      },
      duration: 0,
      status: 'success' // Placeholder - updated when test completes
    }
    
    currentTestRun.value = testRun
    return testRun
  }

  /**
   * Start test execution
   */
  function startExecution(): void {
    executionStatus.value = 'running'
    executionError.value = null
  }

  /**
   * Complete test execution with success
   * Status is determined by validation: valid output = success, invalid output = error
   */
  async function completeExecution(output: TestRun['output'], duration: number): Promise<void> {
    if (currentTestRun.value) {
      currentTestRun.value.output = output
      currentTestRun.value.duration = duration
      
      // Set status based on validation
      if (output.isValid === false) {
        currentTestRun.value.status = 'error'
      } else {
        currentTestRun.value.status = 'success'
      }
      
      // Save to database (even if invalid, for debugging)
      await saveTestRun(currentTestRun.value)
      
      // Add to history
      testHistory.value.unshift({ ...currentTestRun.value })
    }
    executionStatus.value = output.isValid === false ? 'error' : 'success'
  }

  /**
   * Fail test execution
   */
  async function failExecution(error: string): Promise<void> {
    if (currentTestRun.value) {
      currentTestRun.value.output.error = error
      currentTestRun.value.status = 'error'
      
      // Save to database
      await saveTestRun(currentTestRun.value)
      
      // Add to history
      testHistory.value.unshift({ ...currentTestRun.value })
    }
    executionStatus.value = 'error'
    executionError.value = error
  }

  /**
   * Cancel test execution
   */
  async function cancelExecution(): Promise<void> {
    if (currentTestRun.value) {
      currentTestRun.value.status = 'cancelled'
      
      // Save to database
      await saveTestRun(currentTestRun.value)
      
      // Add to history
      testHistory.value.unshift({ ...currentTestRun.value })
    }
    executionStatus.value = 'cancelled'
  }

  /**
   * Reset execution state
   */
  function resetExecution(): void {
    executionStatus.value = 'idle'
    executionError.value = null
    currentTestRun.value = null
  }

  /**
   * Load test history from database
   */
  async function loadHistory(options?: {
    modelName?: string
    pipeline?: PipelineType
    limit?: number
  }): Promise<void> {
    isLoading.value = true
    try {
      testHistory.value = await getTestRuns(options)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load a specific test run by ID
   */
  async function loadTestRun(id: string): Promise<TestRun | undefined> {
    const testRun = await getTestRun(id)
    if (testRun) {
      currentTestRun.value = testRun
    }
    return testRun
  }

  /**
   * Delete a test run by ID
   */
  async function removeTestRun(id: string): Promise<void> {
    await deleteTestRun(id)
    testHistory.value = testHistory.value.filter((run) => run.id !== id)
    if (currentTestRun.value?.id === id) {
      currentTestRun.value = null
    }
  }

  /**
   * Clear current test run
   */
  function clearCurrentTest(): void {
    currentTestRun.value = null
    executionStatus.value = 'idle'
    executionError.value = null
  }

  return {
    // State
    currentTestRun,
    testHistory,
    executionStatus,
    executionError,
    isLoading,
    
    // Getters
    isRunning,
    hasCurrentTest,
    recentTests,
    
    // Actions
    createTestRun,
    startExecution,
    completeExecution,
    failExecution,
    cancelExecution,
    resetExecution,
    loadHistory,
    loadTestRun,
    removeTestRun,
    clearCurrentTest
  }
})
