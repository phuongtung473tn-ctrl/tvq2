/**
 * A/B Split Testing — Traffic Splitter.
 * Gán biến thể cho khách lần đầu vào trang và ghi nhớ ở localStorage
 * để lần sau vẫn thấy đúng biến thể đó.
 */
const KEY_PREFIX = "funnel_ab_variant_v2";
const variants = new Map<string, "A" | "B">();

export function getVariant(enabled: boolean, splitToB: number): "A" | "B" {
  if (typeof window === "undefined" || !enabled) return "A";
  const split = Math.min(100, Math.max(0, Number(splitToB) || 0));
  const key = `${KEY_PREFIX}_${split}`;
  const saved = variants.get(key);
  if (saved) return saved;
  const variant = Math.random() * 100 < split ? "B" : "A";
  variants.set(key, variant);
  return variant;
}

export function resetVariant(splitToB?: number): void {
  if (typeof window === "undefined") return;
  if (splitToB === undefined) {
    variants.clear();
  } else {
    const split = Math.min(100, Math.max(0, Number(splitToB) || 0));
    variants.delete(`${KEY_PREFIX}_${split}`);
  }
}

/**
 * Nguồn traffic — uỷ quyền hoàn toàn cho Hub UTM (src/lib/utm-hub.ts)
 * để chỉ có MỘT nơi duy nhất đọc URL, quy đổi và lưu trữ attribution.
 */
export { detectReferrerSource } from "@/lib/utm-hub";

import { getUtmSource } from "@/lib/utm-hub";

export function utmSource(): string {
  if (typeof window === "undefined") return "direct";
  try {
    return getUtmSource("last");
  } catch {
    return "direct";
  }
}
