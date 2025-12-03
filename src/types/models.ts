/**
 * Core data models for the Vision AI Tester application
 */

export type PipelineType = 'ocr-then-parse' | 'direct-multimodal'
export type TestStatus = 'success' | 'error' | 'cancelled'
export type FileType = 'pdf' | 'image'

export interface TestParameters {
  temperature: number
  maxTokens?: number
  numCtx?: number
  systemPrompt: string
  userPrompt: string
  schemaId?: string
}

export interface TestInput {
  fileName: string
  fileType: FileType
  mimeType: string
  size: number
  base64Content: string  // Empty if stored separately
  fileRef?: string        // ID reference for large files
  thumbnail?: string
}

export interface TestOutput {
  raw: string                   // Raw response from model
  parsed?: object               // Validated JSON object
  ocrText?: string              // Intermediate OCR output (if pipeline 1)
  error?: string
  promptTokens?: number
  completionTokens?: number
  totalDuration?: number
}

export interface TestRun {
  id: string                    // UUID
  timestamp: Date
  modelName: string             // e.g., "qwen2.5vl:7b"
  pipeline: PipelineType
  ocrModel?: string             // Only for ocr-then-parse pipeline
  parameters: TestParameters
  input: TestInput
  output: TestOutput
  duration: number              // milliseconds
  status: TestStatus
  tags?: string[]
}

export interface JsonSchema {
  id: string
  name: string
  description?: string
  schema: object
}

/**
 * File upload data after processing
 */
export interface FileUploadData {
  file: File
  fileName: string
  fileType: 'pdf' | 'image'
  mimeType: string
  size: number
  sizeFormatted: string           // "2.5 MB"
  base64Content: string           // Raw base64 WITHOUT prefix
  thumbnail?: string              // Optional preview (for images)
  isLarge: boolean                // >1MB
  isVeryLarge: boolean            // >5MB
  timestamp: Date
}

/**
 * File upload error types
 */
export interface FileUploadError {
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'CONVERSION_FAILED' | 'UNKNOWN'
  message: string
  details?: string
}
