/**
 * Shared JWT configuration to ensure consistency across services
 */
let cachedSecret: string | null = null;

export const getJWTSecret = (): string => {
  if (cachedSecret) {
    return cachedSecret;
  }
  
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key') {
    console.warn('⚠️ JWT_SECRET is not set or using default value - this is insecure!');
    console.warn('   Please set JWT_SECRET in your .env file');
    cachedSecret = 'your-secret-key';
    return cachedSecret;
  }
  
  // Cache the secret to ensure consistency
  cachedSecret = secret;
  
  // Log first few characters for debugging (not the full secret)
  console.log('✅ JWT_SECRET loaded:', secret.substring(0, 4) + '...' + secret.substring(secret.length - 4));
  
  return cachedSecret;
};

export const getJWTExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '7d';
};
