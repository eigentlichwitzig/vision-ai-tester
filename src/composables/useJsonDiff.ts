/**
 * useJsonDiff Composable
 * Provides JSON diffing functionality using jsondiffpatch
 */

import { ref, computed } from 'vue'
import { create, type Delta } from 'jsondiffpatch'
import * as htmlFormatter from 'jsondiffpatch/formatters/html'

/**
 * Creates and configures the jsondiffpatch instance
 */
const differ = create({
  objectHash: (obj: unknown) => {
    const o = obj as Record<string, unknown>
    return o?.id ?? o?._id ?? JSON.stringify(obj)
  },
  arrays: {
    detectMove: true
  }
})

/**
 * Composable for computing and formatting JSON diffs
 */
export function useJsonDiff() {
  /** Current diff result (delta) */
  const diffResult = ref<Delta | undefined>(undefined)
  
  /** Left object for comparison */
  const leftObject = ref<object | null>(null)
  
  /** Right object for comparison */
  const rightObject = ref<object | null>(null)

  /**
   * Compute whether there are any differences between the objects
   */
  const hasDifferences = computed(() => {
    return diffResult.value !== undefined
  })

  /**
   * Compute diff between two JSON objects
   * @param left - Left object for comparison
   * @param right - Right object for comparison
   * @returns Delta representing the differences, or undefined if identical
   */
  function computeDiff(left: object, right: object): Delta | undefined {
    leftObject.value = left
    rightObject.value = right
    diffResult.value = differ.diff(left, right)
    return diffResult.value
  }

  /**
   * Format a delta as HTML for display
   * @param delta - Delta from computeDiff
   * @param left - Left object (needed for context in HTML output)
   * @returns HTML string representing the diff
   */
  function formatDiffHtml(delta: Delta | undefined, left?: object): string {
    if (!delta) {
      return ''
    }
    const baseObject = left ?? leftObject.value ?? {}
    return htmlFormatter.format(delta, baseObject as object) ?? ''
  }

  /**
   * Get formatted HTML for the current diff result
   */
  const diffHtml = computed(() => {
    if (!diffResult.value || !leftObject.value) {
      return ''
    }
    return formatDiffHtml(diffResult.value, leftObject.value)
  })

  /**
   * Clear the current diff state
   */
  function clearDiff(): void {
    diffResult.value = undefined
    leftObject.value = null
    rightObject.value = null
  }

  /**
   * Export the diff as JSON
   * @returns JSON string of the delta
   */
  function exportDiffAsJson(): string {
    if (!diffResult.value) {
      return '{}'
    }
    return JSON.stringify(diffResult.value, null, 2)
  }

  return {
    // State
    diffResult,
    leftObject,
    rightObject,
    
    // Computed
    hasDifferences,
    diffHtml,
    
    // Methods
    computeDiff,
    formatDiffHtml,
    clearDiff,
    exportDiffAsJson
  }
}
