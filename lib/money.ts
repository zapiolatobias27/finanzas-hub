export type Currency = "ARS" | "USD";

export function toARS(amount: number, currency: Currency, usdArs: number): number {
  return currency === "USD" ? amount * usdArs : amount;
}

export function formatMoney(amount: number, currency: Currency = "ARS"): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
