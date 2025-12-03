<script setup lang="ts">
/**
 * DropZone Component
 * Drag-and-drop file upload interface with base64 conversion
 */

import { ref, computed } from 'vue'
import type { FileUploadData, FileUploadError } from '@/types/models'
import { useFileUpload } from '@/composables/useFileUpload'
import { formatFileSize } from '@/utils/formatters'
import { MAX_FILE_SIZE, WARNING_FILE_SIZE, LARGE_FILE_SIZE } from '@/utils/validators'

interface Props {
  modelValue?: File | null
  accept?: string[]
  maxSize?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  accept: () => ['pdf', 'jpg', 'jpeg', 'png'],
  maxSize: MAX_FILE_SIZE,
  disabled: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', file: File | null): void
  (e: 'file-selected', data: FileUploadData): void
  (e: 'error', error: FileUploadError): void
}>()

// Composable
const { uploadedFile, isProcessing, error, processFile, clearFile } = useFileUpload()

// Local state
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Computed
const acceptString = computed(() => {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  }
  return props.accept.map(ext => mimeTypes[ext] || ext).join(',')
})

const currentState = computed<'idle' | 'hover' | 'processing' | 'error' | 'success'>(() => {
  if (error.value) return 'error'
  if (isProcessing.value) return 'processing'
  if (isDragging.value) return 'hover'
  if (uploadedFile.value) return 'success'
  return 'idle'
})

const containerClasses = computed(() => {
  const base = 'relative flex flex-col items-center justify-center w-full min-h-48 p-6 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer'
  
  if (props.disabled) {
    return `${base} border-gray-200 bg-gray-50 cursor-not-allowed opacity-60`
  }

  switch (currentState.value) {
    case 'hover':
      return `${base} border-blue-500 bg-blue-50`
    case 'processing':
      return `${base} border-gray-300 bg-gray-50`
    case 'error':
      return `${base} border-red-500 bg-red-50`
    case 'success':
      return `${base} border-green-500 bg-green-50`
    default:
      return `${base} border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50`
  }
})

const showLargeFileWarning = computed(() => {
  return uploadedFile.value?.isLarge && !uploadedFile.value?.isVeryLarge
})

const showVeryLargeFileWarning = computed(() => {
  return uploadedFile.value?.isVeryLarge
})

// Methods
function handleDragEnter(event: DragEvent): void {
  event.preventDefault()
  if (!props.disabled) {
    isDragging.value = true
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  if (!props.disabled) {
    isDragging.value = true
  }
}

function handleDragLeave(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = false
}

async function handleDrop(event: DragEvent): Promise<void> {
  event.preventDefault()
  isDragging.value = false
  
  if (props.disabled) return

  const files = event.dataTransfer?.files
  if (!files || files.length === 0) {
    emit('error', {
      code: 'UNKNOWN',
      message: 'No file detected. Please try again.'
    })
    return
  }

  await handleFile(files[0])
}

function handleClick(): void {
  if (!props.disabled) {
    fileInputRef.value?.click()
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return
  
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleClick()
  }
  
  if (event.key === 'Escape' && uploadedFile.value) {
    handleClear()
  }
}

async function handleFileInput(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files
  
  if (files && files.length > 0) {
    await handleFile(files[0])
  }
  
  // Reset input to allow re-selecting same file
  input.value = ''
}

async function handleFile(file: File): Promise<void> {
  try {
    const fileData = await processFile(file, props.maxSize, props.accept)
    emit('update:modelValue', file)
    emit('file-selected', fileData)
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      emit('error', err as FileUploadError)
    }
  }
}

function handleClear(): void {
  clearFile()
  emit('update:modelValue', null)
}

function getFileTypeIcon(fileType: 'pdf' | 'image'): string {
  return fileType === 'pdf' ? 'pi-file-pdf' : 'pi-image'
}
</script>

<template>
  <div
    :class="containerClasses"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    :aria-busy="isProcessing"
    aria-label="File upload drop zone. Drop a file here or press Enter to browse."
    @click="handleClick"
    @keydown="handleKeyDown"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :accept="acceptString"
      :disabled="disabled"
      @change="handleFileInput"
    />

    <!-- Idle State -->
    <template v-if="currentState === 'idle'">
      <i class="pi pi-cloud-upload text-4xl text-gray-400 mb-3" aria-hidden="true" />
      <p class="text-gray-600 text-center font-medium">
        Drag & drop PDF or image here, or click to browse
      </p>
      <p class="text-gray-400 text-sm mt-2">
        Supported: PDF, JPG, PNG (max {{ formatFileSize(maxSize) }})
      </p>
    </template>

    <!-- Hover State -->
    <template v-else-if="currentState === 'hover'">
      <i class="pi pi-download text-4xl text-blue-500 mb-3" aria-hidden="true" />
      <p class="text-blue-600 text-center font-medium">
        Drop file here
      </p>
    </template>

    <!-- Processing State -->
    <template v-else-if="currentState === 'processing'">
      <i class="pi pi-spinner pi-spin text-4xl text-gray-500 mb-3" aria-hidden="true" />
      <p class="text-gray-600 text-center font-medium">
        Processing file...
      </p>
    </template>

    <!-- Error State -->
    <template v-else-if="currentState === 'error'">
      <i class="pi pi-times-circle text-4xl text-red-500 mb-3" aria-hidden="true" />
      <p class="text-red-600 text-center font-medium">
        {{ error?.message }}
      </p>
      <p v-if="error?.details" class="text-red-400 text-sm mt-2 text-center">
        {{ error.details }}
      </p>
      <button
        type="button"
        class="mt-4 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        @click.stop="handleClear"
      >
        Try again
      </button>
    </template>

    <!-- Success State -->
    <template v-else-if="currentState === 'success' && uploadedFile">
      <div class="flex items-center gap-3 mb-3">
        <i
          :class="['pi', getFileTypeIcon(uploadedFile.fileType), 'text-3xl text-green-500']"
          aria-hidden="true"
        />
        <i class="pi pi-check-circle text-2xl text-green-500" aria-hidden="true" />
      </div>
      <p class="text-gray-800 text-center font-medium truncate max-w-full px-4">
        {{ uploadedFile.fileName }}
      </p>
      <p class="text-gray-500 text-sm mt-1">
        {{ uploadedFile.sizeFormatted }}
      </p>

      <!-- Large file warning -->
      <div
        v-if="showLargeFileWarning"
        class="mt-3 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-lg"
      >
        <p class="text-yellow-700 text-sm flex items-center gap-2">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          Large file ({{ uploadedFile.sizeFormatted }}) - processing may take longer
        </p>
      </div>

      <!-- Very large file warning -->
      <div
        v-if="showVeryLargeFileWarning"
        class="mt-3 px-3 py-2 bg-orange-100 border border-orange-300 rounded-lg"
      >
        <p class="text-orange-700 text-sm flex items-center gap-2">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          Very large file ({{ uploadedFile.sizeFormatted }}) - consider using smaller files for faster processing
        </p>
      </div>

      <button
        type="button"
        class="mt-4 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        @click.stop="handleClear"
      >
        <i class="pi pi-times mr-2" aria-hidden="true" />
        Remove file
      </button>
    </template>
  </div>
</template>

<style scoped>
</style>
