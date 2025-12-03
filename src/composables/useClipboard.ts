/**
 * Composable for clipboard functionality
 * Provides copy to clipboard with feedback and error handling
 */

import { ref } from 'vue'

/**
 * Composable for clipboard operations
 */
export function useClipboard() {
  const copied = ref(false)
  const error = ref<string | null>(null)

  /**
   * Copy text to clipboard
   * @param text - Text content to copy
   * @returns True if copy was successful, false otherwise
   */
  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      error.value = null

      // Reset copied state after 2 seconds
      setTimeout(() => {
        copied.value = false
      }, 2000)

      return true
    } catch (err) {
      error.value = 'Failed to copy to clipboard'
      console.error('Copy failed:', err)
      return false
    }
  }

  return { copy, copied, error }
}
