<script setup lang="ts">
/**
 * Pagination - Pagination controls component
 * Displays page navigation with previous/next buttons and page numbers
 */

import { computed } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize?: number
  maxVisiblePages?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 50,
  maxVisiblePages: 5
})

const emit = defineEmits<{
  (e: 'page-change', page: number): void
}>()

const hasPrevPage = computed(() => props.currentPage > 1)
const hasNextPage = computed(() => props.currentPage < props.totalPages)

/**
 * Calculate visible page numbers
 */
const visiblePages = computed(() => {
  const pages: number[] = []
  const total = props.totalPages
  const current = props.currentPage
  const maxVisible = props.maxVisiblePages

  if (total <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show pages around current with ellipsis
    const half = Math.floor(maxVisible / 2)
    let start = current - half
    let end = current + half

    if (start < 1) {
      start = 1
      end = maxVisible
    }

    if (end > total) {
      end = total
      start = total - maxVisible + 1
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
  }

  return pages
})

const showFirstEllipsis = computed(() => 
  props.totalPages > props.maxVisiblePages && visiblePages.value[0] > 1
)

const showLastEllipsis = computed(() => 
  props.totalPages > props.maxVisiblePages && 
  visiblePages.value[visiblePages.value.length - 1] < props.totalPages
)

/**
 * Calculate display range
 */
const displayRange = computed(() => {
  const start = (props.currentPage - 1) * props.pageSize + 1
  const end = Math.min(props.currentPage * props.pageSize, props.totalCount)
  return { start, end }
})

function goToPage(page: number) {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('page-change', page)
  }
}

function prevPage() {
  if (hasPrevPage.value) {
    emit('page-change', props.currentPage - 1)
  }
}

function nextPage() {
  if (hasNextPage.value) {
    emit('page-change', props.currentPage + 1)
  }
}
</script>

<template>
  <div 
    v-if="totalPages > 0"
    class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200"
  >
    <!-- Results count -->
    <div class="text-sm text-gray-700">
      Showing
      <span class="font-medium">{{ displayRange.start }}</span>
      to
      <span class="font-medium">{{ displayRange.end }}</span>
      of
      <span class="font-medium">{{ totalCount }}</span>
      results
    </div>

    <!-- Page navigation -->
    <nav class="flex items-center gap-1" aria-label="Pagination">
      <!-- Previous button -->
      <button
        @click="prevPage"
        :disabled="!hasPrevPage"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          hasPrevPage 
            ? 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300' 
            : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
        ]"
        :aria-disabled="!hasPrevPage"
      >
        <i class="pi pi-chevron-left text-xs" aria-hidden="true" />
        <span class="ml-1">Previous</span>
      </button>

      <!-- First page + ellipsis -->
      <template v-if="showFirstEllipsis">
        <button
          @click="goToPage(1)"
          class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
        >
          1
        </button>
        <span class="px-2 py-2 text-gray-500">...</span>
      </template>

      <!-- Page numbers -->
      <button
        v-for="page in visiblePages"
        :key="page"
        @click="goToPage(page)"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          page === currentPage
            ? 'z-10 bg-primary-600 text-white border border-primary-600'
            : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
        ]"
        :aria-current="page === currentPage ? 'page' : undefined"
      >
        {{ page }}
      </button>

      <!-- Last ellipsis + last page -->
      <template v-if="showLastEllipsis">
        <span class="px-2 py-2 text-gray-500">...</span>
        <button
          @click="goToPage(totalPages)"
          class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
        >
          {{ totalPages }}
        </button>
      </template>

      <!-- Next button -->
      <button
        @click="nextPage"
        :disabled="!hasNextPage"
        :class="[
          'relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          hasNextPage 
            ? 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300' 
            : 'text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200'
        ]"
        :aria-disabled="!hasNextPage"
      >
        <span class="mr-1">Next</span>
        <i class="pi pi-chevron-right text-xs" aria-hidden="true" />
      </button>
    </nav>
  </div>
</template>

<style scoped>
</style>
