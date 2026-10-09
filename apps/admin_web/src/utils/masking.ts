/**
 * DPDP Act 2023 Masking Utility for Indian Phone Numbers & Identifiers
 * 9876543210 -> 98XXXX3210
 */
export function maskMobile(mobile: string): string {
  if (!mobile) return 'XXXXXXXXXX';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `${last10.slice(0, 2)}XXXX${last10.slice(-4)}`;
  }
  return mobile.slice(0, 2) + 'XXXX' + mobile.slice(-2);
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}
