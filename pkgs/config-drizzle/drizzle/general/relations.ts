import { relations } from "drizzle-orm/relations";
import {
	players,
	referrals,
	banners,
	bannersViews,
	roles,
	rolePermissions,
	permissions,
	playersPermissions,
} from "./schema";

export const referralsRelations = relations(referrals, ({ one }) => ({
	player_referrer: one(players, {
		fields: [referrals.referrer],
		references: [players.nickname],
		relationName: "referrals_referrer_players_nickname",
	}),
	player_referral: one(players, {
		fields: [referrals.referral],
		references: [players.nickname],
		relationName: "referrals_referral_players_nickname",
	}),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
	referrals_referrer: many(referrals, {
		relationName: "referrals_referrer_players_nickname",
	}),
	referrals_referral: many(referrals, {
		relationName: "referrals_referral_players_nickname",
	}),
	bannersViews: many(bannersViews),
	role: one(roles, {
		fields: [players.roleId],
		references: [roles.id],
	}),
	playersPermissions: many(playersPermissions),
}));

export const bannersViewsRelations = relations(bannersViews, ({ one }) => ({
	banner: one(banners, {
		fields: [bannersViews.bannerId],
		references: [banners.id],
	}),
	player: one(players, {
		fields: [bannersViews.nickname],
		references: [players.nickname],
	}),
}));

export const bannersRelations = relations(banners, ({ many }) => ({
	bannersViews: many(bannersViews),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
	players: many(players),
	rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id],
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id],
	}),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
	rolePermissions: many(rolePermissions),
	playersPermissions: many(playersPermissions),
}));

export const playersPermissionsRelations = relations(playersPermissions, ({ one }) => ({
	permission: one(permissions, {
		fields: [playersPermissions.permissionId],
		references: [permissions.id],
	}),
	player: one(players, {
		fields: [playersPermissions.nickname],
		references: [players.nickname],
	}),
}));
