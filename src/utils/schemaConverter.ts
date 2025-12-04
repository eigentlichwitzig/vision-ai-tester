/**
 * Schema conversion utilities for Ollama compatibility
 * Converts Zod schemas and cleans JSON schemas for structured output
 */

import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodType } from 'zod'

/**
 * Convert a Zod schema to JSON Schema format for Ollama
 * This is equivalent to Pydantic's model_json_schema()
 * 
 * CRITICAL: Removes $schema and other meta-fields that cause Ollama to ignore the format
 * 
 * @param zodSchema - Zod schema to convert
 * @returns Clean JSON schema object compatible with Ollama
 */
export function zodToOllamaSchema(zodSchema: ZodType): object {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    $refStrategy: 'none', // Inline all refs - Ollama doesn't handle $ref
    target: 'jsonSchema7'
  })

  // Remove meta-fields that cause issues with Ollama
  const schemaObj = jsonSchema as Record<string, unknown>
  const { $schema, $id, $ref, definitions, $defs, ...cleanSchema } = schemaObj

  return cleanSchema
}

/**
 * Alias for zodToOllamaSchema for backward compatibility
 */
export const convertZodToOllamaSchema = zodToOllamaSchema

/**
 * Clean an existing JSON schema for Ollama compatibility
 * Removes $schema and other meta-fields that may cause issues
 * 
 * @param schema - JSON schema object to clean
 * @returns Clean JSON schema object compatible with Ollama
 */
export function cleanJsonSchemaForOllama(schema: object): object {
  const schemaObj = schema as Record<string, unknown>
  // Remove common meta-fields that Ollama may not handle well
  const { $schema, $id, $ref, definitions, $defs, ...cleanSchema } = schemaObj

  return cleanSchema
}
