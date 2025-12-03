/**
 * Base64 encoding/decoding utilities
 * Handles conversion between files and base64 strings
 */

/**
 * Data URI regex pattern
 * Matches patterns like: data:image/jpeg;base64,iVBORw0KG...
 */
const DATA_URI_REGEX = /^data:[\w/-]+;base64,/

/**
 * Strip the data URI prefix from a base64 string
 * CRITICAL: Ollama requires raw base64 without the data URI prefix
 * 
 * @example
 * stripDataUriPrefix('data:image/jpeg;base64,iVBORw0KG...') // returns 'iVBORw0KG...'
 * stripDataUriPrefix('iVBORw0KG...') // returns 'iVBORw0KG...' (unchanged)
 */
export function stripDataUriPrefix(base64String: string): string {
  return base64String.replace(DATA_URI_REGEX, '')
}

/**
 * Check if a string has a data URI prefix
 */
export function hasDataUriPrefix(str: string): boolean {
  return DATA_URI_REGEX.test(str)
}

/**
 * Add a data URI prefix to a raw base64 string
 */
export function addDataUriPrefix(base64String: string, mimeType: string): string {
  if (hasDataUriPrefix(base64String)) {
    return base64String
  }
  return `data:${mimeType};base64,${base64String}`
}

/**
 * Convert a File to a base64 string (with data URI prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as base64'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a File to raw base64 (without data URI prefix)
 * Use this when sending to Ollama
 */
export async function fileToRawBase64(file: File): Promise<string> {
  const dataUri = await fileToBase64(file)
  return stripDataUriPrefix(dataUri)
}

/**
 * Convert a base64 string to a Blob
 */
export function base64ToBlob(base64String: string, mimeType: string): Blob {
  const raw = stripDataUriPrefix(base64String)
  const binaryString = atob(raw)
  const bytes = new Uint8Array(binaryString.length)
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  return new Blob([bytes], { type: mimeType })
}

/**
 * Convert a base64 string to an object URL for preview
 */
export function base64ToObjectUrl(base64String: string, mimeType: string): string {
  const blob = base64ToBlob(base64String, mimeType)
  return URL.createObjectURL(blob)
}

/**
 * Revoke an object URL to free memory
 */
export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Extract MIME type from a data URI
 */
export function getMimeTypeFromDataUri(dataUri: string): string | null {
  const match = dataUri.match(/^data:([\w/-]+);base64,/)
  return match ? match[1] : null
}

/**
 * Estimate the size of a base64 string in bytes
 * Base64 encoding increases size by approximately 33%
 */
export function estimateBase64Size(base64String: string): number {
  const raw = stripDataUriPrefix(base64String)
  // Remove padding characters and calculate
  const padding = (raw.match(/=/g) || []).length
  return Math.floor((raw.length * 3) / 4) - padding
}

/**
 * Check if base64 string is likely an image
 */
export function isBase64Image(base64String: string): boolean {
  const mimeType = getMimeTypeFromDataUri(base64String)
  return mimeType !== null && mimeType.startsWith('image/')
}

/**
 * Check if base64 string is likely a PDF
 */
export function isBase64Pdf(base64String: string): boolean {
  const mimeType = getMimeTypeFromDataUri(base64String)
  return mimeType === 'application/pdf'
}
