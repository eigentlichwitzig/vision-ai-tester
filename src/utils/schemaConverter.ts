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
 * Convert a Zod schema to JSON Schema format for Ollama
 * This is equivalent to Pydantic's model_json_schema()
 *
 * Output format matches Ollama's structured output requirements:
 * {
 *   type: "object",
 *   properties: { ... },
 *   required: [ ... ]
 * }
 *
 * CRITICAL:
 * - Removes $schema and other meta-fields that cause Ollama to ignore the format
 * - Inlines all $refs (Ollama doesn't support $ref)
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

  // Remove meta-fields that cause issues with Ollama
  // Ollama expects: { type, properties, required } without $schema, $ref, etc.
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
