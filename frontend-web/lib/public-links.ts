/** Main-site paths (same deployment as the marketing storefront). */
export const publicLoginPath = '/login';
export const publicRegisterPath = '/register';

const productionAdminSignIn = 'https://admin.lenscart.com/signin';
const productionAdminRegister = 'https://admin.lenscart.com/admin/register';

/** Base URL for shop-admin links when env vars are unset (development only). */
function devAdminOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return 'http://localhost:3000';
}

/** Shop admin PWA (subdomain or separate host). In `next dev`, defaults to this app on localhost. */
export const publicAdminSignInUrl =
  process.env.NEXT_PUBLIC_ADMIN_SIGNIN_URL?.trim() ||
  (process.env.NODE_ENV === 'development'
    ? `${devAdminOrigin()}/admin/login`
    : productionAdminSignIn);

export const publicAdminRegisterUrl =
  process.env.NEXT_PUBLIC_ADMIN_REGISTER_URL?.trim() ||
  (process.env.NODE_ENV === 'development'
    ? `${devAdminOrigin()}/admin/register`
    : productionAdminRegister);
