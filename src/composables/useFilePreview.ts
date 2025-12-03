/**
 * Composable for file preview handling
 * Provides preview state management, loading control, and error handling
 */

import { ref, computed, watch, type Ref } from 'vue'
import type { FileUploadData } from '@/types/models'
import { base64ToDataUri, getImageDimensions, type ImageDimensions } from '@/utils/imageUtils'
import { pdfToDataUri, isValidPdf } from '@/utils/pdfUtils'
import { LARGE_FILE_SIZE, WARNING_FILE_SIZE } from '@/utils/validators'

/**
 * Preview state type
 */
export type PreviewState = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * Preview error interface
 */
export interface PreviewError {
  code: 'LOAD_FAILED' | 'INVALID_FILE' | 'UNSUPPORTED_TYPE' | 'UNKNOWN'
  message: string
  details?: string
}

/**
 * Preview data interface
 */
export interface PreviewData {
  dataUri: string
  dimensions?: ImageDimensions
  pageCount?: number
}

/**
 * File size thresholds for lazy loading strategy
 */
const SIZE_THRESHOLDS = {
  /** Files under 1MB: auto-load immediately */
  AUTO_LOAD: 1 * 1024 * 1024,
  /** Files 1-5MB: auto-load with warning */
  WARNING: WARNING_FILE_SIZE,
  /** Files over 5MB: require manual load */
  MANUAL_LOAD: LARGE_FILE_SIZE
} as const

/**
 * Determine loading strategy based on file size
 */
export function getLoadingStrategy(size: number): 'auto' | 'auto-warning' | 'manual' {
  if (size > SIZE_THRESHOLDS.MANUAL_LOAD) {
    return 'manual'
  }
  if (size > SIZE_THRESHOLDS.AUTO_LOAD) {
    return 'auto-warning'
  }
  return 'auto'
}

/**
 * File preview composable for managing preview state and loading
 * 
 * @param fileData - Reactive reference to FileUploadData
 * @param autoLoad - Whether to auto-load preview (default: based on file size)
 */
export function useFilePreview(
  fileData: Ref<FileUploadData | null>,
  autoLoad: Ref<boolean | undefined> = ref(undefined)
) {
  // State
  const state = ref<PreviewState>('idle')
  const error = ref<PreviewError | null>(null)
  const previewData = ref<PreviewData | null>(null)
  const retryCount = ref(0)

  // Computed
  const isLoading = computed(() => state.value === 'loading')
  const isLoaded = computed(() => state.value === 'loaded')
  const hasError = computed(() => state.value === 'error')
  
  const loadingStrategy = computed(() => {
    if (!fileData.value) return 'auto'
    return getLoadingStrategy(fileData.value.size)
  })

  const shouldAutoLoad = computed(() => {
    // If explicitly set, use that value
    if (autoLoad.value !== undefined) {
      return autoLoad.value
    }
    // Otherwise, use size-based strategy
    return loadingStrategy.value !== 'manual'
  })

  const showWarning = computed(() => {
    return loadingStrategy.value === 'auto-warning'
  })

  const requiresManualLoad = computed(() => {
    return loadingStrategy.value === 'manual' && !isLoaded.value
  })

  /**
   * Load preview for the current file
   */
  async function loadPreview(): Promise<void> {
    const file = fileData.value
    
    if (!file) {
      state.value = 'idle'
      previewData.value = null
      return
    }

    state.value = 'loading'
    error.value = null

    try {
      if (file.fileType === 'image') {
        await loadImagePreview(file)
      } else if (file.fileType === 'pdf') {
        await loadPdfPreview(file)
      } else {
        throw {
          code: 'UNSUPPORTED_TYPE' as const,
          message: 'Unsupported file type',
          details: `Cannot preview files of type: ${file.mimeType}`
        }
      }
      
      state.value = 'loaded'
      retryCount.value = 0
    } catch (err) {
      state.value = 'error'
      
      if (isPreviewError(err)) {
        error.value = err
      } else {
        error.value = {
          code: 'UNKNOWN',
          message: 'Failed to load preview',
          details: err instanceof Error ? err.message : 'Unknown error occurred'
        }
      }
    }
  }

  /**
   * Load image preview
   */
  async function loadImagePreview(file: FileUploadData): Promise<void> {
    const dataUri = base64ToDataUri(file.base64Content, file.mimeType)
    
    // Get image dimensions
    const dimensions = await getImageDimensions(dataUri)
    
    if (!dimensions) {
      throw {
        code: 'INVALID_FILE' as const,
        message: 'Could not load image',
        details: 'The image file appears to be corrupted or invalid'
      }
    }
    
    previewData.value = {
      dataUri,
      dimensions
    }
  }

  /**
   * Load PDF preview
   */
  async function loadPdfPreview(file: FileUploadData): Promise<void> {
    // Validate PDF
    if (!isValidPdf(file.base64Content)) {
      throw {
        code: 'INVALID_FILE' as const,
        message: 'Invalid PDF file',
        details: 'The file does not appear to be a valid PDF'
      }
    }
    
    const dataUri = pdfToDataUri(file.base64Content)
    
    previewData.value = {
      dataUri
      // pageCount will be set by the PDF component after loading
    }
  }

  /**
   * Retry loading preview
   */
  async function retry(): Promise<void> {
    retryCount.value++
    await loadPreview()
  }

  /**
   * Clear preview state
   */
  function clearPreview(): void {
    state.value = 'idle'
    error.value = null
    previewData.value = null
    retryCount.value = 0
  }

  /**
   * Update page count (called by PDF component)
   */
  function setPageCount(count: number): void {
    if (previewData.value) {
      previewData.value.pageCount = count
    }
  }

  // Type guard for PreviewError
  function isPreviewError(obj: unknown): obj is PreviewError {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'code' in obj &&
      'message' in obj
    )
  }

  // Watch for file changes and auto-load if needed
  watch(
    () => fileData.value,
    (newFile) => {
      if (newFile) {
        if (shouldAutoLoad.value) {
          loadPreview()
        } else {
          state.value = 'idle'
        }
      } else {
        clearPreview()
      }
    },
    { immediate: true }
  )

  return {
    // State
    state,
    error,
    previewData,
    retryCount,
    
    // Computed
    isLoading,
    isLoaded,
    hasError,
    loadingStrategy,
    shouldAutoLoad,
    showWarning,
    requiresManualLoad,
    
    // Methods
    loadPreview,
    retry,
    clearPreview,
    setPageCount
  }
}
