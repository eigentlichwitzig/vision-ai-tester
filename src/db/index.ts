/**
 * IndexedDB configuration using Dexie.js
 * Manages local persistence for test runs, files, and schemas
 */

import Dexie, { type Table } from 'dexie'
import type { TestRun, JsonSchema, StoredFile } from '@/types/models'
import { base64ToBlob, blobToBase64 } from '@/utils/base64'

/**
 * Re-export StoredFile for backward compatibility
 */
export type { StoredFile }

/**
 * Stored test run with serializable date
 */
export interface StoredTestRun extends Omit<TestRun, 'timestamp'> {
  timestamp: string  // ISO date string for storage
}

/**
 * Vision AI Tester database schema
 */
class VisionAITesterDB extends Dexie {
  testRuns!: Table<StoredTestRun, string>
  files!: Table<StoredFile, string>
  schemas!: Table<JsonSchema, string>

  constructor() {
    super('VisionAITesterDB')
    
    // Define database schema
    this.version(1).stores({
      testRuns: 'id, timestamp, modelName, pipeline, status, [modelName+pipeline]',
      files: 'id, testRunId, size',
      schemas: 'id, name'
    })
  }
}

/**
 * Database instance
 */
export const db = new VisionAITesterDB()

/**
 * Convert TestRun to StoredTestRun for database storage
 */
export function toStoredTestRun(testRun: TestRun): StoredTestRun {
  return {
    ...testRun,
    timestamp: testRun.timestamp.toISOString()
  }
}

/**
 * Convert StoredTestRun back to TestRun
 */
export function fromStoredTestRun(stored: StoredTestRun): TestRun {
  return {
    ...stored,
    timestamp: new Date(stored.timestamp)
  }
}

/**
 * Large file threshold (5MB)
 */
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024

/**
 * Save a test run to the database
 * Large files (>5MB) are stored separately as blobs
 */
export async function saveTestRun(testRun: TestRun): Promise<string> {
  try {
    const fileSize = testRun.input.size

    // Create a modifiable copy for storage
    let runToStore = testRun

    // Check if file is large (>5MB) and has base64 content
    if (fileSize > LARGE_FILE_THRESHOLD && testRun.input.base64Content) {
      // Store file separately
      const fileId = crypto.randomUUID()
      const blob = base64ToBlob(testRun.input.base64Content, testRun.input.mimeType)

      await db.files.add({
        id: fileId,
        testRunId: testRun.id,
        fileName: testRun.input.fileName,
        mimeType: testRun.input.mimeType,
        size: fileSize,
        blob,
        createdAt: new Date()
      })

      // Replace base64 with reference in a copy
      runToStore = {
        ...testRun,
        input: {
          ...testRun.input,
          fileRef: fileId,
          base64Content: ''  // Clear base64 content
        }
      }
    }

    // Save test run
    const stored = toStoredTestRun(runToStore)
    await db.testRuns.put(stored)

    console.log(`Saved test run ${testRun.id}`)
    return testRun.id
  } catch (error) {
    console.error('Failed to save test run:', error)
    throw error
  }
}

/**
 * Get a test run by ID
 * Loads large file content if stored separately
 */
export async function getTestRun(id: string): Promise<TestRun | undefined> {
  const stored = await db.testRuns.get(id)
  
  if (!stored) return undefined

  const testRun = fromStoredTestRun(stored)

  // Load large file if stored separately
  if (testRun.input.fileRef) {
    const file = await db.files.get(testRun.input.fileRef)
    if (file) {
      testRun.input.base64Content = await blobToBase64(file.blob)
    }
  }

  return testRun
}

/**
 * Get all test runs, optionally filtered
 * Note: Does NOT load large file content - use getTestRun for full data
 */
export async function getTestRuns(options?: {
  modelName?: string
  pipeline?: TestRun['pipeline']
  status?: TestRun['status']
  limit?: number
  offset?: number
}): Promise<TestRun[]> {
  let query = db.testRuns.orderBy('timestamp').reverse()

  if (options?.offset) {
    query = query.offset(options.offset)
  }
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const results = await query.toArray()
  
  return results
    .filter((run) => {
      if (options?.modelName && run.modelName !== options.modelName) return false
      if (options?.pipeline && run.pipeline !== options.pipeline) return false
      if (options?.status && run.status !== options.status) return false
      return true
    })
    .map(fromStoredTestRun)
}

/**
 * Get total count of test runs
 */
export async function getTestRunCount(): Promise<number> {
  return await db.testRuns.count()
}

/**
 * Delete a test run by ID and its associated files
 */
export async function deleteTestRun(id: string): Promise<void> {
  const testRun = await db.testRuns.get(id)

  if (!testRun) return

  // Delete associated file if exists
  if (testRun.input.fileRef) {
    await db.files.delete(testRun.input.fileRef)
  }

  // Delete test run
  await db.testRuns.delete(id)
}

/**
 * Save a file to the database
 */
export async function saveFile(file: StoredFile): Promise<string> {
  await db.files.put(file)
  return file.id
}

/**
 * Get a file by ID
 */
export async function getFile(id: string): Promise<StoredFile | undefined> {
  return db.files.get(id)
}

/**
 * Delete a file by ID
 */
export async function deleteFile(id: string): Promise<void> {
  await db.files.delete(id)
}

/**
 * Save a schema to the database
 */
export async function saveSchema(schema: JsonSchema): Promise<string> {
  await db.schemas.put(schema)
  return schema.id
}

/**
 * Get a schema by ID
 */
export async function getSchema(id: string): Promise<JsonSchema | undefined> {
  return db.schemas.get(id)
}

/**
 * Get all schemas
 */
export async function getAllSchemas(): Promise<JsonSchema[]> {
  return db.schemas.toArray()
}

/**
 * Delete a schema by ID
 */
export async function deleteSchema(id: string): Promise<void> {
  await db.schemas.delete(id)
}

/**
 * Clear all data from the database
 */
export async function clearDatabase(): Promise<void> {
  await Promise.all([
    db.testRuns.clear(),
    db.files.clear(),
    db.schemas.clear()
  ])
}
