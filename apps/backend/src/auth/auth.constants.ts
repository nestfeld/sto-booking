export const AUTH_COOKIE_NAME = 'm1_session';
export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  return secret;
}

export function isSecureCookie() {
  return process.env.COOKIE_SECURE === 'true';
}
