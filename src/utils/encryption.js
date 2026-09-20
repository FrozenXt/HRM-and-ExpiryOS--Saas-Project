const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

// Lazy — only checked when encrypt/decrypt is actually called, not at
// module load. This means the server boots fine even if this key isn't
// set yet; it only throws the moment something tries to touch an
// encrypted field (aadhaarNumber, bankAccountNumber).
function getKey() {
  const key = process.env.FIELD_ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set — add a 64-character hex string " +
        "(32 bytes) to your .env before using encrypted fields. Generate " +
        "one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  const buf = Buffer.from(key, "hex");

  if (buf.length !== 32) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex characters)",
    );
  }

  return buf;
}

function encrypt(plaintext) {
  if (plaintext == null || plaintext === "") return plaintext;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;

  const [ivHex, dataHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

// For API responses — never send the full number back, even to admin/hr.
function maskLastN(plaintext, visible = 4) {
  if (!plaintext) return plaintext;
  const str = String(plaintext);
  if (str.length <= visible) return str;
  return "*".repeat(str.length - visible) + str.slice(-visible);
}

module.exports = { encrypt, decrypt, maskLastN };
