import { z } from "zod";

// ==================== AUTH SCHEMAS ====================
export const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const RegisterMerchantSchema = z.object({
  merchantName: z.string().min(1, "Merchant name is required").max(255),
  storeName: z.string().min(1, "Store name is required").max(255),
  fullName: z.string().min(1, "Full name is required").max(255),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterMerchantInput = z.infer<typeof RegisterMerchantSchema>;

// ==================== SALES SCHEMAS ====================
const SaleItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  qty: z.number().int().positive("Quantity must be greater than 0"),
  price: z.number().positive("Price must be greater than 0").optional(),
});

const PaymentSchema = z.object({
  method: z.string().min(1, "Payment method is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  reference: z.string().optional(),
});

export const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, "Sale must have at least one item"),
  payments: z.array(PaymentSchema).min(1, "Sale must have at least one payment"),
  discount: z.number().nonnegative("Discount cannot be negative").optional(),
  discountPromoCode: z.string().max(50, "Promo code too long").optional(),
  tax: z.number().nonnegative("Tax cannot be negative").optional(),
  clientTxnId: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

// ==================== REFUNDS SCHEMAS ====================
const RefundItemSchema = z.object({
  saleItemId: z.string().uuid("Invalid sale item ID"),
  qty: z.number().int().positive("Quantity must be greater than 0"),
});

export const CreateRefundSchema = z.object({
  items: z.array(RefundItemSchema).min(1, "Refund must have at least one item"),
  reason: z.string().max(500, "Reason too long").optional(),
  restock: z.boolean().optional().default(true),
});

export type CreateRefundInput = z.infer<typeof CreateRefundSchema>;

// ==================== PRODUCT SCHEMAS ====================
export const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  barcode: z.string().max(100).optional(),
  category: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be greater than 0"),
  taxRate: z.number().min(0).max(100).optional(),
  cost: z.number().nonnegative("Cost cannot be negative").optional(),
  description: z.string().max(1000).optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

// ==================== INVENTORY SCHEMAS ====================
export const UpdateInventorySchema = z.object({
  qty: z.number().int("Quantity must be an integer"),
  reason: z.string().optional(),
});

export type UpdateInventoryInput = z.infer<typeof UpdateInventorySchema>;

// ==================== DISCOUNT SCHEMAS ====================
export const CreateDiscountSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  type: z.enum(["PERCENTAGE", "FIXED"]).catch("PERCENTAGE"),
  value: z.number().positive("Value must be greater than 0"),
  maxUsesTotal: z.number().int().positive().optional(),
  maxUsesPerCustomer: z.number().int().nonnegative().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  description: z.string().max(500).optional(),
});

export type CreateDiscountInput = z.infer<typeof CreateDiscountSchema>;

// ==================== VALIDATION UTILITIES ====================
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const data_validated = schema.parse(data);
    return { success: true, data: data_validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}
