"use server";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/schemas/auth.schema";
import { AuthError } from "next-auth";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Credenciales inválidas" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
