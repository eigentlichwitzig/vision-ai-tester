/**
 * Serialization utilities for IndexedDB storage
 * Handles Vue reactive proxy objects that cannot be cloned by IndexedDB
 */

import { toRaw, isProxy, isRef } from 'vue'

/**
 * Check if an object might still contain Vue proxies after standard unwrapping
 * This is a heuristic check - not 100% reliable but catches common cases
 * @param obj - Object to check
 * @returns true if the object might contain proxies
 */
function mightContainProxies(obj: unknown): boolean {
  if (obj == null || typeof obj !== 'object') {
    return false
  }
  
  // Check if current object is a proxy
  if (isProxy(obj)) {
    return true
  }
  
  // Check if object has Vue's internal reactive marker
  const vueMarker = (obj as Record<string | symbol, unknown>)['__v_raw']
  if (vueMarker !== undefined) {
    return true
  }
  
  return false
}

/**
 * Internal recursive function to unwrap Vue reactive proxies
 * @param obj - Object potentially containing Vue reactive proxies
 * @returns Partially or fully unwrapped JavaScript object
 */
function unwrapRecursively<T>(obj: T): T {
  // Handle null/undefined
  if (obj == null) {
    return obj
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj
  }

  // Unwrap Vue ref if needed
  if (isRef(obj)) {
    return unwrapRecursively(obj.value) as T
  }

  // Unwrap Vue reactive proxy
  const raw = isProxy(obj) ? toRaw(obj) : obj

  // Handle Date objects (keep as-is, they are cloneable)
  if (raw instanceof Date) {
    return raw as T
  }

  // Handle Blob and File objects (keep as-is, they are cloneable)
  // File extends Blob, so this handles both
  if (raw instanceof Blob) {
    return raw as T
  }

  // Handle ArrayBuffer objects (keep as-is, they are cloneable)
  if (raw instanceof ArrayBuffer) {
    return raw as T
  }

  // Handle arrays recursively
  if (Array.isArray(raw)) {
    return raw.map(item => unwrapRecursively(item)) as T
  }

  // Handle plain objects recursively
  // Use Object.keys() to only iterate over own enumerable properties (safer than for...in)
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(raw as object)) {
    const value = (raw as Record<string, unknown>)[key]
    result[key] = unwrapRecursively(value)
  }

  return result as T
}

/**
 * Recursively unwrap Vue reactive proxies and refs from an object
 * This is necessary because IndexedDB uses structured clone which cannot handle Proxy objects
 * 
 * Note: This function uses JSON serialization as a safety fallback for objects that might
 * still contain proxies after standard unwrapping. This means non-enumerable properties,
 * functions, undefined values, and symbols may be lost for complex objects. However, this
 * is acceptable for test run data which consists of plain JSON-serializable data.
 * 
 * @param obj - Object potentially containing Vue reactive proxies
 * @returns Plain JavaScript object safe for IndexedDB storage
 */
export function serializeForStorage<T>(obj: T): T {
  // First, recursively unwrap all proxies we can detect
  const unwrapped = unwrapRecursively(obj)
  
  // Check if the result might still contain proxies (Vue's isProxy() can miss some)
  // If so, use JSON round-trip as a safety fallback
  if (unwrapped != null && typeof unwrapped === 'object' && mightContainProxies(unwrapped)) {
    try {
      return JSON.parse(JSON.stringify(unwrapped))
    } catch {
      // If JSON serialization fails (e.g., circular refs), return as-is
      return unwrapped
    }
  }
  
  return unwrapped
}
