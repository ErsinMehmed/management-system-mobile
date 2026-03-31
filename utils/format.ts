export function formatCurrency(value: number, decimals = 2): string {
  if (typeof value !== 'number' || isNaN(value)) return '0.00 лв.';
  return `${value.toFixed(decimals)} €`;
}

export function productTitle(product: {
  name?: string;
  flavor?: string;
  weight?: number;
  puffs?: number;
  count?: number;
} | null | undefined): string {
  if (!product) return '—';
  return [
    product.name,
    product.flavor,
    product.weight ? `${product.weight}гр.` : null,
    product.puffs ? `${product.puffs}k` : null,
    product.count ? `${product.count}бр.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}
