/** Main-site paths (same deployment as the marketing storefront). */
export const publicLoginPath = '/login';
export const publicRegisterPath = '/register';

/** Shop admin PWA (subdomain or separate host). */
export const publicAdminSignInUrl =
  process.env.NEXT_PUBLIC_ADMIN_SIGNIN_URL?.trim() || 'https://admin.lenscart.com/signin';

export const publicAdminRegisterUrl =
  process.env.NEXT_PUBLIC_ADMIN_REGISTER_URL?.trim() || 'https://admin.lenscart.com/admin/register';
