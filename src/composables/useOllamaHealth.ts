/**
 * Composable for Ollama server health checks
 * Provides proactive connectivity monitoring with actionable error messages
 */

import { ref, readonly } from 'vue'
import { pingOllama, parseConnectionError } from '@/api'
import type { HealthError } from '@/api'

/**
 * Shared state for health status across components
 * This ensures all components see the same health state
 */
const isOnline = ref(false)
const isChecking = ref(false)
const error = ref<HealthError | null>(null)
const lastCheckTime = ref<Date | null>(null)

/**
 * Composable for Ollama server health monitoring
 * Provides health check functionality with auto-retry and actionable error guidance
 */
export function useOllamaHealth() {
  /**
   * Check Ollama server connectivity
   * @returns true if server is online, false otherwise
   */
  async function checkHealth(): Promise<boolean> {
    if (isChecking.value) {
      return isOnline.value
    }

    isChecking.value = true
    error.value = null

    try {
      const result = await pingOllama()
      
      isOnline.value = result.success
      lastCheckTime.value = new Date()
      
      if (!result.success && result.error) {
        error.value = result.error
      }
      
      return result.success
    } catch (err) {
      isOnline.value = false
      error.value = parseConnectionError(err)
      lastCheckTime.value = new Date()
      return false
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Simple ping check without updating shared state
   * Useful for quick connectivity tests
   * @returns true if server responds, false otherwise
   */
  async function ping(): Promise<boolean> {
    try {
      const result = await pingOllama()
      return result.success
    } catch {
      return false
    }
  }

  /**
   * Check health with exponential backoff retry
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns true if server becomes online, false if all retries fail
   */
  async function checkHealthWithRetry(maxRetries = 3): Promise<boolean> {
    let attempt = 0
    
    while (attempt < maxRetries) {
      const result = await checkHealth()
      
      if (result) {
        return true
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      attempt++
    }
    
    return false
  }

  /**
   * Get user-friendly error guidance based on error type
   * @param healthError - The health error to get guidance for
   * @returns Formatted guidance string
   */
  function getErrorGuidance(healthError: HealthError): string {
    if (!healthError.guidance || healthError.guidance.length === 0) {
      return 'Check that Ollama is installed and running.'
    }
    
    return healthError.guidance
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n')
  }

  /**
   * Reset health state to initial values
   */
  function reset(): void {
    isOnline.value = false
    isChecking.value = false
    error.value = null
    lastCheckTime.value = null
  }

  return {
    // Readonly state
    isOnline: readonly(isOnline),
    isChecking: readonly(isChecking),
    error: readonly(error),
    lastCheckTime: readonly(lastCheckTime),
    
    // Actions
    checkHealth,
    ping,
    checkHealthWithRetry,
    getErrorGuidance,
    reset
  }
}
