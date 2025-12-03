/**
 * Base64 encoding/decoding utilities
 */

/**
 * Convert a File to base64 string (without data URI prefix)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URI prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert a Blob to base64 string (without data URI prefix)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

/**
 * Check if a string is valid base64
 */
export function isValidBase64(str: string): boolean {
  if (str.length === 0 || str.length % 4 !== 0) {
    return false
  }
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  return base64Regex.test(str)
}

/**
 * Strip data URI prefix from a base64 string if present
 * This is critical for Ollama API - it expects raw base64 only
 */
export function stripDataUriPrefix(base64: string): string {
  if (base64.includes(',')) {
    return base64.split(',')[1]
  }
  return base64
}

/**
 * Add data URI prefix to a base64 string
 */
export function addDataUriPrefix(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`
}
