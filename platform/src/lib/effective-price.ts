export function effectiveVariationPrice(variation?: {
  price?: number;
  discounted?: number;
}): number {
  if (!variation) return 0;
  if (variation.discounted != null && variation.discounted > 0) {
    return variation.discounted;
  }
  return variation.price ?? 0;
}
