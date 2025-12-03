<script setup lang="ts">
/**
 * PdfPreview Component
 * Renders the first page of PDF files using @tato30/vue-pdf
 */

import { computed, ref, watch } from 'vue'
import { VuePDF, usePDF } from '@tato30/vue-pdf'
import { pdfToDataUri } from '@/utils/pdfUtils'

interface Props {
  /** Raw base64 content (without data URI prefix) */
  base64Content: string
  /** File name for accessibility */
  fileName: string
  /** Maximum display width in pixels */
  maxWidth?: number
  /** Maximum display height?: number */
  maxHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 800,
  maxHeight: 600
})

const emit = defineEmits<{
  (e: 'loaded', pageCount: number): void
  (e: 'error', message: string): void
}>()

// State
const currentPage = ref(1)
const hasLoadError = ref(false)
const errorMessage = ref('')

// Convert base64 to data URI for pdf.js
const pdfSource = computed(() => {
  return pdfToDataUri(props.base64Content)
})

// Use the PDF composable
const { pdf, pages, info } = usePDF(pdfSource)

// Computed
const isLoading = computed(() => {
  return !pdf.value && !hasLoadError.value
})

const totalPages = computed(() => {
  return pages.value || 0
})

const pageInfo = computed(() => {
  if (!totalPages.value) return ''
  return `Page ${currentPage.value} of ${totalPages.value}`
})

const containerStyle = computed(() => ({
  maxWidth: `${props.maxWidth}px`,
  maxHeight: `${props.maxHeight}px`
}))

// Methods
function handleRendered(): void {
  if (totalPages.value > 0 && !hasLoadError.value) {
    emit('loaded', totalPages.value)
  }
}

function handleError(error: Error): void {
  hasLoadError.value = true
  errorMessage.value = error.message || 'Failed to load PDF'
  emit('error', errorMessage.value)
}

function goToPreviousPage(): void {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function goToNextPage(): void {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// Watch for pdf changes to emit loaded event
watch(
  () => pages.value,
  (newPages) => {
    if (newPages && newPages > 0) {
      emit('loaded', newPages)
    }
  }
)

// Watch for base64 content changes and reset state
watch(
  () => props.base64Content,
  () => {
    currentPage.value = 1
    hasLoadError.value = false
    errorMessage.value = ''
  }
)
</script>

<template>
  <div class="pdf-preview" :style="containerStyle">
    <!-- Loading skeleton -->
    <div 
      v-if="isLoading" 
      class="skeleton-container"
      role="status"
      aria-label="Loading PDF preview"
    >
      <div class="skeleton animate-pulse bg-gray-200 rounded-lg" />
      <p class="text-gray-500 text-sm mt-2 text-center">Loading PDF...</p>
    </div>

    <!-- Error state -->
    <div 
      v-else-if="hasLoadError" 
      class="error-container flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
    >
      <i class="pi pi-exclamation-triangle text-3xl text-red-500 mb-3" aria-hidden="true" />
      <p class="text-red-600 font-medium">PDF Preview Failed</p>
      <p class="text-red-500 text-sm mt-1">{{ errorMessage }}</p>
      <p class="text-gray-500 text-xs mt-2">The PDF file may be corrupted, password-protected, or in an unsupported format</p>
    </div>

    <!-- PDF loaded -->
    <div v-else class="pdf-container">
      <!-- PDF Viewer -->
      <div 
        class="pdf-viewer-wrapper border border-gray-200 rounded-lg overflow-hidden bg-gray-100"
        :aria-label="`PDF preview of ${fileName}, ${pageInfo}`"
      >
        <VuePDF 
          :pdf="pdf" 
          :page="currentPage"
          :fit-parent="true"
          @rendered="handleRendered"
          @error="handleError"
        />
      </div>
      
      <!-- Page navigation -->
      <div class="mt-3 flex items-center justify-center gap-4">
        <!-- Previous page button -->
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="currentPage <= 1"
          aria-label="Previous page"
          @click="goToPreviousPage"
        >
          <i class="pi pi-chevron-left text-xs" aria-hidden="true" />
        </button>
        
        <!-- Page info -->
        <span class="text-sm text-gray-600 min-w-[100px] text-center">
          {{ pageInfo }}
        </span>
        
        <!-- Next page button -->
        <button
          type="button"
          class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="currentPage >= totalPages"
          aria-label="Next page"
          @click="goToNextPage"
        >
          <i class="pi pi-chevron-right text-xs" aria-hidden="true" />
        </button>
      </div>

      <!-- PDF metadata -->
      <div v-if="info" class="mt-2 text-center">
        <span class="text-xs text-gray-400">
          <i class="pi pi-file-pdf mr-1" aria-hidden="true" />
          {{ totalPages }} page{{ totalPages !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-preview {
  width: 100%;
}

.skeleton-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.skeleton {
  width: 100%;
  height: 300px;
  min-height: 300px;
}

.error-container {
  min-height: 150px;
}

.pdf-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pdf-viewer-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

/* Override vue-pdf styles for better display */
.pdf-viewer-wrapper :deep(canvas) {
  max-width: 100%;
  height: auto !important;
}
</style>
