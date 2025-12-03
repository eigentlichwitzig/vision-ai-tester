/**
 * Storage utilities for IndexedDB quota management
 * Provides storage info, persistent storage requests, and cleanup functions
 */

import { db, deleteTestRun } from '@/db'

/**
 * Storage info returned by getStorageInfo
 */
export interface StorageInfo {
  usage: number       // Bytes used
  quota: number       // Total available bytes
  percentage: number  // Percentage of quota used
}

/**
 * Check storage usage via Storage API
 * Returns null if Storage API is not available
 */
export async function getStorageInfo(): Promise<StorageInfo | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null
  }

  const estimate = await navigator.storage.estimate()

  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
    percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0
  }
}

/**
 * Request persistent storage to prevent browser from evicting data
 * Returns true if persistent storage was granted
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist()
    console.log(`Persistent storage: ${isPersisted}`)
    return isPersisted
  }
  return false
}

/**
 * Check if storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return await navigator.storage.persisted()
  }
  return false
}

/**
 * Auto-cleanup old runs if count exceeds limit
 * Removes oldest runs first
 * 
 * @param keepCount - Number of runs to keep (default 500)
 * @returns Number of runs deleted
 */
export async function cleanupOldRuns(keepCount: number = 500): Promise<number> {
  const count = await db.testRuns.count()

  if (count <= keepCount) {
    return 0
  }

  // Get oldest runs to delete
  const deleteCount = count - keepCount
  const oldRuns = await db.testRuns
    .orderBy('timestamp')
    .limit(deleteCount)
    .toArray()

  // Delete them
  for (const run of oldRuns) {
    await deleteTestRun(run.id)
  }

  console.log(`Cleaned up ${oldRuns.length} old test runs`)
  return oldRuns.length
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
