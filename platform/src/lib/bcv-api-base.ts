function isPrivateHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
  );
}

/** Evita fetch a localhost desde HTTPS (Chrome pide permiso de red local). */
export function getBcvApiBase(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_BCV_API_URL ||
    process.env.BCV_API_URL ||
    '';

  const base = envUrl.replace(/\/$/, '');
  if (!base) return '';

  try {
    const parsed = new URL(base);
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      isPrivateHost(parsed.hostname)
    ) {
      return '';
    }
    if (
      typeof window === 'undefined' &&
      process.env.NODE_ENV === 'production' &&
      isPrivateHost(parsed.hostname)
    ) {
      return '';
    }
    return base;
  } catch {
    return '';
  }
}
