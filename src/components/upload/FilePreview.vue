<script setup lang="ts">
/**
 * FilePreview Component
 * Main coordinator component that detects file type and routes to appropriate preview
 * Implements smart lazy loading for large files to maintain performance
 */

import { computed, toRef } from 'vue'
import type { FileUploadData } from '@/types/models'
import { useFilePreview } from '@/composables/useFilePreview'
import { formatFileSize } from '@/utils/formatters'
import ImagePreview from './ImagePreview.vue'
import PdfPreview from './PdfPreview.vue'

interface Props {
  /** File data from useFileUpload composable */
  fileData: FileUploadData
  /** Maximum display width in pixels */
  maxWidth?: number
  /** Maximum display height in pixels */
  maxHeight?: number
  /** Auto-load preview (default: true for files < 5MB) */
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 400,
  maxHeight: 500,
  autoLoad: undefined
})

const emit = defineEmits<{
  (e: 'loaded'): void
  (e: 'error', message: string): void
}>()

// Create refs for the composable
const fileDataRef = toRef(props, 'fileData')
const autoLoadRef = toRef(props, 'autoLoad')

// Use the preview composable
const {
  state,
  error,
  isLoading,
  hasError,
  showWarning,
  requiresManualLoad,
  loadingStrategy,
  loadPreview,
  retry
} = useFilePreview(fileDataRef, autoLoadRef)

// Computed
const isImage = computed(() => props.fileData.fileType === 'image')
const isPdf = computed(() => props.fileData.fileType === 'pdf')

const fileTypeIcon = computed(() => {
  return isPdf.value ? 'pi-file-pdf' : 'pi-image'
})

const fileTypeLabel = computed(() => {
  return isPdf.value ? 'PDF Document' : 'Image'
})

// File metadata for display
const metadata = computed(() => ({
  name: props.fileData.fileName,
  size: props.fileData.sizeFormatted,
  type: fileTypeLabel.value,
  mimeType: props.fileData.mimeType
}))

// Methods
function handleImageLoaded(): void {
  emit('loaded')
}

function handlePdfLoaded(pageCount: number): void {
  emit('loaded')
}

function handleError(message: string): void {
  emit('error', message)
}

async function handleLoadPreview(): Promise<void> {
  await loadPreview()
}

async function handleRetry(): Promise<void> {
  await retry()
}
</script>

<template>
  <div 
    class="file-preview w-full" 
    :style="{ maxWidth: `${maxWidth}px` }"
    role="region"
    :aria-label="`File preview for ${metadata.name}`"
  >
    <!-- File metadata header -->
    <div class="file-metadata mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div class="flex items-center gap-3">
        <i 
          :class="['pi', fileTypeIcon, 'text-2xl text-gray-600']" 
          aria-hidden="true" 
        />
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-medium text-gray-800 truncate" :title="metadata.name">
            {{ metadata.name }}
          </h3>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ metadata.type }} • {{ metadata.size }}
          </p>
        </div>
      </div>
    </div>

    <!-- Large file warning -->
    <div 
      v-if="showWarning && !requiresManualLoad" 
      class="warning-banner mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg"
    >
      <p class="text-yellow-700 text-sm flex items-center gap-2">
        <i class="pi pi-exclamation-triangle" aria-hidden="true" />
        Large file - preview may take longer to load
      </p>
    </div>

    <!-- Manual load button for very large files -->
    <div 
      v-if="requiresManualLoad" 
      class="manual-load-container p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center"
    >
      <i class="pi pi-eye text-4xl text-gray-400 mb-3" aria-hidden="true" />
      <p class="text-gray-600 font-medium mb-1">Preview Not Loaded</p>
      <p class="text-gray-500 text-sm mb-4">
        This file is {{ formatFileSize(fileData.size) }}. Load preview to see contents.
      </p>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        @click="handleLoadPreview"
      >
        <i class="pi pi-play mr-2" aria-hidden="true" />
        Load Preview
      </button>
    </div>

    <!-- Loading skeleton -->
    <div 
      v-else-if="isLoading" 
      class="loading-skeleton"
      role="status"
      aria-label="Loading file preview"
    >
      <div class="skeleton-box animate-pulse bg-gray-200 rounded-lg h-64 w-full" />
      <p class="text-gray-500 text-sm mt-3 text-center">
        Loading {{ fileTypeLabel.toLowerCase() }} preview...
      </p>
    </div>

    <!-- Error state -->
    <div 
      v-else-if="hasError" 
      class="error-container p-6 bg-red-50 border border-red-200 rounded-lg text-center"
      role="alert"
    >
      <i class="pi pi-times-circle text-4xl text-red-500 mb-3" aria-hidden="true" />
      <p class="text-red-600 font-medium">Preview Failed</p>
      <p class="text-red-500 text-sm mt-1">{{ error?.message }}</p>
      <p v-if="error?.details" class="text-gray-500 text-xs mt-2">
        {{ error.details }}
      </p>
      <button
        type="button"
        class="mt-4 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click="handleRetry"
      >
        <i class="pi pi-refresh mr-2" aria-hidden="true" />
        Try Again
      </button>
    </div>

    <!-- Image preview -->
    <ImagePreview
      v-else-if="isImage && state === 'loaded'"
      :base64-content="fileData.base64Content"
      :mime-type="fileData.mimeType"
      :file-name="fileData.fileName"
      :thumbnail="fileData.thumbnail"
      :max-width="maxWidth"
      :max-height="maxHeight"
      @loaded="handleImageLoaded"
      @error="handleError"
    />

    <!-- PDF preview -->
    <PdfPreview
      v-else-if="isPdf && state === 'loaded'"
      :base64-content="fileData.base64Content"
      :file-name="fileData.fileName"
      :max-width="maxWidth"
      :max-height="maxHeight"
      @loaded="handlePdfLoaded"
      @error="handleError"
    />
  </div>
</template>

<style scoped>
.file-preview {
  display: flex;
  flex-direction: column;
  max-width: 400px;
  max-height: 500px;
  overflow: auto;
}

.file-metadata h3 {
  max-width: 100%;
}

.skeleton-box {
  min-height: 200px;
}

/* Responsive breakpoints */
@media (max-width: 1024px) {
  .file-preview {
    max-width: 300px;
    max-height: 400px;
  }
}

@media (max-width: 768px) {
  .file-preview {
    max-width: 250px;
    max-height: 350px;
  }
}
</style>
