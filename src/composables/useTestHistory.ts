/**
 * useTestHistory Composable
 * Manages test history browsing with filters, sorting, pagination, and bulk operations
 */

import { ref, computed, watch } from 'vue'
import { db, fromStoredTestRun, type StoredTestRun } from '@/db'
import type { TestRun, PipelineType, TestStatus } from '@/types/models'

/**
 * Filter criteria for test history
 */
export interface HistoryFilters {
  search: string
  pipeline: PipelineType | ''
  model: string
  status: TestStatus | ''
  dateFrom: string  // ISO date string (YYYY-MM-DD)
  dateTo: string    // ISO date string (YYYY-MM-DD)
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: 'timestamp' | 'modelName' | 'duration' | 'status'
  direction: 'asc' | 'desc'
}

/**
 * Default filter values
 */
const defaultFilters: HistoryFilters = {
  search: '',
  pipeline: '',
  model: '',
  status: '',
  dateFrom: '',
  dateTo: ''
}

/**
 * Default sort configuration
 */
const defaultSort: SortConfig = {
  field: 'timestamp',
  direction: 'desc'
}

/**
 * Items per page
 */
const PAGE_SIZE = 50

/**
 * Composable for browsing and managing test history
 */
export function useTestHistory() {
  // State
  const runs = ref<TestRun[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<HistoryFilters>({ ...defaultFilters })
  const sort = ref<SortConfig>({ ...defaultSort })
  const selectedIds = ref<Set<string>>(new Set())

  // Computed
  const totalPages = computed(() => Math.ceil(totalCount.value / PAGE_SIZE))
  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPrevPage = computed(() => currentPage.value > 1)
  const selectedCount = computed(() => selectedIds.value.size)
  const hasSelection = computed(() => selectedIds.value.size > 0)
  const allSelected = computed(() => 
    runs.value.length > 0 && selectedIds.value.size === runs.value.length
  )

  /**
   * Available models from loaded runs (for filter dropdown)
   */
  const availableModels = ref<string[]>([])

  /**
   * Load available models from database
   */
  async function loadAvailableModels(): Promise<void> {
    try {
      const allRuns = await db.testRuns.toArray()
      const models = new Set<string>()
      for (const run of allRuns) {
        models.add(run.modelName)
        if (run.ocrModel) {
          models.add(run.ocrModel)
        }
      }
      availableModels.value = Array.from(models).sort()
    } catch (err) {
      console.error('Failed to load available models:', err)
    }
  }

  /**
   * Apply filters to query results
   */
  function applyFilters(run: StoredTestRun): boolean {
    // Search filter (filename)
    if (filters.value.search) {
      const searchLower = filters.value.search.toLowerCase()
      if (!run.input.fileName.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Pipeline filter
    if (filters.value.pipeline && run.pipeline !== filters.value.pipeline) {
      return false
    }

    // Model filter
    if (filters.value.model) {
      if (run.modelName !== filters.value.model && run.ocrModel !== filters.value.model) {
        return false
      }
    }

    // Status filter
    if (filters.value.status && run.status !== filters.value.status) {
      return false
    }

    // Date range filter
    if (filters.value.dateFrom) {
      const runDate = new Date(run.timestamp).toISOString().split('T')[0]
      if (runDate < filters.value.dateFrom) {
        return false
      }
    }

    if (filters.value.dateTo) {
      const runDate = new Date(run.timestamp).toISOString().split('T')[0]
      if (runDate > filters.value.dateTo) {
        return false
      }
    }

    return true
  }

  /**
   * Sort comparator
   */
  function sortComparator(a: StoredTestRun, b: StoredTestRun): number {
    const dir = sort.value.direction === 'asc' ? 1 : -1
    
    switch (sort.value.field) {
      case 'timestamp': {
        const aTime = new Date(a.timestamp).getTime()
        const bTime = new Date(b.timestamp).getTime()
        return (aTime - bTime) * dir
      }
      case 'modelName':
        return a.modelName.localeCompare(b.modelName) * dir
      case 'duration':
        return (a.duration - b.duration) * dir
      case 'status': {
        const statusOrder: Record<TestStatus, number> = { success: 0, error: 1, cancelled: 2 }
        return (statusOrder[a.status] - statusOrder[b.status]) * dir
      }
      default:
        return 0
    }
  }

  /**
   * Load history with current filters and pagination
   */
  async function loadHistory(page: number = 1): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      // Get all runs and apply filters
      const allRuns = await db.testRuns.toArray()
      const filteredRuns = allRuns.filter(applyFilters)
      
      // Sort results
      filteredRuns.sort(sortComparator)
      
      // Update total count
      totalCount.value = filteredRuns.length
      
      // Calculate pagination
      const offset = (page - 1) * PAGE_SIZE
      const paginatedRuns = filteredRuns.slice(offset, offset + PAGE_SIZE)
      
      // Convert to TestRun type
      runs.value = paginatedRuns.map(fromStoredTestRun)
      currentPage.value = page

      // Clear selections when changing pages
      selectedIds.value = new Set()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load history'
      console.error('Failed to load history:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Change sort configuration
   */
  function changeSort(field: SortConfig['field']): void {
    if (sort.value.field === field) {
      // Toggle direction
      sort.value.direction = sort.value.direction === 'asc' ? 'desc' : 'asc'
    } else {
      // New field, default to descending for timestamp, ascending for others
      sort.value.field = field
      sort.value.direction = field === 'timestamp' ? 'desc' : 'asc'
    }
    // Reload with current page 1
    loadHistory(1)
  }

  /**
   * Apply new filters
   */
  function applyFilterCriteria(newFilters: Partial<HistoryFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
    // Reset to page 1 when filters change
    loadHistory(1)
  }

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    filters.value = { ...defaultFilters }
    loadHistory(1)
  }

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = computed(() => {
    return (
      filters.value.search !== '' ||
      filters.value.pipeline !== '' ||
      filters.value.model !== '' ||
      filters.value.status !== '' ||
      filters.value.dateFrom !== '' ||
      filters.value.dateTo !== ''
    )
  })

  /**
   * Go to next page
   */
  function nextPage(): void {
    if (hasNextPage.value) {
      loadHistory(currentPage.value + 1)
    }
  }

  /**
   * Go to previous page
   */
  function prevPage(): void {
    if (hasPrevPage.value) {
      loadHistory(currentPage.value - 1)
    }
  }

  /**
   * Go to specific page
   */
  function goToPage(page: number): void {
    if (page >= 1 && page <= totalPages.value) {
      loadHistory(page)
    }
  }

  /**
   * Toggle selection of a single run
   */
  function toggleSelection(id: string): void {
    const newSet = new Set(selectedIds.value)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    selectedIds.value = newSet
  }

  /**
   * Select all runs on current page
   */
  function selectAll(): void {
    selectedIds.value = new Set(runs.value.map(run => run.id))
  }

  /**
   * Deselect all runs
   */
  function deselectAll(): void {
    selectedIds.value = new Set()
  }

  /**
   * Toggle select all
   */
  function toggleSelectAll(): void {
    if (allSelected.value) {
      deselectAll()
    } else {
      selectAll()
    }
  }

  /**
   * Delete a single run
   */
  async function deleteRun(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      // Delete from database
      const run = await db.testRuns.get(id)
      if (run?.input.fileRef) {
        await db.files.delete(run.input.fileRef)
      }
      await db.testRuns.delete(id)
      
      // Remove from selections
      const newSet = new Set(selectedIds.value)
      newSet.delete(id)
      selectedIds.value = newSet
      
      // Reload current page
      await loadHistory(currentPage.value)
      
      // If page is now empty and not first page, go to previous
      if (runs.value.length === 0 && currentPage.value > 1) {
        await loadHistory(currentPage.value - 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete run'
      console.error('Failed to delete run:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete multiple runs
   */
  async function deleteMultiple(ids: string[]): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      // Delete each run and its files
      for (const id of ids) {
        const run = await db.testRuns.get(id)
        if (run?.input.fileRef) {
          await db.files.delete(run.input.fileRef)
        }
        await db.testRuns.delete(id)
      }
      
      // Clear selections
      selectedIds.value = new Set()
      
      // Reload current page
      await loadHistory(currentPage.value)
      
      // If page is now empty and not first page, go to previous
      if (runs.value.length === 0 && currentPage.value > 1) {
        await loadHistory(currentPage.value - 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete runs'
      console.error('Failed to delete runs:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Delete selected runs
   */
  async function deleteSelected(): Promise<void> {
    const ids = Array.from(selectedIds.value)
    if (ids.length > 0) {
      await deleteMultiple(ids)
    }
  }

  /**
   * Initialize history loading
   */
  async function initialize(): Promise<void> {
    await Promise.all([
      loadHistory(1),
      loadAvailableModels()
    ])
  }

  return {
    // State
    runs,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    error,
    filters,
    sort,
    selectedIds,
    availableModels,

    // Computed
    hasNextPage,
    hasPrevPage,
    selectedCount,
    hasSelection,
    allSelected,
    hasActiveFilters,

    // Actions
    loadHistory,
    changeSort,
    applyFilterCriteria,
    clearFilters,
    nextPage,
    prevPage,
    goToPage,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    deleteRun,
    deleteMultiple,
    deleteSelected,
    initialize,
    loadAvailableModels
  }
}
