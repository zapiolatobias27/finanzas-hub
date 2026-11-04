import { describe, expect, it } from "vitest";
import { isValidAddress } from "./assets";
import { valueHoldings, type Holding } from "./networth";

const MEP = 1500;
const quotes = {
  byma: new Map([
    ["SPY", { price: 21000, changePct: 2 }],
    ["GGAL", { price: 5400, changePct: -1 }],
  ]),
  crypto: { bitcoin: { price: 80000, changePct: 5 } },
};
const h = (over: Partial<Holding>): Holding => ({ id: "x", source: "manual", kind: "cedear", symbol: "SPY", label: "", quantity: 1, avgPrice: null, ...over });

describe("valueHoldings", () => {
  it("valúa BYMA en ARS y cripto en USD, consolidando con el MEP", () => {
    const nw = valueHoldings(
      [h({ id: "a", symbol: "SPY", quantity: 10 }), h({ id: "b", kind: "cripto", symbol: "BTC", quantity: 0.01 })],
      quotes,
      MEP,
    );
    const spy = nw.items.find((i) => i.symbol === "SPY")!;
    const btc = nw.items.find((i) => i.symbol === "BTC")!;
    expect(spy.valueArs).toBe(210000);
    expect(spy.valueUsd).toBe(140);
    expect(btc.valueUsd).toBe(800);
    expect(btc.valueArs).toBe(1_200_000);
    expect(nw.totalUsd).toBe(940);
    expect(nw.byKind.cripto.usd).toBe(800);
    expect(nw.items[0].symbol).toBe("BTC"); // ordenado por valor
  });

  it("calcula la variación del día y la ganancia vs. precio de compra", () => {
    const nw = valueHoldings([h({ kind: "cripto", symbol: "BTC", quantity: 1, avgPrice: 64000 })], quotes, MEP);
    expect(nw.items[0].pnlPct).toBeCloseTo(25);
    expect(nw.change24hUsd).toBeCloseTo(80000 - 80000 / 1.05);
  });

  it("usa el valorizado de IOL si el ticker no cotiza en vivo", () => {
    const nw = valueHoldings([h({ source: "iol", symbol: "XXXX", fallback: { amount: 300000, currency: "ARS" } })], quotes, MEP);
    expect(nw.items[0].live).toBe(false);
    expect(nw.totalUsd).toBe(200);
  });
});

describe("isValidAddress", () => {
  it("acepta direcciones públicas y rechaza basura", () => {
    expect(isValidAddress("ethereum", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(true);
    expect(isValidAddress("bitcoin", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")).toBe(true);
    expect(isValidAddress("ethereum", "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh")).toBe(false);
    expect(isValidAddress("bitcoin", "abandon ability able about above absent")).toBe(false);
  });
});
