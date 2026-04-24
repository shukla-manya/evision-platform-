import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type UserRole = 'customer' | 'dealer' | 'admin' | 'superadmin' | 'electrician';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
