/**
 * Zod schema definitions for Order List documents
 * Mirrors the structure of the Python Pydantic models provided by the user
 * for parsing construction/wood order documents with Ollama
 */

import { z } from 'zod'

/**
 * Contact information schema
 */
export const ContactInfoSchema = z.object({
  phone: z.string(),
  fax: z.string(),
  website: z.string(),
  email: z.string()
})

/**
 * Order project details schema
 */
export const OrderProjectSchema = z.object({
  date: z.string(),
  Construction_project: z.string(),
  Construction_project_no: z.number().int().nullable(),
  Location: z.string(),
  Customer_name: z.string(),
  Customer_no: z.number().int(),
  processor: z.string()
})

/**
 * Individual order item schema (e.g., wood planks, beams)
 */
export const OrderItemSchema = z.object({
  STK: z.number().int(),
  name: z.string(),
  sku: z.string(),
  width: z.number(),
  width_unit: z.string(),
  height: z.number(),
  height_unit: z.string(),
  length: z.number(),
  length_unit: z.string(),
  total_length: z.number().nullable(),
  total_length_unit: z.string().nullable(),
  volume: z.number(),
  volume_unit: z.string()
})

/**
 * Totals schema for partial list summaries
 */
export const TotalsSchema = z.object({
  STK: z.number().int(),
  total_length: z.number(),
  total_length_unit: z.string().nullable(),
  total_volume: z.number(),
  total_volume_unit: z.string().nullable(),
  total_area: z.number(),
  total_area_unit: z.string().nullable(),
  SBruttoL: z.number(),
  SBruttoL_unit: z.string().nullable()
})

/**
 * Partial list schema (group of items with subtotals)
 */
export const PartialListSchema = z.object({
  list_name: z.string().nullable(),
  items: z.array(OrderItemSchema),
  partial_list_total: TotalsSchema.nullable()
})

/**
 * Order list total schema
 */
export const OrderListTotalSchema = z.object({
  STK: z.number().int(),
  total_length: z.number(),
  total_length_unit: z.string().nullable(),
  total_volume: z.number(),
  total_volume_unit: z.string().nullable(),
  total_area: z.number(),
  total_area_unit: z.string().nullable(),
  SBruttoL: z.number(),
  SBruttoL_unit: z.string().nullable()
})

/**
 * Main order list schema - the root document structure
 */
export const OrderListSchema = z.object({
  contactInfo: ContactInfoSchema,
  order: OrderProjectSchema,
  partial_list: z.array(PartialListSchema),
  total_OrderList: OrderListTotalSchema
})

// TypeScript types derived from schemas
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type OrderProject = z.infer<typeof OrderProjectSchema>
export type OrderItem = z.infer<typeof OrderItemSchema>
export type Totals = z.infer<typeof TotalsSchema>
export type PartialList = z.infer<typeof PartialListSchema>
export type OrderListTotal = z.infer<typeof OrderListTotalSchema>
export type OrderList = z.infer<typeof OrderListSchema>
