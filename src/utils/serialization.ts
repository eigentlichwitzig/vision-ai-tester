/**
 * Serialization utilities for IndexedDB storage
 * Handles Vue reactive proxy objects that cannot be cloned by IndexedDB
 */

import { toRaw, isProxy, isRef } from 'vue'

/**
 * Regex pattern to match ISO 8601 date strings
 * Matches formats like: 2025-01-15T10:30:00Z, 2025-01-15T10:30:00.123Z, 2025-01-15T10:30:00+00:00
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/

/**
 * Check if a value is an ISO 8601 date string
 * @param value - Value to check
 * @returns true if value is a valid ISO date string
 */
function isISODateString(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE_PATTERN.test(value)
}

/**
 * Recursively unwrap Vue reactive proxies and refs from an object
 * This is necessary because IndexedDB uses structured clone which cannot handle Proxy objects
 * 
 * Note: If proxies are still detected after standard unwrapping, a JSON round-trip is used
 * as a safety fallback. This means non-enumerable properties, functions, undefined values,
 * and symbols may be lost for complex objects. However, this is acceptable for test run
 * data which consists of plain JSON-serializable data.
 * 
 * @param obj - Object potentially containing Vue reactive proxies
 * @param foundProxy - Internal flag tracking if a proxy was encountered during unwrapping
 * @returns Tuple of [unwrapped object, whether proxy was found]
 */
function unwrapRecursively<T>(obj: T, foundProxy = false): [T, boolean] {
  // Handle null/undefined
  if (obj == null) {
    return [obj, foundProxy]
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return [obj, foundProxy]
  }

  // Unwrap Vue ref if needed
  if (isRef(obj)) {
    return unwrapRecursively(obj.value as T, true)
  }

  // Unwrap Vue reactive proxy
  let raw: T
  if (isProxy(obj)) {
    raw = toRaw(obj)
    foundProxy = true
  } else {
    raw = obj
  }

  // Handle Date objects (keep as-is, they are cloneable)
  if (raw instanceof Date) {
    return [raw, foundProxy]
  }

  // Handle Blob and File objects (keep as-is, they are cloneable)
  // File extends Blob, so this handles both
  if (raw instanceof Blob) {
    return [raw, foundProxy]
  }

  // Handle ArrayBuffer objects (keep as-is, they are cloneable)
  if (raw instanceof ArrayBuffer) {
    return [raw, foundProxy]
  }

  // Handle arrays recursively
  if (Array.isArray(raw)) {
    const result: unknown[] = []
    for (const item of raw) {
      const [unwrappedItem, hadProxy] = unwrapRecursively(item)
      result.push(unwrappedItem)
      foundProxy = foundProxy || hadProxy
    }
    return [result as T, foundProxy]
  }

  // Handle plain objects recursively
  // Use Object.keys() to only iterate over own enumerable properties (safer than for...in)
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(raw as object)) {
    const value = (raw as Record<string, unknown>)[key]
    const [unwrappedValue, hadProxy] = unwrapRecursively(value)
    result[key] = unwrappedValue
    foundProxy = foundProxy || hadProxy
  }

  return [result as T, foundProxy]
}

/**
 * Serialize an object for IndexedDB storage by unwrapping Vue reactive proxies
 * 
 * @param obj - Object potentially containing Vue reactive proxies
 * @returns Plain JavaScript object safe for IndexedDB storage
 */
export function serializeForStorage<T>(obj: T): T {
  // Recursively unwrap all proxies we can detect
  const [unwrapped, foundProxy] = unwrapRecursively(obj)
  
  // If we found proxies during unwrapping, use JSON round-trip as extra safety
  // This catches any deeply nested reactive structures that might have survived
  if (foundProxy && unwrapped != null && typeof unwrapped === 'object') {
    try {
      // JSON round-trip with Date restoration
      // JSON.stringify converts Date objects to ISO strings, so we use a reviver
      // to convert them back to Date objects
      return JSON.parse(JSON.stringify(unwrapped), (_key, value) => {
        // Check if value looks like an ISO date string
        if (isISODateString(value)) {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            return date
          }
        }
        return value
      })
    } catch (error) {
      // Log warning for debugging but don't fail - return what we have
      console.warn('serializeForStorage: JSON round-trip failed, returning unwrapped object', error)
      return unwrapped
    }
  }
  
  return unwrapped
}
