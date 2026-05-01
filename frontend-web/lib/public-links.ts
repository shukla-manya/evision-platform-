/** Main-site paths for E vision (same deployment as the marketing storefront). */
export const publicLoginPath = '/login';
export const publicRegisterPath = '/register';

/**
 * Superadmin sign-in (footer, FAQ). Defaults are same-origin paths so local and
 * deployed builds work without extra config. Set a full URL only if admin lives on another host.
 */
export const publicAdminSignInUrl =
  process.env.NEXT_PUBLIC_ADMIN_SIGNIN_URL?.trim() || '/super/signin';
