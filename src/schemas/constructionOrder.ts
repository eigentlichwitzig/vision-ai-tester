/**
 * Zod schema definitions for construction orders
 * Mirrors the structure in public/schemas/construction-order.json
 */

import { z } from 'zod'

/**
 * Schema for individual line items in a construction order
 */
export const ConstructionOrderItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  unitPrice: z.number().optional(),
  totalPrice: z.number().optional()
})

/**
 * Schema for construction order documents
 */
export const ConstructionOrderSchema = z.object({
  orderNumber: z.string().describe('Unique order identifier'),
  date: z.string().describe('Order date in YYYY-MM-DD format'),
  projectName: z.string().optional().describe('Name of the construction project'),
  contractor: z.string().optional().describe('Contractor company name'),
  items: z.array(ConstructionOrderItemSchema).optional(),
  totalAmount: z.number().optional().describe('Total order amount'),
  notes: z.string().optional().describe('Additional notes or comments')
})

/**
 * TypeScript type inferred from the Zod schema
 */
export type ConstructionOrder = z.infer<typeof ConstructionOrderSchema>

/**
 * TypeScript type for line items
 */
export type ConstructionOrderItem = z.infer<typeof ConstructionOrderItemSchema>
