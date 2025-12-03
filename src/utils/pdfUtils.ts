/**
 * PDF utility functions for preview rendering
 * Task #7: Handle PDF-specific preview operations
 */

import { addDataUriPrefix, stripDataUriPrefix } from './base64'

/**
 * PDF MIME type constant
 */
const PDF_MIME_TYPE = 'application/pdf'

/**
 * PDF signature bytes (magic number)
 * PDF files start with "%PDF-"
 */
const PDF_SIGNATURE = 'JVBERi' // Base64 encoded "%PDF-"

/**
 * Convert raw base64 PDF to Data URI for browser rendering
 * OPPOSITE of Task #6 - Task #6 strips prefix, Task #7 adds it back
 * 
 * @example
 * // Raw base64 from storage
 * const raw = "JVBERi0xLjQ..."
 * // Convert for browser display
 * const dataUri = pdfToDataUri(raw)
 * // Result: "data:application/pdf;base64,JVBERi0xLjQ..."
 */
export function pdfToDataUri(base64String: string): string {
  return addDataUriPrefix(stripDataUriPrefix(base64String), PDF_MIME_TYPE)
}

/**
 * Check if a base64 string is a valid PDF by checking the signature
 * PDF files start with "%PDF-" which is "JVBERi" in base64
 * 
 * @param base64String - Raw base64 string (without data URI prefix)
 * @returns true if the string appears to be a valid PDF
 */
export function isValidPdf(base64String: string): boolean {
  const raw = stripDataUriPrefix(base64String)
  
  // Check minimum length (PDF needs at least the header)
  if (raw.length < 10) {
    return false
  }
  
  // Check for PDF signature
  return raw.startsWith(PDF_SIGNATURE)
}

/**
 * Get page count from PDF using pdf.js
 * This is an async operation that loads the PDF
 * 
 * Note: This function requires the @tato30/vue-pdf library which uses pdf.js internally.
 * The page count will be determined by loading the PDF document.
 * 
 * @param dataUri - Data URI string for the PDF
 * @returns Promise with the page count, or 0 on error
 */
export async function getPdfPageCount(dataUri: string): Promise<number> {
  try {
    // We use the usePDF composable from @tato30/vue-pdf which handles the PDF loading
    // The actual page count will be determined by the Vue component
    // This utility function is provided for cases where we need the count outside the component
    
    // For now, we return 0 as a placeholder
    // The actual implementation uses the VuePDF component's built-in page detection
    // which is handled in PdfPreview.vue
    return 0
  } catch {
    return 0
  }
}

/**
 * Check if a MIME type is a PDF
 */
export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === PDF_MIME_TYPE
}

/**
 * Get the MIME type for PDF files
 */
export function getPdfMimeType(): string {
  return PDF_MIME_TYPE
}

/**
 * Estimate PDF page count based on file size
 * This is a rough estimate: average page is about 50-100KB
 * 
 * @param sizeInBytes - File size in bytes
 * @returns Estimated page count
 */
export function estimatePdfPageCount(sizeInBytes: number): number {
  const avgPageSize = 75 * 1024 // 75KB average per page
  return Math.max(1, Math.round(sizeInBytes / avgPageSize))
}
