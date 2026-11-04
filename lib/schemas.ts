import { z } from "zod";
import { CATEGORY_KEYS } from "./categories";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
export const monthParamSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const transactionSchema = z.object({
  date: isoDate,
  kind: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("El monto tiene que ser mayor a 0"),
  currency: z.enum(["ARS", "USD"]),
  category: z.enum(CATEGORY_KEYS),
  description: z.string().trim().max(140).default(""),
});

export const budgetSchema = z.object({
  category: z.enum(CATEGORY_KEYS),
  monthlyLimit: z.coerce.number().positive(),
});

export const goalSchema = z.object({
  name: z.string().trim().min(2).max(80),
  targetAmount: z.coerce.number().positive(),
  savedAmount: z.coerce.number().min(0).default(0),
  currency: z.enum(["ARS", "USD"]),
  deadline: isoDate,
  priority: z.coerce.number().int().min(1).max(5),
});

export const investorProfileSchema = z.object({
  riskTolerance: z.coerce.number().int().min(1).max(5),
  emergencyMonths: z.coerce.number().int().min(1).max(24),
  emergencySaved: z.coerce.number().min(0),
  usdArsRate: z.coerce.number().positive(),
});

export const iolCredentialsSchema = z.object({
  username: z.string().trim().min(1, "Ingresá tu usuario de IOL"),
  password: z.string().min(1, "Ingresá tu contraseña de IOL"),
});
