/**
 * Schema store - manages JSON schemas for structured output
 */

import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { JsonSchema } from '@/types/models'

export const useSchemaStore = defineStore('schema', () => {
  // Available schemas
  const schemas: Ref<JsonSchema[]> = ref([])
  
  // Currently selected schema
  const selectedSchemaId: Ref<string | null> = ref(null)
  
  // Loading state
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  // Computed
  const selectedSchema: ComputedRef<JsonSchema | undefined> = computed(() => 
    schemas.value.find(s => s.id === selectedSchemaId.value)
  )

  // Actions
  function addSchema(schema: JsonSchema): void {
    const existing = schemas.value.findIndex(s => s.id === schema.id)
    if (existing >= 0) {
      schemas.value[existing] = schema
    } else {
      schemas.value.push(schema)
    }
  }

  function removeSchema(id: string): void {
    schemas.value = schemas.value.filter(s => s.id !== id)
    if (selectedSchemaId.value === id) {
      selectedSchemaId.value = null
    }
  }

  function selectSchema(id: string | null): void {
    selectedSchemaId.value = id
  }

  async function loadFromFile(file: File): Promise<JsonSchema | null> {
    isLoading.value = true
    error.value = null
    
    try {
      const content = await file.text()
      const parsed = JSON.parse(content) as object
      
      const schema: JsonSchema = {
        id: crypto.randomUUID(),
        name: file.name.replace('.json', ''),
        schema: parsed
      }
      
      addSchema(schema)
      return schema
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load schema'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function loadFromUrl(url: string, name: string): Promise<JsonSchema | null> {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      
      const parsed = await response.json() as object
      
      const schema: JsonSchema = {
        id: crypto.randomUUID(),
        name,
        schema: parsed
      }
      
      addSchema(schema)
      return schema
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load schema'
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    schemas,
    selectedSchemaId,
    isLoading,
    error,
    // Computed
    selectedSchema,
    // Actions
    addSchema,
    removeSchema,
    selectSchema,
    loadFromFile,
    loadFromUrl
  }
}, {
  persist: {
    pick: ['schemas', 'selectedSchemaId']
  }
})
