export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return 'text-white';
  
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'text-white';

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'text-slate-900' : 'text-white';
}

export function getGradientContrastColor(startHex: string, endHex: string): string {
  if (!startHex || !endHex) return 'text-white';

  const start = startHex.replace('#', '');
  const r1 = parseInt(start.substring(0, 2), 16);
  const g1 = parseInt(start.substring(2, 4), 16);
  const b1 = parseInt(start.substring(4, 6), 16);
  const lum1 = (isNaN(r1) || isNaN(g1) || isNaN(b1) ? 0 : 0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255;

  const end = endHex.replace('#', '');
  const r2 = parseInt(end.substring(0, 2), 16);
  const g2 = parseInt(end.substring(2, 4), 16);
  const b2 = parseInt(end.substring(4, 6), 16);
  const lum2 = (isNaN(r2) || isNaN(g2) || isNaN(b2) ? 0 : 0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255;

  const avgLum = (lum1 + lum2) / 2;
  return avgLum > 0.5 ? 'text-slate-900' : 'text-white';
}

export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
