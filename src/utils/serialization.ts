/**
 * Serialization utilities for IndexedDB storage
 * Handles Vue reactive proxy objects that cannot be cloned by IndexedDB
 */

import { toRaw, isProxy, isRef } from 'vue'

/**
 * Deep clone an object using JSON serialization
 * This is a safety fallback to ensure all proxies are fully unwrapped
 * @param obj - Object to deep clone
 * @returns Plain JavaScript object safe for IndexedDB storage
 */
function jsonDeepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Recursively unwrap Vue reactive proxies and refs from an object
 * This is necessary because IndexedDB uses structured clone which cannot handle Proxy objects
 * 
 * @param obj - Object potentially containing Vue reactive proxies
 * @returns Plain JavaScript object safe for IndexedDB storage
 */
export function serializeForStorage<T>(obj: T): T {
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
    return serializeForStorage(obj.value) as T
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
    const result = raw.map(item => serializeForStorage(item))
    // Safety fallback: use JSON round-trip to ensure no proxies remain
    // This catches deeply nested reactive objects that isProxy() may miss
    try {
      return jsonDeepClone(result) as T
    } catch {
      // If JSON serialization fails (e.g., circular refs), return as-is
      return result as T
    }
  }

  // Handle plain objects recursively
  // Use Object.keys() to only iterate over own enumerable properties (safer than for...in)
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(raw as object)) {
    const value = (raw as Record<string, unknown>)[key]
    result[key] = serializeForStorage(value)
  }

  // Safety fallback: use JSON round-trip to ensure no proxies remain
  // This catches deeply nested reactive objects that isProxy() may miss
  try {
    return jsonDeepClone(result) as T
  } catch {
    // If JSON serialization fails (e.g., circular refs), return as-is
    return result as T
  }
}
