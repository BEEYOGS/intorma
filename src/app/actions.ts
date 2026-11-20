"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { isAdmin, login, logout } from "@/lib/auth";

export async function adminLogin(_prev: { error?: string } | null, formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  if (!(await login(password))) return { error: "Password salah. Coba lagi." };
  redirect("/admin");
}

export async function adminLogout() {
  await logout();
  redirect("/admin/login");
}
