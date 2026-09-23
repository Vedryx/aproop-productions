import "server-only";
import {
  createHmac,
  randomUUID,
} from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { adminDatabase } from "./storage";
import { createPasswordVerifier } from "./password";
import { consumeLoginAttempt } from "./login-limits";

const verifyPassword = createPasswordVerifier();

export const COOKIE = "aproop_admin";
const TTL = 8 * 60 * 60;
const issuer = "aproop-admin";
function config() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_JWT_SECRET;
  if (
    !email ||
    !password ||
    password.length < 12 ||
    !secret ||
    secret.length < 32
  )
    throw new Error("Admin credentials are not configured securely.");
  return { email, password, key: new TextEncoder().encode(secret) };
}
function credentialVersion() {
  const { email, password, key } = config();
  return createHmac("sha256", key)
    .update(`${email}\0${password}`)
    .digest("hex");
}
export async function credentialsMatch(email: string, password: string) {
  const expected = config();
  const validPassword = await verifyPassword(password, expected.password);
  return validPassword && email.trim().toLowerCase() === expected.email;
}
export async function allowLogin(clientId = "unknown") {
  return consumeLoginAttempt(await adminDatabase(), clientId);
}
export async function createSession() {
  const { email, key } = config();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + TTL * 1000);
  const collection = (await adminDatabase()).collection("admin_sessions");
  await collection.insertOne({ tokenId: id, email, expiresAt });
  const token = await new SignJWT({
    role: "admin",
    version: credentialVersion(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer(issuer)
    .setAudience(issuer)
    .setJti(id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL,
  });
}
export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let payload;
  try {
    const { email, key } = config();
    ({ payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer,
      audience: issuer,
    }));
    if (
      payload.sub !== email ||
      payload.role !== "admin" ||
      payload.version !== credentialVersion() ||
      !payload.jti
    )
      return null;
  } catch {
    return null;
  }
  const session = await (
    await adminDatabase()
  )
    .collection("admin_sessions")
    .findOne({ tokenId: payload.jti, expiresAt: { $gt: new Date() } }, { projection: { _id: 0, tokenId: 1 }, timeoutMS: 3000 });
  return session ? { email: payload.sub!, tokenId: payload.jti! } : null;
}
export async function deleteSession() {
  const session = await getSession();
  if (session)
    await (
      await adminDatabase()
    )
      .collection("admin_sessions")
      .deleteOne({ tokenId: session.tokenId });
  (await cookies()).delete(COOKIE);
}
