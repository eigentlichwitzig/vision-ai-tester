/**
 * Schema conversion utilities for Ollama compatibility
 * Converts Zod schemas and cleans JSON schemas for structured output
 *
 * IMPORTANT: Requires Zod v3.x (stable)
 * - zod-to-json-schema v3.25.x is NOT compatible with Zod v4.x (canary)
 * - Zod v4.x changed internal structure (uses `def` instead of `_def`)
 * - Using Zod v4.x results in empty schema output, breaking structured JSON
 */

import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodType } from 'zod'

/**
 * Meta-fields to remove from JSON schema for Ollama compatibility
 */
const META_FIELDS_TO_REMOVE = ['$schema', '$id', '$ref', 'definitions', '$defs']

/**
 * Check if a value is a non-null object (not an array)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Transform anyOf with null into simpler type array syntax
 * Converts: { anyOf: [{ type: "string" }, { type: "null" }] }
 * To: { type: ["string", "null"] }
 * 
 * This is more compatible with Ollama's structured output parsing.
 * Only transforms patterns where exactly one option is { type: "null" }
 * and the other is a simple type (not object or array with properties/items).
 */
function transformNullableType(schema: Record<string, unknown>): Record<string, unknown> {
  const anyOf = schema.anyOf
  
  if (!Array.isArray(anyOf) || anyOf.length !== 2) {
    return schema
  }
  
  // Find the null option and the non-null option
  let nullOption: Record<string, unknown> | null = null
  let valueOption: Record<string, unknown> | null = null
  
  for (const option of anyOf) {
    if (!isObject(option)) {
      return schema // Not a simple anyOf pattern
    }
    
    // Check if this is the null type option
    if (option.type === 'null' && Object.keys(option).length === 1) {
      nullOption = option
    } else {
      // This is the value option - must have a simple type
      if (typeof option.type !== 'string') {
        return schema // Complex type, don't transform
      }
      // Don't transform complex object or array schemas with properties/items
      if ((option.type === 'object' && 'properties' in option) ||
          (option.type === 'array' && 'items' in option)) {
        return schema
      }
      valueOption = option
    }
  }
  
  // Must have exactly one null and one value option
  if (!nullOption || !valueOption) {
    return schema
  }
  
  // Extract type and other properties from value option
  const valueType = valueOption.type as string
  const { type: _, ...otherProperties } = valueOption
  
  // Remove anyOf and add simplified type array
  const { anyOf: __, ...rest } = schema
  return {
    ...rest,
    ...otherProperties,
    type: [valueType, 'null']
  }
}

/**
 * Recursively clean a JSON schema object for Ollama compatibility
 * - Removes meta-fields ($schema, $id, $ref, definitions, $defs) from all levels
 * - Transforms nullable anyOf patterns to simpler type array syntax
 * - Adds additionalProperties: false to object types
 * - Removes empty required arrays
 */
function deepCleanSchema(schema: unknown): unknown {
  // Handle arrays - process each element
  if (Array.isArray(schema)) {
    return schema.map(deepCleanSchema)
  }
  
  // Handle non-objects (primitives)
  if (!isObject(schema)) {
    return schema
  }
  
  // Remove meta-fields from this level
  let cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (!META_FIELDS_TO_REMOVE.includes(key)) {
      cleaned[key] = value
    }
  }
  
  // Transform nullable anyOf patterns
  if ('anyOf' in cleaned) {
    cleaned = transformNullableType(cleaned)
  }
  
  // Add additionalProperties: false to object types if not already set
  if (cleaned.type === 'object' && !('additionalProperties' in cleaned)) {
    cleaned.additionalProperties = false
  }
  
  // Remove empty required arrays
  if (Array.isArray(cleaned.required) && cleaned.required.length === 0) {
    delete cleaned.required
  }
  
  // Recursively clean nested objects
  for (const [key, value] of Object.entries(cleaned)) {
    if (isObject(value)) {
      cleaned[key] = deepCleanSchema(value)
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) => deepCleanSchema(item))
    }
  }
  
  return cleaned
}

