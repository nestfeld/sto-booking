import type { Request } from 'express';
import type { UserRole } from '@prisma/client';

export type AuthUser = {
  id: number;
  login: string;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: Date;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};

export type OptionallyAuthenticatedRequest = Request & {
  user?: AuthUser;
};

export type AuthTokenPayload = {
  sub: number;
  login: string;
};
