/**
 * Composable for file upload handling
 * Provides file validation, base64 conversion, and state management
 */

import { ref } from 'vue'
import type { FileUploadData, FileUploadError } from '@/types/models'
import { fileToRawBase64, isValidFileType, getFileType } from '@/utils/base64'
import { formatFileSize } from '@/utils/formatters'
import { 
  MAX_FILE_SIZE, 
  WARNING_FILE_SIZE, 
  LARGE_FILE_SIZE 
} from '@/utils/validators'
import { generateThumbnail, shouldGenerateThumbnail } from '@/utils/imageUtils'

/**
 * Default accepted file types
 */
const DEFAULT_ACCEPTED_TYPES = ['pdf', 'jpg', 'jpeg', 'png']

/**
 * File upload composable for handling file selection, validation, and processing
 */
export function useFileUpload() {
  const uploadedFile = ref<FileUploadData | null>(null)
  const isProcessing = ref(false)
  const error = ref<FileUploadError | null>(null)

  /**
   * Validate file type and size
   * @throws FileUploadError if validation fails
   */
  function validateFile(
    file: File, 
    maxSize: number = MAX_FILE_SIZE, 
    acceptedTypes: string[] = DEFAULT_ACCEPTED_TYPES
  ): void {
    // Check file type
    if (!isValidFileType(file, acceptedTypes)) {
      const err: FileUploadError = {
        code: 'INVALID_TYPE',
        message: 'Unsupported file type. Please upload PDF, JPG, or PNG files.',
        details: `File type "${file.type}" is not supported. Accepted types: ${acceptedTypes.join(', ')}`
      }
      throw err
    }

    // Check file size
    if (file.size > maxSize) {
      const err: FileUploadError = {
        code: 'FILE_TOO_LARGE',
        message: `File exceeds ${formatFileSize(maxSize)} limit. Please upload a smaller file.`,
        details: `File size: ${formatFileSize(file.size)}, Maximum: ${formatFileSize(maxSize)}`
      }
      throw err
    }
  }

  /**
   * Process uploaded file: validate, convert to base64, generate metadata
   * @param file - File to process
   * @param maxSize - Maximum file size in bytes
   * @param acceptedTypes - Accepted file extensions
   * @returns FileUploadData with all metadata
   */
  async function processFile(
    file: File,
    maxSize: number = MAX_FILE_SIZE,
    acceptedTypes: string[] = DEFAULT_ACCEPTED_TYPES
  ): Promise<FileUploadData> {
    isProcessing.value = true
    error.value = null

    try {
      // Validate file
      validateFile(file, maxSize, acceptedTypes)

      // Convert to base64 (without prefix)
      let base64Content: string
      try {
        base64Content = await fileToRawBase64(file)
      } catch (conversionError) {
        const err: FileUploadError = {
          code: 'CONVERSION_FAILED',
          message: 'Failed to process file. Please try again.',
          details: conversionError instanceof Error ? conversionError.message : 'Unknown error'
        }
        throw err
      }

      // Get file type category
      const fileType = getFileType(file)
      if (fileType === 'unknown') {
        const err: FileUploadError = {
          code: 'INVALID_TYPE',
          message: 'Unable to determine file type.',
          details: `Could not categorize file: ${file.name}`
        }
        throw err
      }

      // Generate thumbnail for large images (>1MB) to improve preview performance
      let thumbnail: string | undefined
      if (fileType === 'image' && shouldGenerateThumbnail(file.size)) {
        try {
          thumbnail = await generateThumbnail(file, 400, 500, 0.8)
        } catch {
          // Thumbnail generation failed, continue without it
          console.warn('Thumbnail generation failed, using original image for preview')
        }
      }

      // Build FileUploadData
      const fileData: FileUploadData = {
        file,
        fileName: file.name,
        fileType,
        mimeType: file.type,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        base64Content,
        thumbnail,
        isLarge: file.size > WARNING_FILE_SIZE,
        isVeryLarge: file.size > LARGE_FILE_SIZE,
        timestamp: new Date()
      }

      uploadedFile.value = fileData
      return fileData
    } catch (err) {
      // Handle FileUploadError
      if (typeof err === 'object' && err !== null && 'code' in err) {
        error.value = err as FileUploadError
      } else {
        error.value = {
          code: 'UNKNOWN',
          message: 'An unexpected error occurred.',
          details: err instanceof Error ? err.message : 'Unknown error'
        }
      }
      throw error.value
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Clear current file and reset state
   */
  function clearFile(): void {
    uploadedFile.value = null
    error.value = null
    isProcessing.value = false
  }

  return {
    uploadedFile,
    isProcessing,
    error,
    processFile,
    clearFile,
    validateFile
  }
}
