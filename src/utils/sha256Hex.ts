/** SHA-256 of UTF-8 string, lowercase hex (64 chars). */
export async function sha256Hex(plaintext: string): Promise<string> {
  const enc = new TextEncoder().encode(plaintext);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
