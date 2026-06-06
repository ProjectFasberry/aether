export function normalizeIp(ip: string | undefined | null): string | null {
  if (!ip) return null;

  let trimmedIp = ip.trim().toLowerCase();

  if (trimmedIp === '::1' || trimmedIp === '0:0:0:0:0:0:0:1') {
    return '127.0.0.1';
  }

  if (trimmedIp.startsWith('::ffff:')) {
    trimmedIp = trimmedIp.replace('::ffff:', '');
  }

  const result = trimmedIp.replace(/^\[|\]$/g, '');

  return result || null;
}