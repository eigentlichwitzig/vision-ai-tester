/**
 * Core data models for the Vision AI Tester application
 */

export type PipelineType = 'ocr-then-parse' | 'direct-multimodal'
export type TestStatus = 'success' | 'error' | 'cancelled'
export type FileType = 'pdf' | 'image'

/**
 * Validation error from JSON schema validation
 */
export interface ValidationError {
  field: string           // JSON path (e.g., "lineItems[0].quantity")
  message: string         // Human-readable error
  schemaPath: string      // Schema location
  keyword: string         // AJV error keyword (type, required, etc.)
  params?: object         // Additional error details
}

/**
 * Configuration for OCR step in the OCR→Parse pipeline
 */
export interface OcrPipelineConfig {
  temperature: number
  maxTokens: number
  numCtx: number
  systemPrompt: string
  userPrompt: string
}

/**
 * Configuration for Parse step in the OCR→Parse pipeline
 */
export interface ParsePipelineConfig {
  temperature: number
  maxTokens: number
  numCtx: number
  systemPrompt: string
  userPrompt: string
  schemaId?: string
}

export interface TestParameters {
  temperature: number
  maxTokens?: number
  numCtx?: number
  systemPrompt: string
  userPrompt: string
  schemaId?: string
  
  // Separate parameters for OCR pipeline
  ocrParameters?: OcrPipelineConfig
  parseParameters?: ParsePipelineConfig
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
  thinking?: string             // Thinking/reasoning content from models like DeepSeek-R1
  error?: string
  validationErrors?: ValidationError[]  // Validation errors from schema validation
  isValid?: boolean                     // Whether output passed schema validation
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
 * File storage record for large files stored separately in IndexedDB
 * Used when files exceed 5MB to optimize storage
 */
export interface StoredFile {
  id: string              // UUID
  testRunId: string       // Foreign key to TestRun
  fileName: string
  mimeType: string
  size: number
  blob: Blob              // File content stored as blob
  createdAt: Date
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
