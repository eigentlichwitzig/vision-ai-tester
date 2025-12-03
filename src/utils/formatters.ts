/**
 * Formatting utilities
 */

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Format date in locale-specific format
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format date and time in locale-specific format
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // Less than a minute
  if (diff < 60000) return 'Just now'
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  }
  
  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
  
  // Otherwise show full date
  return formatDate(date)
}

/**
 * Format model name for display
 */
export function formatModelName(name: string): string {
  // Remove common suffixes and clean up
  return name
    .replace(/:latest$/, '')
    .replace(/-q\d+.*$/, '')
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Format JSON for display (pretty print)
 */
export function formatJson(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent)
}

/**
 * Format token count
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) return count.toString()
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
  return `${(count / 1000000).toFixed(1)}M`
}
