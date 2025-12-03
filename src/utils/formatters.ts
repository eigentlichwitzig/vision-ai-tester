/**
 * Formatting utilities for display
 */

/**
 * Format a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  
  const seconds = ms / 1000
  
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(0)
  
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSeconds < 60) {
    return 'just now'
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }
  
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }
  
  return formatDate(date)
}

/**
 * Format a date to a short date string (e.g., "Dec 3, 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Format a date to a full datetime string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 */
export function formatIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format token count with abbreviation for large numbers
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return tokens.toString()
  }
  
  if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  
  return `${(tokens / 1000000).toFixed(1)}M`
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str
  }
  
  return `${str.slice(0, maxLength - 3)}...`
}

/**
 * Format a model name for display (remove version suffix if needed)
 */
export function formatModelName(modelName: string): string {
  // Just return the name as-is for now
  return modelName
}

/**
 * Format a pipeline type for display
 */
export function formatPipelineType(pipeline: 'ocr-then-parse' | 'direct-multimodal'): string {
  if (pipeline === 'ocr-then-parse') {
    return 'OCR → Parse'
  }
  return 'Direct Multimodal'
}

/**
 * Format a test status for display
 */
export function formatTestStatus(status: 'success' | 'error' | 'cancelled'): string {
  switch (status) {
    case 'success':
      return 'Success'
    case 'error':
      return 'Error'
    case 'cancelled':
      return 'Cancelled'
  }
}

/**
 * Get status color class for Tailwind
 */
export function getStatusColorClass(status: 'success' | 'error' | 'cancelled'): string {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50'
    case 'error':
      return 'text-red-600 bg-red-50'
    case 'cancelled':
      return 'text-yellow-600 bg-yellow-50'
  }
}

/**
 * Format JSON with indentation
 */
export function formatJson(obj: unknown, indent: number = 2): string {
  return JSON.stringify(obj, null, indent)
}

/**
 * Try to parse and format JSON, return original string if invalid
 */
export function tryFormatJson(str: string, indent: number = 2): string {
  try {
    const parsed = JSON.parse(str)
    return JSON.stringify(parsed, null, indent)
  } catch {
    return str
  }
}
