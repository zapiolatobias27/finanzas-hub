export const CATEGORIES = {
  sueldo: { label: "Sueldo / ingresos", income: true },
  vivienda: { label: "Vivienda y expensas", income: false },
  servicios: { label: "Servicios", income: false },
  supermercado: { label: "Supermercado", income: false },
  comida: { label: "Delivery y salidas", income: false },
  transporte: { label: "Transporte", income: false },
  salud: { label: "Salud", income: false },
  suscripciones: { label: "Suscripciones", income: false },
  ocio: { label: "Ocio", income: false },
  educacion: { label: "Educación", income: false },
  ropa: { label: "Ropa", income: false },
  otros: { label: "Otros", income: false },
} as const;

export type Category = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as [Category, ...Category[]];

const RULES: [RegExp, Category][] = [
  [/rappi|pedidos ?ya|mcdonald|burger|resto|bar |cafe/i, "comida"],
  [/coto|carrefour|\bdia\b|jumbo|disco|chango|vea|supermerc|almac/i, "supermercado"],
  [/uber|cabify|didi|sube|ypf|shell|axion|peaje|estacionam/i, "transporte"],
  [/netflix|spotify|disney|hbo ?max|youtube|apple|google|prime/i, "suscripciones"],
  [/edenor|edesur|metrogas|aysa|personal|movistar|claro|telecentro|fibertel/i, "servicios"],
  [/farmacity|farmacia|osde|swiss|galeno|medic/i, "salud"],
  [/alquiler|expensa|inmobil/i, "vivienda"],
  [/sueldo|haberes|honorarios|salario/i, "sueldo"],
];

/** Categorización automática por palabras clave (para movimientos importados). */
export function guessCategory(description: string): Category {
  return RULES.find(([re]) => re.test(description))?.[1] ?? "otros";
}
