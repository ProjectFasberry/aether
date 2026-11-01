import Elysia, { t } from "elysia";
import { auth } from "#/modules/auth/auth.model";
import { defineOptionalBearerSession } from "#/lib/define";
import { buildRouteSummary } from "#/utils";
import { profileService, type AccountProfile } from "./profile.model";
import { signaturePublicKey, texturesService } from "./textures.model";
import { tokenService } from "./token.model";

/**
 * Yggdrasil (`authlib-injector`) compatible auth server.
 *
 * The launcher exchanges its bearer session for a game token and starts the
 * client with `-javaagent:authlib-injector.jar=https://api.fasberry.fun/yggdrasil`.
 * The client calls `join` and the proxy calls `hasJoined`; both talk to us, so
 * the game profile (UUID, nickname) is the one stored in `accounts`.
 *
 * Auth is launcher-only: `authenticate` requires a launcher session, so a
 * password typed into a vanilla launcher is not a second front door.
 */

const FORBIDDEN = "ForbiddenOperationException";

const invalidToken = { error: FORBIDDEN, errorMessage: "Invalid token." };
const launcherRequired = { error: FORBIDDEN, errorMessage: "Launcher session required." };

/** The client compares undashed ids; ours are dashed in the database. */
const sameUuid = (left: string, right: string) =>
	left.replace(/-/g, "").toLowerCase() === right.replace(/-/g, "").toLowerCase();

const launcherSession = new Elysia()
	.use(defineOptionalBearerSession())
	.derive(async ({ session }) => {
		const payload = session ? await auth.getSessionPayload(session) : null;

		return { launcher: payload?.client === "launcher" ? payload : null };
	})
	.as("scoped");

/** Profile with our signed textures, shared by every profile endpoint. */
async function profileWithTextures(account: AccountProfile) {
	const textures = await texturesService.property(account.nickname, account.uuid);

	return profileService.toProfile(account, textures ? [textures] : []);
}

const accessTokenBody = t.Object({
	accessToken: t.String({ maxLength: 128 }),
	clientToken: t.Optional(t.String({ maxLength: 128 })),
});

