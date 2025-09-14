export interface JwtPayload {
  sub: string;          // User ID
  phoneNumber: string;
  email?: string | null;
  role: string;
  tier: string;
  sessionId: string;
  deviceId?: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}
