/**
 * Composable for handling file uploads
 * 
 * TODO: Implement full file upload handling with:
 * - Drag and drop support
 * - File validation (type, size)
 * - Base64 conversion
 * - Thumbnail generation for PDFs
 */

import { ref, readonly, type Ref } from 'vue'
import type { TestInput, FileType } from '@/types/models'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const SUPPORTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export function useFileUpload() {
  const file: Ref<File | null> = ref(null)
  const testInput: Ref<TestInput | null> = ref(null)
  const isProcessing: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  function validateFile(f: File): boolean {
    error.value = null
    
    if (!SUPPORTED_TYPES.includes(f.type)) {
      error.value = `Unsupported file type: ${f.type}. Supported types: PDF, JPEG, PNG, WebP`
      return false
    }
    
    if (f.size > MAX_FILE_SIZE) {
      error.value = `File too large: ${(f.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 20MB`
      return false
    }
    
    return true
  }

  async function readAsBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip data URI prefix for API consumption
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(f)
    })
  }

  function getFileType(mimeType: string): FileType {
    return mimeType === 'application/pdf' ? 'pdf' : 'image'
  }

  async function processFile(f: File): Promise<TestInput | null> {
    if (!validateFile(f)) {
      return null
    }

    isProcessing.value = true
    error.value = null
    file.value = f

    try {
      const base64Content = await readAsBase64(f)
      
      testInput.value = {
        fileName: f.name,
        fileType: getFileType(f.type),
        mimeType: f.type,
        size: f.size,
        base64Content
      }

      return testInput.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to process file'
      return null
    } finally {
      isProcessing.value = false
    }
  }

  function clearFile(): void {
    file.value = null
    testInput.value = null
    error.value = null
  }

  return {
    file: readonly(file),
    testInput: readonly(testInput),
    isProcessing: readonly(isProcessing),
    error: readonly(error),
    processFile,
    clearFile
  }
}
