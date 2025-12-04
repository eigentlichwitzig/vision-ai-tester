/**
 * Schema conversion utilities for Ollama compatibility
 * Converts Zod schemas and cleans JSON schemas for structured output
 */

import { zodToJsonSchema } from 'zod-to-json-schema'
import type { ZodType } from 'zod'

/**
 * Convert a Zod schema to a clean JSON schema for Ollama
 * Strips meta-fields that can cause issues with Ollama's structured output
 * 
 * @param zodSchema - Zod schema to convert
 * @returns Clean JSON schema object compatible with Ollama
 */
export function convertZodToOllamaSchema(zodSchema: ZodType): object {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    $refStrategy: 'none', // Inline all refs for Ollama compatibility
  })

  // Remove $schema meta-field that can cause issues
  const { $schema, ...cleanSchema } = jsonSchema as Record<string, unknown>

  return cleanSchema
}

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
  const { $schema, $id, definitions, ...cleanSchema } = schemaObj

  return cleanSchema
}
