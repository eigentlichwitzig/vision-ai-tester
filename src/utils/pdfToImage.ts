/**
 * PDF to Image Conversion Utility
 * Converts PDF pages to images for OCR processing
 * 
 * Ollama vision models expect image formats (JPEG, PNG) but receive PDF data.
 * This utility renders PDF pages to canvas and exports them as base64 images.
 */

import * as pdfjsLib from 'pdfjs-dist'
import { stripDataUriPrefix } from './base64'

// Configure PDF.js worker
// Use the same approach as @tato30/vue-pdf
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

/**
 * Result of PDF to image conversion
 */
export interface PdfToImageResult {
  /** Raw base64 image content (without data URI prefix) */
  base64Content: string
  /** MIME type of the output image */
  mimeType: string
  /** Width of the rendered image */
  width: number
  /** Height of the rendered image */
  height: number
  /** Page number that was rendered */
  pageNumber: number
  /** Total pages in the PDF */
  totalPages: number
}

/**
 * Options for PDF to image conversion
 */
export interface PdfToImageOptions {
  /** Page number to render (1-indexed, default: 1) */
  pageNumber?: number
  /** Output image format (default: 'image/png') */
  format?: 'image/png' | 'image/jpeg'
  /** JPEG quality when format is 'image/jpeg' (0-1, default: 0.92) */
  quality?: number
  /** Scale factor for rendering (default: 2.0 for good OCR quality) */
  scale?: number
  /** Maximum width constraint (optional, preserves aspect ratio) */
  maxWidth?: number
  /** Maximum height constraint (optional, preserves aspect ratio) */
  maxHeight?: number
}

/**
 * Default conversion options
 */
const DEFAULT_OPTIONS: Required<PdfToImageOptions> = {
  pageNumber: 1,
  format: 'image/png',
  quality: 0.92,
  scale: 2.0, // Higher scale for better OCR quality
  maxWidth: 4096,
  maxHeight: 4096
}

/**
 * Convert a PDF page to an image
 * 
 * @param pdfBase64 - Base64 encoded PDF content (with or without data URI prefix)
 * @param options - Conversion options
 * @returns Promise with the converted image data
 * @throws Error if PDF loading or rendering fails
 * 
 * @example
 * ```ts
 * // Convert first page of PDF to PNG
 * const result = await pdfPageToImage(pdfBase64Content)
 * console.log(result.base64Content) // Raw base64 PNG
 * 
 * // Convert second page to JPEG with custom quality
 * const result = await pdfPageToImage(pdfBase64, {
 *   pageNumber: 2,
 *   format: 'image/jpeg',
 *   quality: 0.85
 * })
 * ```
 */
export async function pdfPageToImage(
  pdfBase64: string,
  options: PdfToImageOptions = {}
): Promise<PdfToImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  // Strip any data URI prefix
  const rawBase64 = stripDataUriPrefix(pdfBase64)
  
  // Convert base64 to Uint8Array for PDF.js
  const binaryString = atob(rawBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
    // Disable font loading issues - not needed for image rendering
    disableFontFace: true
  })
  
  const pdf = await loadingTask.promise
  const totalPages = pdf.numPages
  
  // Validate page number
  if (opts.pageNumber < 1 || opts.pageNumber > totalPages) {
    throw new Error(`Invalid page number: ${opts.pageNumber}. PDF has ${totalPages} pages.`)
  }
  
  // Get the specified page
  const page = await pdf.getPage(opts.pageNumber)
  
  // Calculate viewport with scale
  let viewport = page.getViewport({ scale: opts.scale })
  
  // Apply max dimension constraints while preserving aspect ratio
  if (viewport.width > opts.maxWidth || viewport.height > opts.maxHeight) {
    const widthRatio = opts.maxWidth / viewport.width
    const heightRatio = opts.maxHeight / viewport.height
    const constrainedScale = Math.min(widthRatio, heightRatio) * opts.scale
    viewport = page.getViewport({ scale: constrainedScale })
  }
  
  // Create canvas for rendering
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  if (!context) {
    throw new Error('Failed to create canvas context for PDF rendering')
  }
  
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  
  // Fill with white background (PDFs may have transparency)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  
  // Render page to canvas
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    background: 'white'
  }
  
  await page.render(renderContext).promise
  
  // Convert canvas to base64
  const dataUri = canvas.toDataURL(opts.format, opts.quality)
  const base64Content = stripDataUriPrefix(dataUri)
  
  // Clean up
  page.cleanup()
  pdf.cleanup()
  await pdf.destroy()
  
  return {
    base64Content,
    mimeType: opts.format,
    width: canvas.width,
    height: canvas.height,
    pageNumber: opts.pageNumber,
    totalPages
  }
}

/**
 * Check if a file is a PDF based on MIME type
 * @param mimeType - MIME type to check
 * @returns true if the file is a PDF
 */
export function isPdfMimeType(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

/**
 * Get the number of pages in a PDF
 * 
 * @param pdfBase64 - Base64 encoded PDF content
 * @returns Promise with the page count
 */
export async function getPdfPageCount(pdfBase64: string): Promise<number> {
  const rawBase64 = stripDataUriPrefix(pdfBase64)
  
  const binaryString = atob(rawBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  const loadingTask = pdfjsLib.getDocument({ data: bytes })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages
  
  await pdf.destroy()
  
  return pageCount
}
