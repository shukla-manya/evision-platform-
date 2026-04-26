import { redirect } from 'next/navigation';

/** Shared OTP sign-in for customers, dealers, and technicians lives at `/login`. */
export default function ElectricianLoginRedirectPage() {
  redirect('/login');
}
