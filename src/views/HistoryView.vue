<script setup lang="ts">
/**
 * HistoryView - Main history page
 * Displays test run history with filters, sorting, pagination, and bulk actions
 */

import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTestHistory, type HistoryFilters, type SortConfig } from '@/composables/useTestHistory'
import FilterPanel from '@/components/history/FilterPanel.vue'
import HistoryTable from '@/components/history/HistoryTable.vue'
import Pagination from '@/components/base/Pagination.vue'
import type { TestRun } from '@/types/models'

const router = useRouter()

const {
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
  hasNextPage,
  hasPrevPage,
  selectedCount,
  hasSelection,
  allSelected,
  hasActiveFilters,
  loadHistory,
  changeSort,
  applyFilterCriteria,
  clearFilters,
  goToPage,
  toggleSelection,
  toggleSelectAll,
  deleteRun,
  deleteSelected,
  initialize
} = useTestHistory()

// Delete confirmation modal state
const showDeleteModal = ref(false)
const deleteModalType = ref<'single' | 'bulk'>('single')
const deleteTargetId = ref<string>('')

// Store first selected run for comparison
const comparisonRunId = ref<string | null>(null)

/**
 * Initialize on mount
 */
onMounted(async () => {
  await initialize()
})

/**
 * Handle filter updates
 */
function handleFilterUpdate(newFilters: Partial<HistoryFilters>) {
  applyFilterCriteria(newFilters)
}

/**
 * Handle sort change
 */
function handleSort(field: SortConfig['field']) {
  changeSort(field)
}

/**
 * Handle page change
 */
function handlePageChange(page: number) {
  goToPage(page)
}

/**
 * View test run details
 */
async function viewRun(run: TestRun) {
  try {
    // Navigate to main view and load the run
    await router.push({ name: 'test-suite', query: { loadRun: run.id } })
  } catch (err) {
    console.error('Failed to navigate to test run:', err)
  }
}

/**
 * Start comparison flow
 */
async function startComparison(run: TestRun) {
  if (comparisonRunId.value === null) {
    // First run selected
    comparisonRunId.value = run.id
  } else if (comparisonRunId.value === run.id) {
    // Same run clicked, deselect
    comparisonRunId.value = null
  } else {
    // Second run selected, navigate to compare view
    try {
      await router.push({ 
        name: 'compare-with-ids', 
        params: { 
          id1: comparisonRunId.value, 
          id2: run.id 
        } 
      })
    } catch (err) {
      console.error('Failed to navigate to comparison view:', err)
    }
    comparisonRunId.value = null
  }
}

/**
 * Cancel comparison
 */
function cancelComparison() {
  comparisonRunId.value = null
}

/**
 * Confirm single delete
 */
function confirmDelete(id: string) {
  deleteTargetId.value = id
  deleteModalType.value = 'single'
  showDeleteModal.value = true
}

/**
 * Confirm bulk delete
 */
function confirmBulkDelete() {
  deleteModalType.value = 'bulk'
  showDeleteModal.value = true
}

/**
 * Execute delete action
 */
async function executeDelete() {
  if (deleteModalType.value === 'single') {
    await deleteRun(deleteTargetId.value)
  } else {
    await deleteSelected()
  }
  showDeleteModal.value = false
  deleteTargetId.value = ''
}

/**
 * Cancel delete
 */
function cancelDelete() {
  showDeleteModal.value = false
  deleteTargetId.value = ''
}

/**
 * Format count text for bulk delete
 */
const bulkDeleteText = computed(() => {
  const count = selectedCount.value
  return count === 1 ? '1 test run' : `${count} test runs`
})

/**
 * Get comparison banner message
 */
const comparisonMessage = computed(() => {
  if (comparisonRunId.value) {
    return 'Select a second test run to compare'
  }
  return ''
})
</script>

<template>
  <div class="history-view min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link to="/" class="text-gray-500 hover:text-gray-700">
              <i class="pi pi-arrow-left" />
            </router-link>
            <h1 class="text-2xl font-bold text-gray-900">Test History</h1>
          </div>
          
          <!-- Bulk actions -->
          <div class="flex items-center gap-2">
            <template v-if="hasSelection">
              <span class="text-sm text-gray-600">
                {{ selectedCount }} selected
              </span>
              <button
                @click="confirmBulkDelete"
                class="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <i class="pi pi-trash text-xs" />
                Delete Selected
              </button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Comparison Banner -->
    <div 
      v-if="comparisonRunId"
      class="bg-primary-600 text-white px-4 py-2"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i class="pi pi-arrows-alt" />
          <span>{{ comparisonMessage }}</span>
        </div>
        <button
          @click="cancelComparison"
          class="text-white/80 hover:text-white transition-colors flex items-center gap-1"
        >
          <i class="pi pi-times text-xs" />
          Cancel
        </button>
      </div>
    </div>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Error message -->
      <div 
        v-if="error"
        class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
      >
        <i class="pi pi-exclamation-circle" />
        <span>{{ error }}</span>
      </div>

      <!-- Filter panel -->
      <FilterPanel
        :filters="filters"
        :available-models="availableModels"
        :has-active-filters="hasActiveFilters"
        @update:filters="handleFilterUpdate"
        @clear="clearFilters"
      />

      <!-- History table -->
      <HistoryTable
        :runs="runs"
        :sort="sort"
        :selected-ids="selectedIds"
        :all-selected="allSelected"
        :is-loading="isLoading"
        @sort="handleSort"
        @toggle-selection="toggleSelection"
        @toggle-select-all="toggleSelectAll"
        @view="viewRun"
        @delete="confirmDelete"
        @compare="startComparison"
      />

      <!-- Pagination -->
      <Pagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-count="totalCount"
        :page-size="50"
        @page-change="handlePageChange"
      />
    </main>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div 
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div 
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          @click="cancelDelete"
        />
        
        <!-- Modal -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all sm:w-full sm:max-w-lg">
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <i class="pi pi-exclamation-triangle text-red-600" />
                </div>
                <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 id="modal-title" class="text-lg font-semibold leading-6 text-gray-900">
                    Confirm Delete
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      <template v-if="deleteModalType === 'single'">
                        Are you sure you want to delete this test run? This action cannot be undone.
                      </template>
                      <template v-else>
                        Are you sure you want to delete {{ bulkDeleteText }}? This action cannot be undone.
                      </template>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
              <button
                @click="executeDelete"
                class="inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto"
              >
                Delete
              </button>
              <button
                @click="cancelDelete"
                class="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.history-view {
  min-height: 100vh;
}
</style>
