import { EntityStatus, UserRole } from '@prisma/client';

export type AuthenticatedUser = {
  id: number;
  schoolId: number | null;
  username: string;
  realName: string;
  role: UserRole;
  status: EntityStatus;
};

export type JwtPayload = {
  sub: number;
  schoolId: number | null;
  role: UserRole;
  username: string;
};
