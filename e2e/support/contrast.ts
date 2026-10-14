export const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const s = parseInt(hex.slice(at, at + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
