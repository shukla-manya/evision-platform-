/** Main-site paths (same deployment as the marketing storefront). */
export const publicLoginPath = '/login';
export const publicRegisterPath = '/register';

/**
 * Shop admin entry points (footer, FAQ). Defaults are same-origin paths so local and
 * deployed builds work without extra config. Set full URLs only if admin lives on another host.
 */
export const publicAdminSignInUrl =
  process.env.NEXT_PUBLIC_ADMIN_SIGNIN_URL?.trim() || '/admin/login';

export const publicAdminRegisterUrl =
  process.env.NEXT_PUBLIC_ADMIN_REGISTER_URL?.trim() || '/admin/register';
