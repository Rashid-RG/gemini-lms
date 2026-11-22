import crypto from "node:crypto";

// PayHere specifies MD5 for its checkout/IPN protocol; use it only for gateway interoperability.
const digest = (value) => crypto.createHash("md5").update(value).digest("hex").toUpperCase();

export function normalizePayhereSecret(secret, encoding = "raw") {
  if (typeof secret !== "string" || !secret.trim()) return null;
  const trimmed = secret.trim();
  if (encoding === "raw" || encoding === "auto") return trimmed;
  if (encoding !== "base64" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(trimmed)) return null;
  const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
  return decoded || null;
}

export function makePayhereCheckoutHash(merchantId, orderId, amount, currency, secret) {
  if (![merchantId, orderId, amount, currency, secret].every(v => typeof v === "string" && v.length)) return null;
  return digest(merchantId + orderId + amount + currency + digest(secret));
}

export function verifyPayhereIpn({ merchantId, orderId, amount, currency, status, signature, secret }) {
  if (![merchantId, orderId, amount, currency, status, signature, secret].every(
    v => typeof v === "string" && v.length > 0
  )) return false;
  if (!/^[a-fA-F0-9]{32}$/.test(signature)) return false;
  const expected = digest(merchantId + orderId + amount + currency + status + digest(secret));
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}
