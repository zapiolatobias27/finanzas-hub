// Catálogo de activos soportados. Puro: lo usan el server, los tests y (más adelante) la app móvil.

export type AssetKind = "cedear" | "accion" | "cripto";
export type Chain = "bitcoin" | "ethereum";

export const KIND_LABEL: Record<AssetKind, string> = {
  cedear: "CEDEARs",
  accion: "Acciones",
  cripto: "Cripto",
};

export const CHAIN_LABEL: Record<Chain, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
};

/** Símbolo → id de CoinGecko. */
export const CRYPTO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  DAI: "dai",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  LINK: "chainlink",
  LTC: "litecoin",
  POL: "polygon-ecosystem-token",
};

/** Tokens ERC-20 que se leen de las billeteras de Ethereum. */
export const ERC20_TOKENS = [
  { symbol: "USDT", contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  { symbol: "USDC", contract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  { symbol: "DAI", contract: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
] as const;

const BTC_ADDRESS = /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function isValidAddress(chain: Chain, address: string): boolean {
  return chain === "bitcoin" ? BTC_ADDRESS.test(address) : ETH_ADDRESS.test(address);
}

export function shortAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}
