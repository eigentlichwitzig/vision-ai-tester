/**
 * Config store - manages user preferences and application settings
 * 
 * Persisted to localStorage via pinia-plugin-persistedstate
 */

import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

export interface OllamaConfig {
  baseUrl: string
  timeout: number
}

export const useConfigStore = defineStore('config', () => {
  // Ollama connection settings
  const ollamaConfig: Ref<OllamaConfig> = ref({
    baseUrl: 'http://localhost:11434',
    timeout: 60000
  })
  
  // UI preferences
  const leftPanelWidth: Ref<number> = ref(35)
  const darkMode: Ref<boolean> = ref(false)
  const showRawOutput: Ref<boolean> = ref(false)
  
  // Default prompts (user can customize)
  const defaultSystemPrompt: Ref<string> = ref(`You are a structured data extraction assistant. Your task is to extract information from documents and output valid JSON that strictly conforms to the provided schema.

Rules:
- Output ONLY valid JSON, no explanations or additional text
- Use null for missing or unclear fields
- Use ISO-8601 format for dates (YYYY-MM-DD)
- Use numbers (not strings) for all numeric values
- Preserve original text accuracy`)

  const defaultUserPrompt: Ref<string> = ref('Extract all fields from this document according to the schema. Be precise and accurate.')
  
  const defaultOcrPrompt: Ref<string> = ref('Extract all visible text from this document. Preserve the layout and structure. Output the text exactly as it appears.')

  // Actions
  function setOllamaConfig(config: Partial<OllamaConfig>): void {
    ollamaConfig.value = { ...ollamaConfig.value, ...config }
  }

  function setLeftPanelWidth(width: number): void {
    leftPanelWidth.value = Math.max(20, Math.min(50, width))
  }

  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value
  }

  function toggleRawOutput(): void {
    showRawOutput.value = !showRawOutput.value
  }

  function resetDefaults(): void {
    ollamaConfig.value = { baseUrl: 'http://localhost:11434', timeout: 60000 }
    leftPanelWidth.value = 35
    darkMode.value = false
    showRawOutput.value = false
  }

  return {
    // State
    ollamaConfig,
    leftPanelWidth,
    darkMode,
    showRawOutput,
    defaultSystemPrompt,
    defaultUserPrompt,
    defaultOcrPrompt,
    // Actions
    setOllamaConfig,
    setLeftPanelWidth,
    toggleDarkMode,
    toggleRawOutput,
    resetDefaults
  }
}, {
  persist: true
})
