/** External shop admin (Next.js on subdomain). Use env for other environments. */
export const publicAdminSignInUrl =
  process.env.NEXT_PUBLIC_ADMIN_SIGNIN_URL?.trim() || 'https://admin.lenscart.com/signin';
