const fs = require("node:fs");
const path = require("node:path");
const webpush = require("web-push");

const envPath = path.resolve(__dirname, "..", ".env");

if (!fs.existsSync(envPath)) {
  throw new Error("Create .env from .env.example before configuring push notifications.");
}

const current = fs.readFileSync(envPath, "utf8");
const required = ["VAPID_SUBJECT", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
const hasKeys = required.every((name) => new RegExp(`^${name}=.+$`, "m").test(current));

if (hasKeys) {
  console.log("VAPID credentials already exist in .env; no keys were changed.");
  process.exit(0);
}

const keys = webpush.generateVAPIDKeys();
const values = {
  VAPID_SUBJECT: "mailto:operator@example.com",
  VAPID_PUBLIC_KEY: keys.publicKey,
  VAPID_PRIVATE_KEY: keys.privateKey,
};

let next = current;
for (const [name, value] of Object.entries(values)) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  next = pattern.test(next) ? next.replace(pattern, line) : `${next.trimEnd()}\n${line}\n`;
}

fs.writeFileSync(envPath, next, { encoding: "utf8", mode: 0o600 });
console.log("Created local VAPID credentials in ignored .env without printing the private key.");
