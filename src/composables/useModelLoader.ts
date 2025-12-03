/**
 * Composable for loading and filtering Ollama models
 * Provides model fetching, filtering by type, and caching
 */

import { ref, computed } from 'vue'
import { listModels } from '@/api/ollama'
import type { OllamaModelInfo } from '@/types/ollama'

export type ModelType = 'vision' | 'ocr' | 'parse'

/**
 * Patterns to identify vision-capable models
 */
const VISION_PATTERNS = ['vl', 'vision', 'llava']

/**
 * Patterns to identify OCR-capable models
 */
const OCR_PATTERNS = ['ocr', 'minicpm', 'vision']

/**
 * Check if a model name matches any pattern
 */
function matchesPattern(modelName: string, patterns: string[]): boolean {
  const nameLower = modelName.toLowerCase()
  return patterns.some(pattern => nameLower.includes(pattern))
}

/**
 * Filter models by type
 */
function filterModelsByType(models: OllamaModelInfo[], type: ModelType): OllamaModelInfo[] {
  switch (type) {
    case 'vision':
      return models.filter(model => matchesPattern(model.name, VISION_PATTERNS))
    case 'ocr':
      return models.filter(model => matchesPattern(model.name, OCR_PATTERNS))
    case 'parse':
      // Parse models are text-only LLMs (exclude vision models)
      return models.filter(model => !matchesPattern(model.name, VISION_PATTERNS))
    default:
      return models
  }
}

// Cache for model list
let cachedModels: OllamaModelInfo[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 30000 // 30 seconds

/**
 * Composable for loading and filtering Ollama models
 */
export function useModelLoader() {
  const models = ref<OllamaModelInfo[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch models from Ollama API
   * Uses cache if available and not expired
   */
  async function fetchModels(forceRefresh = false): Promise<void> {
    // Check cache
    const now = Date.now()
    if (!forceRefresh && cachedModels && (now - cacheTimestamp) < CACHE_DURATION) {
      models.value = cachedModels
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await listModels()
      
      if (response.success && response.data) {
        models.value = response.data
        cachedModels = response.data
        cacheTimestamp = now
      } else {
        error.value = response.error?.message || 'Failed to fetch models'
        models.value = []
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An unknown error occurred'
      models.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get models filtered by type
   */
  const visionModels = computed(() => filterModelsByType(models.value, 'vision'))
  const ocrModels = computed(() => filterModelsByType(models.value, 'ocr'))
  const parseModels = computed(() => filterModelsByType(models.value, 'parse'))

  /**
   * Get filtered models by type
   */
  function getModelsByType(type: ModelType): OllamaModelInfo[] {
    return filterModelsByType(models.value, type)
  }

  /**
   * Clear the cache
   */
  function clearCache(): void {
    cachedModels = null
    cacheTimestamp = 0
  }

  /**
   * Format model size for display
   */
  function formatModelSize(size: number): string {
    const gb = size / (1024 * 1024 * 1024)
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`
    }
    const mb = size / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  return {
    models,
    isLoading,
    error,
    fetchModels,
    visionModels,
    ocrModels,
    parseModels,
    getModelsByType,
    clearCache,
    formatModelSize
  }
}
