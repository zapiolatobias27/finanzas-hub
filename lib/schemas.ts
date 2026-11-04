import { z } from "zod";
import { CRYPTO_IDS, isValidAddress } from "./assets";
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

export const walletSchema = z
  .object({
    chain: z.enum(["bitcoin", "ethereum"]),
    address: z.string().trim().min(1, "Pegá la dirección pública de la billetera"),
    label: z.string().trim().max(40).optional().default(""),
  })
  .refine((w) => isValidAddress(w.chain, w.address), {
    path: ["address"],
    message: "Esa dirección no parece válida para la red elegida. Revisá que sea la pública (no la frase semilla).",
  });

export const positionSchema = z
  .object({
    kind: z.enum(["cedear", "accion", "cripto"]),
    symbol: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9.]{1,12}$/, "Usá el ticker, por ejemplo SPY, GGAL o BTC"),
    quantity: z.coerce.number().positive("La cantidad tiene que ser mayor a 0"),
    avgPrice: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).optional()),
  })
  .refine((p) => p.kind !== "cripto" || p.symbol in CRYPTO_IDS, {
    path: ["symbol"],
    message: `Cripto no soportada todavía. Probá con: ${Object.keys(CRYPTO_IDS).join(", ")}`,
  });

export const consultAnswersSchema = z.object({
  amount: z.number().positive("Indicá cuánto querés invertir").max(1e12),
  currency: z.enum(["ARS", "USD"]),
  goal: z.enum(["preservar", "dolarizar", "renta", "crecer"]),
  targetReturn: z.number().min(0).max(50),
  horizon: z.enum(["lt1", "1to3", "3to5", "gt5"]),
  maxDrawdown: z.number().min(0).max(60),
  reaction: z.enum(["vendo", "espero", "compro"]),
  needsLiquidity: z.boolean(),
  experience: z.enum(["ninguna", "basica", "intermedia", "avanzada"]),
  crypto: z.enum(["no", "poco", "si"]),
});
