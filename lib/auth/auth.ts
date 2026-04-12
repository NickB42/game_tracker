import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, createAccessControl } from "better-auth/plugins";

import { prisma } from "@/lib/db/prisma";
import { appEnv } from "@/lib/env";

const authBaseURL = appEnv.BETTER_AUTH_URL
	? {
			allowedHosts: appEnv.betterAuthAllowedHosts,
			fallback: appEnv.BETTER_AUTH_URL,
			protocol: appEnv.NODE_ENV === "development" ? ("http" as const) : ("https" as const),
		}
	: {
			allowedHosts: appEnv.betterAuthAllowedHosts,
			protocol: appEnv.NODE_ENV === "development" ? ("http" as const) : ("auto" as const),
		};

const adminAccess = createAccessControl({
	user: ["create", "list", "set-role", "set-password", "get", "update", "delete", "ban", "impersonate", "impersonate-admins"],
	session: ["list", "revoke", "delete"],
} as const);

export const auth = betterAuth({
	baseURL: authBaseURL,
	secret: appEnv.BETTER_AUTH_SECRET,
	trustedOrigins: appEnv.betterAuthTrustedOrigins,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true,
	},
	user: {
		additionalFields: {
			role: {
				type: ["ADMIN", "MEMBER"],
				defaultValue: "MEMBER",
				required: false,
				input: false,
			},
			playerId: {
				type: "string",
				required: false,
				input: false,
			},
			mustChangePassword: {
				type: "boolean",
				defaultValue: false,
				required: false,
				input: false,
			},
		},
	},
	plugins: [
		nextCookies(),
		admin({
			defaultRole: "MEMBER",
			adminRoles: ["ADMIN"],
			roles: {
				ADMIN: adminAccess.newRole({
					user: ["create", "list", "set-role", "set-password", "get", "update", "delete", "ban", "impersonate", "impersonate-admins"],
					session: ["list", "revoke", "delete"],
				}),
				MEMBER: adminAccess.newRole({
					user: [],
					session: [],
				}),
			},
		}),
	],
});
