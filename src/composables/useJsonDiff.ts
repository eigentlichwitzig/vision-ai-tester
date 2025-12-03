/**
 * Composable for JSON diffing between test runs
 * 
 * TODO: Implement full JSON diff functionality with:
 * - Side-by-side comparison
 * - Inline diff visualization
 * - Field-level difference highlighting
 */

import { ref, readonly, computed, type Ref, type ComputedRef } from 'vue'
import { diff, type DiffPatcher } from 'jsondiffpatch'
import type { TestRun } from '@/types/models'

export interface DiffResult {
  hasDifferences: boolean
  delta: unknown
  addedFields: string[]
  removedFields: string[]
  modifiedFields: string[]
}

export function useJsonDiff() {
  const leftRun: Ref<TestRun | null> = ref(null)
  const rightRun: Ref<TestRun | null> = ref(null)
  const diffResult: Ref<DiffResult | null> = ref(null)

  function extractFields(delta: Record<string, unknown>, prefix = ''): { added: string[]; removed: string[]; modified: string[] } {
    const added: string[] = []
    const removed: string[] = []
    const modified: string[] = []

    for (const key in delta) {
      const fieldPath = prefix ? `${prefix}.${key}` : key
      const value = delta[key]

      if (Array.isArray(value)) {
        if (value.length === 1) {
          added.push(fieldPath)
        } else if (value.length === 3 && value[2] === 0) {
          removed.push(fieldPath)
        } else if (value.length === 2) {
          modified.push(fieldPath)
        }
      } else if (typeof value === 'object' && value !== null) {
        const nested = extractFields(value as Record<string, unknown>, fieldPath)
        added.push(...nested.added)
        removed.push(...nested.removed)
        modified.push(...nested.modified)
      }
    }

    return { added, removed, modified }
  }

  function compare(left: TestRun, right: TestRun): DiffResult {
    leftRun.value = left
    rightRun.value = right

    const leftOutput = left.output.parsed || {}
    const rightOutput = right.output.parsed || {}

    const delta = diff(leftOutput, rightOutput)
    
    if (!delta) {
      diffResult.value = {
        hasDifferences: false,
        delta: null,
        addedFields: [],
        removedFields: [],
        modifiedFields: []
      }
    } else {
      const fields = extractFields(delta as Record<string, unknown>)
      diffResult.value = {
        hasDifferences: true,
        delta,
        addedFields: fields.added,
        removedFields: fields.removed,
        modifiedFields: fields.modified
      }
    }

    return diffResult.value
  }

  function clear(): void {
    leftRun.value = null
    rightRun.value = null
    diffResult.value = null
  }

  const hasDifferences: ComputedRef<boolean> = computed(() => 
    diffResult.value?.hasDifferences ?? false
  )

  return {
    leftRun: readonly(leftRun),
    rightRun: readonly(rightRun),
    diffResult: readonly(diffResult),
    hasDifferences,
    compare,
    clear
  }
}
