import { createHash } from 'crypto';

/** PayU _payment request hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt) */
export function buildPayuPaymentHash(parts: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  salt: string;
}): string {
  const s = `${parts.key}|${parts.txnid}|${parts.amount}|${parts.productinfo}|${parts.firstname}|${parts.email}|${parts.udf1}|${parts.udf2}|${parts.udf3}|${parts.udf4}|${parts.udf5}||||||${parts.salt}`;
  return createHash('sha512').update(s).digest('hex');
}

/** Reverse hash for browser return: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key) */
export function buildPayuReverseHash(parts: {
  salt: string;
  status: string;
  udf5: string;
  udf4: string;
  udf3: string;
  udf2: string;
  udf1: string;
  email: string;
  firstname: string;
  productinfo: string;
  amount: string;
  txnid: string;
  key: string;
}): string {
  const s = `${parts.salt}|${parts.status}||||||${parts.udf5}|${parts.udf4}|${parts.udf3}|${parts.udf2}|${parts.udf1}|${parts.email}|${parts.firstname}|${parts.productinfo}|${parts.amount}|${parts.txnid}|${parts.key}`;
  return createHash('sha512').update(s).digest('hex');
}

export function verifyPayuResponseHash(body: Record<string, string>, salt: string): boolean {
  const received = String(body.hash || '').toLowerCase();
  if (!received) return false;
  const calc = buildPayuReverseHash({
    salt,
    status: String(body.status ?? ''),
    udf5: String(body.udf5 ?? ''),
    udf4: String(body.udf4 ?? ''),
    udf3: String(body.udf3 ?? ''),
    udf2: String(body.udf2 ?? ''),
    udf1: String(body.udf1 ?? ''),
    email: String(body.email ?? ''),
    firstname: String(body.firstname ?? ''),
    productinfo: String(body.productinfo ?? ''),
    amount: String(body.amount ?? ''),
    txnid: String(body.txnid ?? ''),
    key: String(body.key ?? ''),
  }).toLowerCase();
  return calc === received;
}
