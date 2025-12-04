/**
 * Serialization utilities for IndexedDB storage
 * Handles Vue reactive proxy objects that cannot be cloned by IndexedDB
 */

import { toRaw, isProxy, isRef } from 'vue'

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

  // Handle Blob objects (keep as-is, they are cloneable)
  if (raw instanceof Blob) {
    return raw as T
  }

  // Handle arrays recursively
  if (Array.isArray(raw)) {
    return raw.map(item => serializeForStorage(item)) as T
  }

  // Handle plain objects recursively
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(raw as object)) {
    const value = (raw as Record<string, unknown>)[key]
    result[key] = serializeForStorage(value)
  }

  return result as T
}
