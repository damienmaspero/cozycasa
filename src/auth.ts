import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { db } from "./db.ts";

export const auth = betterAuth({
  database: db,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        // Dev: just log invitations. Replace with real email provider in prod.
        console.log(
          `[invitation] org=${data.organization.name} to=${data.email} inviteId=${data.id}`,
        );
      },
    }),
  ],
});
