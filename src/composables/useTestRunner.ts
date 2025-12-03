/**
 * Composable for running tests against Ollama models
 * 
 * TODO: Implement full test runner functionality with:
 * - OCR → Parse pipeline execution
 * - Direct multimodal pipeline execution
 * - Progress tracking
 * - Cancellation support
 */

import { ref, readonly, type Ref } from 'vue'
import type { TestRun, TestInput, TestParameters, PipelineType, TestOutput } from '@/types/models'
import { useOllamaApi } from './useOllamaApi'

export function useTestRunner() {
  const isRunning: Ref<boolean> = ref(false)
  const currentRun: Ref<TestRun | null> = ref(null)
  const progress: Ref<number> = ref(0)
  const error: Ref<string | null> = ref(null)

  const { chat } = useOllamaApi()

  function generateId(): string {
    return crypto.randomUUID()
  }

  async function runDirectPipeline(
    model: string,
    input: TestInput,
    parameters: TestParameters
  ): Promise<TestOutput> {
    // TODO: Implement direct multimodal pipeline
    const response = await chat({
      model,
      messages: [
        { role: 'system', content: parameters.systemPrompt },
        { role: 'user', content: parameters.userPrompt, images: [input.base64Content] }
      ],
      stream: false,
      options: {
        temperature: parameters.temperature,
        num_predict: parameters.maxTokens,
        num_ctx: parameters.numCtx
      }
    })

    if (!response) {
      return { raw: '', error: 'Failed to get response from model' }
    }

    return {
      raw: response.message.content,
      promptTokens: response.prompt_eval_count,
      totalDuration: response.total_duration
    }
  }

  async function runTest(
    model: string,
    input: TestInput,
    parameters: TestParameters,
    pipeline: PipelineType,
    ocrModel?: string
  ): Promise<TestRun | null> {
    isRunning.value = true
    progress.value = 0
    error.value = null

    const startTime = Date.now()
    const runId = generateId()

    try {
      let output: TestOutput

      if (pipeline === 'direct-multimodal') {
        output = await runDirectPipeline(model, input, parameters)
      } else {
        // TODO: Implement OCR → Parse pipeline
        output = { raw: '', error: 'OCR pipeline not yet implemented' }
      }

      const testRun: TestRun = {
        id: runId,
        timestamp: new Date(),
        modelName: model,
        pipeline,
        ocrModel,
        parameters,
        input,
        output,
        duration: Date.now() - startTime,
        status: output.error ? 'error' : 'success'
      }

      currentRun.value = testRun
      return testRun
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Test run failed'
      return null
    } finally {
      isRunning.value = false
      progress.value = 100
    }
  }

  function cancel(): void {
    // TODO: Implement cancellation
    isRunning.value = false
  }

  return {
    isRunning: readonly(isRunning),
    currentRun: readonly(currentRun),
    progress: readonly(progress),
    error: readonly(error),
    runTest,
    cancel
  }
}
