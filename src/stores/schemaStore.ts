/**
 * Schema management state
 * Manages JSON schemas for structured output validation
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ZodType } from 'zod'
import type { JsonSchema } from '@/types/models'
import { saveSchema, getSchema, getAllSchemas, deleteSchema } from '@/db'
import { cleanJsonSchemaForOllama, zodToOllamaSchema } from '@/utils/schemaConverter'
import { OrderListSchema } from '@/schemas/orderList'

/**
 * Default construction order schema ID
 * Note: Kept as 'construction-order' for backward compatibility with existing data
 */
export const DEFAULT_SCHEMA_ID = 'construction-order'

export const useSchemaStore = defineStore('schema', () => {
  // State
  const schemas = ref<JsonSchema[]>([])
  const activeSchemaId = ref<string | null>(DEFAULT_SCHEMA_ID)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeSchema = computed(() => {
    return schemas.value.find((s) => s.id === activeSchemaId.value) ?? null
  })
  
  const schemaNames = computed(() => {
    return schemas.value.map((s) => ({ id: s.id, name: s.name }))
  })
  
  const hasSchemas = computed(() => schemas.value.length > 0)

  /**
   * Load the default schema from Zod definition
   * Uses zodToOllamaSchema to generate JSON schema (like Pydantic's model_json_schema())
   */
  async function loadDefaultSchema(): Promise<JsonSchema | null> {
    try {
      // Generate schema from Zod (like Pydantic's model_json_schema())
      const schemaContent = zodToOllamaSchema(OrderListSchema)
      
      // Verify schema is not empty (protects against Zod version incompatibility)
      if (!schemaContent || typeof schemaContent !== 'object') {
        console.error('❌ Generated schema is empty or invalid! Check Zod version compatibility.')
        console.error('Schema content:', schemaContent)
        return null
      }
      
      const schemaObj = schemaContent as Record<string, unknown>
      if (!('type' in schemaObj) || !('properties' in schemaObj)) {
        console.error('❌ Generated schema is missing required fields! Check Zod version compatibility.')
        console.error('Schema content:', schemaContent)
        return null
      }
      
      const defaultSchema: JsonSchema = {
        id: DEFAULT_SCHEMA_ID,
        name: 'Order List',
        description: 'Schema for construction order documents (matches Python Pydantic)',
        schema: schemaContent
      }
      
      return defaultSchema
    } catch (err) {
      console.error('Failed to generate default schema:', err)
      return null
    }
  }

  /**
   * Initialize schemas from database and load defaults
   */
  async function initializeSchemas(): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      // Load schemas from database
      schemas.value = await getAllSchemas()
      
      // If no schemas exist, load the default
      if (schemas.value.length === 0) {
        const defaultSchema = await loadDefaultSchema()
        if (defaultSchema) {
          await saveSchema(defaultSchema)
          schemas.value = [defaultSchema]
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize schemas'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Add a new schema
   */
  async function addSchema(schema: JsonSchema): Promise<void> {
    try {
      await saveSchema(schema)
      schemas.value.push(schema)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save schema'
      throw err
    }
  }

  /**
   * Update an existing schema
   */
  async function updateSchema(id: string, updates: Partial<Omit<JsonSchema, 'id'>>): Promise<void> {
    const index = schemas.value.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new Error('Schema not found')
    }
    
    const updatedSchema: JsonSchema = {
      ...schemas.value[index],
      ...updates
    }
    
    try {
      await saveSchema(updatedSchema)
      schemas.value[index] = updatedSchema
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update schema'
      throw err
    }
  }

  /**
   * Remove a schema
   */
  async function removeSchema(id: string): Promise<void> {
    try {
      await deleteSchema(id)
      schemas.value = schemas.value.filter((s) => s.id !== id)
      
      // Reset active schema if it was deleted
      if (activeSchemaId.value === id) {
        activeSchemaId.value = schemas.value[0]?.id ?? null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete schema'
      throw err
    }
  }

  /**
   * Set the active schema
   */
  function setActiveSchema(id: string | null): void {
    activeSchemaId.value = id
  }

  /**
   * Get a schema by ID
   */
  async function getSchemaById(id: string): Promise<JsonSchema | undefined> {
    // First check local cache
    const cached = schemas.value.find((s) => s.id === id)
    if (cached) return cached
    
    // Otherwise fetch from database
    return getSchema(id)
  }

  /**
   * Validate data against active schema
   * Returns true if valid, or an error message if invalid
   */
  function validateAgainstSchema(data: unknown): true | string {
    if (!activeSchema.value) {
      return true // No schema to validate against
    }
    
    // Basic validation - in a real implementation, use a JSON Schema validator
    if (typeof data !== 'object' || data === null) {
      return 'Data must be an object'
    }
    
    // For now, just check that it's valid JSON
    try {
      JSON.stringify(data)
      return true
    } catch {
      return 'Invalid JSON structure'
    }
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * Get the active schema cleaned for Ollama compatibility
   * Removes meta-fields like $schema that may cause issues
   */
  function getActiveSchemaForOllama(): object | null {
    if (!activeSchema.value?.schema) {
      return null
    }
    return cleanJsonSchemaForOllama(activeSchema.value.schema)
  }

  /**
   * Register a Zod schema and convert it to JSON schema
   * Useful for type-safe schema definitions
   */
  async function addZodSchema(
    id: string,
    name: string,
    zodSchema: ZodType,
    description?: string
  ): Promise<void> {
    const jsonSchema = zodToOllamaSchema(zodSchema)
    
    const schema: JsonSchema = {
      id,
      name,
      description,
      schema: jsonSchema
    }
    
    await addSchema(schema)
  }

  return {
    // State
    schemas,
    activeSchemaId,
    isLoading,
    error,
    
    // Getters
    activeSchema,
    schemaNames,
    hasSchemas,
    
    // Actions
    initializeSchemas,
    addSchema,
    addZodSchema,
    updateSchema,
    removeSchema,
    setActiveSchema,
    getSchemaById,
    validateAgainstSchema,
    getActiveSchemaForOllama,
    clearError
  }
})
