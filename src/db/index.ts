/**
 * IndexedDB configuration using Dexie.js
 * Manages local persistence for test runs, files, and schemas
 */

import Dexie, { type Table } from 'dexie'
import type { TestRun, JsonSchema } from '@/types/models'

/**
 * File storage record for large files
 */
export interface FileRecord {
  id: string
  name: string
  mimeType: string
  size: number
  content: string  // Base64 encoded content
  createdAt: Date
}

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
  files!: Table<FileRecord, string>
  schemas!: Table<JsonSchema, string>

  constructor() {
    super('VisionAITesterDB')
    
    // Define database schema
    this.version(1).stores({
      testRuns: 'id, timestamp, modelName, pipeline, status, [modelName+pipeline]',
      files: 'id, name, createdAt',
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
 * Save a test run to the database
 */
export async function saveTestRun(testRun: TestRun): Promise<string> {
  const stored = toStoredTestRun(testRun)
  await db.testRuns.put(stored)
  return testRun.id
}

/**
 * Get a test run by ID
 */
export async function getTestRun(id: string): Promise<TestRun | undefined> {
  const stored = await db.testRuns.get(id)
  return stored ? fromStoredTestRun(stored) : undefined
}

/**
 * Get all test runs, optionally filtered
 */
export async function getTestRuns(options?: {
  modelName?: string
  pipeline?: TestRun['pipeline']
  status?: TestRun['status']
  limit?: number
}): Promise<TestRun[]> {
  let query = db.testRuns.orderBy('timestamp').reverse()
  
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
 * Delete a test run by ID
 */
export async function deleteTestRun(id: string): Promise<void> {
  await db.testRuns.delete(id)
}

/**
 * Save a file to the database
 */
export async function saveFile(file: FileRecord): Promise<string> {
  await db.files.put(file)
  return file.id
}

/**
 * Get a file by ID
 */
export async function getFile(id: string): Promise<FileRecord | undefined> {
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
