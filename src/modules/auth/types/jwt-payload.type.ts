export interface JwtPayload {
  sub: number;
  email: string;
  jti: string;
  exp?: number;
}