export const yggdrasil = new Elysia().group("/yggdrasil", (app) =>
	app
		.get("/", async () => ({
			meta: {
				serverName: "Fasberry",
				implementationName: "aether",
				implementationVersion: "1.0.0",
				signaturePublickey: signaturePublicKey(),
			},
			// authlib-injector replaces the client's texture-domain whitelist with
			// this list, so every host a skin URL can point at must be here:
			// ours (planned) plus Mojang's, because SkinsRestorer still serves
			// textures from textures.minecraft.net.
			skinDomains: [
				"api.fasberry.fun",
				"fasberry.fun",
				"play.fasberry.fun",
				"textures.minecraft.net",
			],
		}), {
			detail: {
				summary: buildRouteSummary("Yggdrasil API metadata"),
			},
		})
		.use(launcherSession)
		.post(
			"/authserver/authenticate",
			async ({ launcher, status }) => {
				if (!launcher) return status(403, launcherRequired);

				const account = await profileService.byNickname(launcher.nickname);
				if (!account) return status(403, launcherRequired);

				const { access } = await tokenService.issue(account);
				const profile = profileService.toProfile(account);

				return {
					accessToken: access,
					clientToken: access,
					availableProfiles: [profile],
					selectedProfile: profile,
					user: { id: String(account.id), properties: [] },
				};
			},
			{
				detail: {
					summary: buildRouteSummary("Exchange a launcher session for a game token"),
				},
			},
		)
		.post(
			"/authserver/refresh",
			async ({ body, status }) => {
				const previous = await tokenService.get(body.accessToken);
				if (!previous) return status(403, invalidToken);

				const account = await profileService.byId(previous.uuid);
				if (!account) return status(403, invalidToken);

				await tokenService.drop(body.accessToken);

				const { access } = await tokenService.issue(account);

				return {
					accessToken: access,
					clientToken: access,
					selectedProfile: profileService.toProfile(account),
				};
			},
			{
				body: accessTokenBody,
				detail: {
					summary: buildRouteSummary("Refresh a game token"),
				},
			},
		)
		.post(
			"/authserver/validate",
			async ({ body, status }) => {
				const record = await tokenService.validate(body.accessToken);

				return record ? status(204) : status(403, invalidToken);
			},
			{
				body: accessTokenBody,
				detail: {
					summary: buildRouteSummary("Validate a game token"),
				},
			},
		)
		.post(
			"/authserver/invalidate",
			async ({ body }) => {
				await tokenService.drop(body.accessToken);

				return new Response(null, { status: 204 });
			},
			{
				body: accessTokenBody,
				detail: {
					summary: buildRouteSummary("Invalidate a game token"),
				},
			},
		)
		.post(
			"/authserver/signout",
			() => new Response(null, { status: 204 }),
			{
				body: t.Object({
					username: t.String({ maxLength: 32 }),
					password: t.String({ maxLength: 128 }),
				}),
				detail: {
					summary: buildRouteSummary("Sign a player out (launcher owns sessions)"),
				},
			},
		)
		.post(
			"/sessionserver/session/minecraft/join",
			async ({ body, status }) => {
				const record = await tokenService.validate(body.accessToken);

				if (!record) return status(403, invalidToken);

				const profileId =
					typeof body.selectedProfile === "string"
						? body.selectedProfile
						: body.selectedProfile.id;

				if (!sameUuid(record.uuid, profileId)) {
					return status(403, invalidToken);
				}

				await tokenService.saveJoin(body.serverId, record);

				return new Response(null, { status: 204 });
			},
			{
				body: t.Object({
					accessToken: t.String({ maxLength: 128 }),
					// The Yggdrasil spec defines `selectedProfile` as a bare id string
					// (dashed or not); some clients send the profile object instead.
					selectedProfile: t.Union([
						t.String({ maxLength: 64 }),
						t.Object({
							id: t.String({ maxLength: 64 }),
							name: t.Optional(t.String({ maxLength: 32 })),
						}),
					]),
					serverId: t.String({ minLength: 1, maxLength: 64 }),
				}),
				detail: {
					summary: buildRouteSummary("Record a client join for hasJoined"),
				},
			},
		)
		.get(
			"/sessionserver/session/minecraft/hasJoined",
			async ({ query, status }) => {
				const join = await tokenService.consumeJoin(query.serverId);

				if (!join || join.nickname.toLowerCase() !== query.username.toLowerCase()) {
					return status(204);
				}

				const account = await profileService.byNickname(join.nickname);
				if (!account) return status(204);

				return profileWithTextures(account);
			},
			{
				query: t.Object({
					username: t.String({ maxLength: 32 }),
					serverId: t.String({ minLength: 1, maxLength: 64 }),
					ip: t.Optional(t.String({ maxLength: 64 })),
				}),
				detail: {
					summary: buildRouteSummary("Session check used by the proxy"),
				},
			},
		)
		.get(
			"/sessionserver/session/minecraft/profile/:id",
			async ({ params, status }) => {
				const account = await profileService.byId(params.id);

				return account ? profileWithTextures(account) : status(204);
			},
			{
				detail: {
					summary: buildRouteSummary("Profile by UUID"),
				},
			},
		)
		.post(
			"/api/profiles/minecraft",
			async ({ body }) => {
				const names = body.slice(0, 10);
				const profiles = await Promise.all(
					names.map(async (name) => {
						const account = await profileService.byNickname(name);

						return account ? profileWithTextures(account) : null;
					}),
				);

				return profiles.filter((profile) => profile !== null);
			},
			{
				body: t.Array(t.String({ maxLength: 32 }), { maxItems: 10 }),
				detail: {
					summary: buildRouteSummary("Bulk profile lookup"),
				},
			},
		),
);

