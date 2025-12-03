/**
 * Composable for JSON schema validation using AJV
 * Validates parsed JSON output against JSON schemas and provides detailed error messages
 */

import { ref } from 'vue'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { ValidationError } from '@/types/models'

// Module-level singleton AJV instance for performance
// Avoids recreating the validator on every composable invocation
const ajv = new Ajv({
  allErrors: true, // Return all errors, not just the first one
  strict: true,
  strictSchema: false, // Allow additional keywords in schema
  strictTypes: false // Allow coercible types
})

// Add format validators for dates, emails, etc.
addFormats(ajv)

/**
 * Convert AJV error keyword to human-readable message
 */
function formatErrorMessage(error: {
  keyword: string
  params: Record<string, unknown>
  schemaPath: string
  instancePath: string
}): string {
  const { keyword, params } = error
  
  switch (keyword) {
    case 'type':
      return `Must be ${params.type}`
    case 'required':
      return `Required field "${params.missingProperty}" is missing`
    case 'additionalProperties':
      return `Additional property "${params.additionalProperty}" not defined in schema`
    case 'enum':
      return `Must be one of: ${(params.allowedValues as unknown[])?.join(', ')}`
    case 'minimum':
      return `Must be >= ${params.limit}`
    case 'maximum':
      return `Must be <= ${params.limit}`
    case 'minLength':
      return `Must be at least ${params.limit} characters`
    case 'maxLength':
      return `Must be at most ${params.limit} characters`
    case 'pattern':
      return `Must match pattern: ${params.pattern}`
    case 'format':
      return `Must match format "${params.format}"`
    case 'minItems':
      return `Array must have at least ${params.limit} items`
    case 'maxItems':
      return `Array must have at most ${params.limit} items`
    case 'uniqueItems':
      return 'Array items must be unique'
    case 'const':
      return `Must be exactly: ${JSON.stringify(params.allowedValue)}`
    default:
      return `Validation failed: ${keyword}`
  }
}

/**
 * Convert AJV instance path to user-friendly field path
 * Example: "/lineItems/0/quantity" -> "lineItems[0].quantity"
 */
function formatFieldPath(instancePath: string): string {
  if (!instancePath) return '(root)'
  
  return instancePath
    .split('/')
    .filter(Boolean)
    .map((part, index, array) => {
      // Check if part is a number (array index)
      if (/^\d+$/.test(part)) {
        return `[${part}]`
      }
      // Add dot before property names (except for first element)
      return index === 0 || /^\d+$/.test(array[index - 1]) ? part : `.${part}`
    })
    .join('')
}

/**
 * Composable for JSON schema validation
 * Provides state management and validation logic for JSON schema validation
 */
export function useSchemaValidator() {
  // Validation state
  const isValid = ref(false)
  const errors = ref<ValidationError[]>([])
  
  /**
   * Validate data against a JSON schema
   * @param data - The data to validate
   * @param schema - The JSON schema to validate against
   * @returns true if valid, false if invalid
   */
  function validate(data: unknown, schema: object): boolean {
    errors.value = []
    
    try {
      const validateFn = ajv.compile(schema)
      const valid = validateFn(data)
      
      if (valid) {
        isValid.value = true
        return true
      }
      
      // Convert AJV errors to ValidationError format
      if (validateFn.errors) {
        errors.value = validateFn.errors.map((ajvError) => {
          const field = formatFieldPath(ajvError.instancePath)
          const keyword = ajvError.keyword
          const params = ajvError.params as object | undefined
          
          // Handle required field errors specially
          let displayField = field
          if (keyword === 'required' && params && 'missingProperty' in params) {
            const missingProp = (params as { missingProperty: string }).missingProperty
            displayField = field === '(root)' ? missingProp : `${field}.${missingProp}`
          }
          
          return {
            field: displayField,
            message: formatErrorMessage({
              keyword,
              params: (params || {}) as Record<string, unknown>,
              schemaPath: ajvError.schemaPath,
              instancePath: ajvError.instancePath
            }),
            schemaPath: ajvError.schemaPath,
            keyword,
            params
          } as ValidationError
        })
      }
      
      isValid.value = false
      return false
    } catch (err) {
      // Schema compilation error
      errors.value = [{
        field: '(schema)',
        message: err instanceof Error ? err.message : 'Invalid schema',
        schemaPath: '',
        keyword: 'schema'
      }]
      isValid.value = false
      return false
    }
  }
  
  /**
   * Get human-readable error messages
   * @returns Array of error message strings
   */
  function getErrorMessages(): string[] {
    return errors.value.map((err) => {
      return `${err.field}: ${err.message}`
    })
  }
  
  /**
   * Get errors grouped by field
   * @returns Object mapping field paths to error messages
   */
  function getFieldErrors(): Record<string, string> {
    const fieldErrors: Record<string, string> = {}
    
    for (const err of errors.value) {
      if (fieldErrors[err.field]) {
        fieldErrors[err.field] += `; ${err.message}`
      } else {
        fieldErrors[err.field] = err.message
      }
    }
    
    return fieldErrors
  }
  
  /**
   * Clear validation state
   * Useful when resetting the form or starting a new validation session
   */
  function clear(): void {
    isValid.value = false
    errors.value = []
  }
  
  return {
    // State
    isValid,
    errors,
    
    // Actions
    validate,
    getErrorMessages,
    getFieldErrors,
    clear
  }
}