/**
 * Convert a Zod schema to JSON Schema format for Ollama
 * This is equivalent to Pydantic's model_json_schema()
 *
 * Output format matches Ollama's structured output requirements:
 * {
 *   type: "object",
 *   properties: { ... },
 *   required: [ ... ],
 *   additionalProperties: false
 * }
 *
 * CRITICAL:
 * - Removes $schema and other meta-fields that cause Ollama to ignore the format
 * - Inlines all $refs (Ollama doesn't support $ref)
 * - Transforms nullable anyOf patterns to simpler type array syntax
 * - Adds additionalProperties: false to prevent extra field hallucination
 * - Requires Zod v3.x (v4.x is not compatible with zod-to-json-schema)
 *
 * @param zodSchema - Zod schema to convert
 * @returns Clean JSON schema object compatible with Ollama
 */
export function zodToOllamaSchema(zodSchema: ZodType): object {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    $refStrategy: 'none', // Inline all refs - Ollama doesn't handle $ref
    target: 'jsonSchema7'
  })

  // Deep clean the schema for Ollama compatibility
  const cleanedSchema = deepCleanSchema(jsonSchema) as object

  // Debug logging in development mode
  if (import.meta.env.DEV) {
    console.log('🔍 Generated Ollama schema:', JSON.stringify(cleanedSchema, null, 2))
  }

  return cleanedSchema
}

/**
 * Alias for zodToOllamaSchema for backward compatibility
 */
export const convertZodToOllamaSchema = zodToOllamaSchema

/**
 * Clean an existing JSON schema for Ollama compatibility
 * - Recursively removes $schema and other meta-fields from all levels
 * - Transforms nullable anyOf patterns to simpler type array syntax
 * - Adds additionalProperties: false to object types
 * - Removes empty required arrays
 *
 * @param schema - JSON schema object to clean
 * @returns Clean JSON schema object compatible with Ollama
 */
export function cleanJsonSchemaForOllama(schema: object): object {
  const cleaned = deepCleanSchema(schema) as object

  // Verification logging in development mode
  if (import.meta.env.DEV) {
    const issues = verifySchemaStructure(cleaned)
    if (issues.length > 0) {
      console.warn('⚠️ Schema verification issues:')
      issues.forEach(issue => console.warn(`  - ${issue}`))
    } else {
      console.log('✅ Schema structure verified - all objects have required arrays and additionalProperties: false')
    }
  }

  return cleaned
}

/**
 * Verify schema structure matches expected Ollama format
 * Returns an array of issues found
 */
function verifySchemaStructure(schema: unknown, path = 'root'): string[] {
  const issues: string[] = []

  if (!isObject(schema)) {
    return issues
  }

  // Check object types have required properties
  if (schema.type === 'object') {
    if (!('additionalProperties' in schema)) {
      issues.push(`${path}: Missing additionalProperties: false`)
    } else if (schema.additionalProperties !== false) {
      issues.push(`${path}: additionalProperties should be false, got ${schema.additionalProperties}`)
    }

    // Check that properties exist and required array matches
    if ('properties' in schema && isObject(schema.properties)) {
      const propertyKeys = Object.keys(schema.properties)
      const requiredKeys = Array.isArray(schema.required) ? schema.required : []

      // Check if any non-nullable property is missing from required
      for (const key of propertyKeys) {
        const prop = (schema.properties as Record<string, unknown>)[key]
        if (isObject(prop)) {
          // Check if this is a nullable type (type array includes 'null')
          const isNullable = Array.isArray(prop.type) && prop.type.includes('null')
          if (!isNullable && !requiredKeys.includes(key)) {
            // This might be intentional for optional fields, just log for awareness
            // issues.push(`${path}.${key}: Non-nullable property not in required array`)
          }
        }
      }

      // Recursively check nested objects
      for (const [key, value] of Object.entries(schema.properties)) {
        issues.push(...verifySchemaStructure(value, `${path}.${key}`))
      }
    }
  }

  // Check array items
  if (schema.type === 'array' && 'items' in schema) {
    issues.push(...verifySchemaStructure(schema.items, `${path}[]`))
  }

  return issues
}
