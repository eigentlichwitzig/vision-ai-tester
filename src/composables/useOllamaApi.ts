/**
 * Composable for interacting with the Ollama API
 * 
 * TODO: Implement full API interaction with:
 * - Model listing
 * - Chat completions
 * - Connection status
 */

import { ref, readonly, type Ref } from 'vue'
import type { OllamaModelInfo } from '@/types/ollama'
import { listModels, checkConnection, sendChatRequest } from '@/api/ollama'
import type { OllamaChatRequest, OllamaChatResponse } from '@/types/ollama'

export function useOllamaApi() {
  const isConnected: Ref<boolean> = ref(false)
  const models: Ref<OllamaModelInfo[]> = ref([])
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  async function testConnection(): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      isConnected.value = await checkConnection()
      return isConnected.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Connection failed'
      isConnected.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchModels(): Promise<OllamaModelInfo[]> {
    isLoading.value = true
    error.value = null
    try {
      const response = await listModels()
      models.value = response.models
      return models.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch models'
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function chat(request: OllamaChatRequest): Promise<OllamaChatResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      return await sendChatRequest(request)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Chat request failed'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isConnected: readonly(isConnected),
    models: readonly(models),
    isLoading: readonly(isLoading),
    error: readonly(error),
    testConnection,
    fetchModels,
    chat
  }
}
