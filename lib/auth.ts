import { auth as nextAuth } from "@/auth";

export async function auth() {
  const session = await nextAuth();
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
} 