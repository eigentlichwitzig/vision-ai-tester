/**
 * Dexie.js database schema and configuration
 * 
 * Provides IndexedDB storage for:
 * - Test runs history
 * - Large file storage (files > 5MB)
 * - User preferences
 */

import Dexie, { type Table } from 'dexie'
import type { TestRun, JsonSchema } from '@/types/models'

/**
 * Stored file reference for large files
 */
export interface StoredFile {
  id: string
  fileName: string
  mimeType: string
  size: number
  content: Blob
  createdAt: Date
}

/**
 * User preferences stored in IndexedDB
 */
export interface UserPreferences {
  id: string
  key: string
  value: unknown
  updatedAt: Date
}

class VisionAIDatabase extends Dexie {
  testRuns!: Table<TestRun, string>
  files!: Table<StoredFile, string>
  schemas!: Table<JsonSchema, string>
  preferences!: Table<UserPreferences, string>

  constructor() {
    super('VisionAITester')
    
    this.version(1).stores({
      testRuns: 'id, timestamp, modelName, pipeline, status, [modelName+pipeline]',
      files: 'id, fileName, createdAt',
      schemas: 'id, name',
      preferences: 'id, key'
    })
  }
}

export const db = new VisionAIDatabase()

// Convenience functions for test runs
export async function saveTestRun(run: TestRun): Promise<string> {
  return db.testRuns.add(run)
}

export async function getTestRun(id: string): Promise<TestRun | undefined> {
  return db.testRuns.get(id)
}

export async function getAllTestRuns(limit = 100): Promise<TestRun[]> {
  return db.testRuns
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function deleteTestRun(id: string): Promise<void> {
  await db.testRuns.delete(id)
}

// Convenience functions for file storage
export async function saveFile(file: StoredFile): Promise<string> {
  return db.files.add(file)
}

export async function getFile(id: string): Promise<StoredFile | undefined> {
  return db.files.get(id)
}

export async function deleteFile(id: string): Promise<void> {
  await db.files.delete(id)
}

// Convenience functions for schemas
export async function saveSchema(schema: JsonSchema): Promise<string> {
  return db.schemas.add(schema)
}

export async function getSchema(id: string): Promise<JsonSchema | undefined> {
  return db.schemas.get(id)
}

export async function getAllSchemas(): Promise<JsonSchema[]> {
  return db.schemas.toArray()
}
