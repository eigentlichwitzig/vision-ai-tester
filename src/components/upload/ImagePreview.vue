<script setup lang="ts">
/**
 * ImagePreview Component
 * Renders image files with dimensions and aspect ratio information
 * Supports thumbnail display for large images (>1MB)
 */

import { computed, ref, watch, onUnmounted } from 'vue'
import { base64ToDataUri, getImageDimensions, formatDimensions, calculateAspectRatio, calculateScaledDimensions, type ImageDimensions } from '@/utils/imageUtils'

interface Props {
  /** Raw base64 content (without data URI prefix) */
  base64Content: string
  /** MIME type of the image */
  mimeType: string
  /** File name for alt text */
  fileName: string
  /** Maximum display width in pixels */
  maxWidth?: number
  /** Maximum display height in pixels */
  maxHeight?: number
  /** Optional thumbnail data URI for large images */
  thumbnail?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxWidth: 400,
  maxHeight: 500,
  thumbnail: undefined
})

const emit = defineEmits<{
  (e: 'loaded', dimensions: ImageDimensions): void
  (e: 'error', message: string): void
}>()

// State
const isLoading = ref(true)
const hasError = ref(false)
const errorMessage = ref('')
const dimensions = ref<ImageDimensions | null>(null)
const dataUri = ref('')
const isUsingThumbnail = ref(false)

// Computed
const displayDimensions = computed(() => {
  if (!dimensions.value) return null
  return calculateScaledDimensions(dimensions.value, props.maxWidth, props.maxHeight)
})

const dimensionsText = computed(() => {
  if (!dimensions.value) return ''
  return formatDimensions(dimensions.value)
})

const aspectRatioText = computed(() => {
  if (!dimensions.value) return ''
  return calculateAspectRatio(dimensions.value)
})

const containerStyle = computed(() => {
  if (!displayDimensions.value) {
    return {
      maxWidth: `${props.maxWidth}px`,
      maxHeight: `${props.maxHeight}px`
    }
  }
  return {
    maxWidth: `${displayDimensions.value.width}px`
  }
})

// Methods
async function loadImage(): Promise<void> {
  isLoading.value = true
  hasError.value = false
  errorMessage.value = ''
  
  try {
    // Use thumbnail if available (for large images >1MB)
    if (props.thumbnail) {
      dataUri.value = props.thumbnail
      isUsingThumbnail.value = true
    } else {
      // Convert base64 to data URI for browser rendering
      dataUri.value = base64ToDataUri(props.base64Content, props.mimeType)
      isUsingThumbnail.value = false
    }
    
    // Get image dimensions from displayed image (thumbnail or original)
    const dims = await getImageDimensions(dataUri.value)
    
    if (!dims) {
      throw new Error('Failed to load image dimensions')
    }
    
    dimensions.value = dims
    isLoading.value = false
    emit('loaded', dims)
  } catch (err) {
    isLoading.value = false
    hasError.value = true
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load image'
    emit('error', errorMessage.value)
  }
}

function handleImageError(): void {
  isLoading.value = false
  hasError.value = true
  errorMessage.value = 'The image could not be displayed'
  emit('error', errorMessage.value)
}

// Watch for content changes
watch(
  () => props.base64Content,
  () => {
    loadImage()
  },
  { immediate: true }
)

// Cleanup
onUnmounted(() => {
  dataUri.value = ''
  dimensions.value = null
})
</script>

<template>
  <div class="image-preview" :style="containerStyle">
    <!-- Loading skeleton -->
    <div 
      v-if="isLoading" 
      class="skeleton-container"
      role="status"
      aria-label="Loading image preview"
    >
      <div class="skeleton animate-pulse bg-gray-200 rounded-lg" />
      <p class="text-gray-500 text-sm mt-2 text-center">Loading image...</p>
    </div>

    <!-- Error state -->
    <div 
      v-else-if="hasError" 
      class="error-container flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
    >
      <i class="pi pi-exclamation-triangle text-3xl text-red-500 mb-3" aria-hidden="true" />
      <p class="text-red-600 font-medium">Image Preview Failed</p>
      <p class="text-red-500 text-sm mt-1">{{ errorMessage }}</p>
      <p class="text-gray-500 text-xs mt-2">The image file may be corrupted or in an unsupported format</p>
    </div>

    <!-- Image loaded -->
    <div v-else class="image-container">
      <img
        :src="dataUri"
        :alt="`Preview of ${fileName}`"
        class="max-w-full h-auto rounded-lg shadow-sm border border-gray-200"
        :style="{ maxHeight: `${maxHeight}px` }"
        @error="handleImageError"
      />
      
      <!-- Dimensions info -->
      <div class="mt-2 flex items-center justify-center gap-3 text-sm text-gray-500">
        <span class="flex items-center gap-1">
          <i class="pi pi-image text-xs" aria-hidden="true" />
          {{ dimensionsText }}
        </span>
        <span class="text-gray-300">|</span>
        <span>{{ aspectRatioText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-preview {
  width: 100%;
  max-width: 400px;
  max-height: 500px;
  overflow: auto;
}

.skeleton-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.skeleton {
  width: 100%;
  height: 200px;
  min-height: 200px;
}

.error-container {
  min-height: 150px;
}

.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-container img {
  object-fit: contain;
  max-width: 100%;
  max-height: 400px;
}

/* Responsive breakpoints */
@media (max-width: 1024px) {
  .image-preview {
    max-width: 300px;
    max-height: 400px;
  }
  .image-container img {
    max-height: 320px;
  }
}

@media (max-width: 768px) {
  .image-preview {
    max-width: 250px;
    max-height: 350px;
  }
  .image-container img {
    max-height: 280px;
  }
}
</style>
