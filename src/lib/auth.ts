import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/schemas/auth.schema";
import { userModel } from "@/server/models/user.model";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await userModel.findByEmail(email);
        if (!user) return null;
        if (!user.isActive) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.name} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
});
