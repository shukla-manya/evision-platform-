import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type UserRole =
  | 'customer'
  | 'dealer'
  | 'admin'
  | 'superadmin'
  | 'electrician'
  | 'electrician_pending'
  | 'electrician_rejected';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
