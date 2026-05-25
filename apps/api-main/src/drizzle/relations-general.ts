import { relations } from "drizzle-orm/relations";
import { banners, bannersViews, players, roles, rolePermissions, permissions } from "./schema-general";

export const bannersViewsRelations = relations(bannersViews, ({one}) => ({
	banner: one(banners, {
		fields: [bannersViews.bannerId],
		references: [banners.id]
	}),
	player: one(players, {
		fields: [bannersViews.nickname],
		references: [players.nickname]
	}),
}));

export const bannersRelations = relations(banners, ({many}) => ({
	bannersViews: many(bannersViews),
}));

export const playersRelations = relations(players, ({one, many}) => ({
	bannersViews: many(bannersViews),
	role: one(roles, {
		fields: [players.roleId],
		references: [roles.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	players: many(players),
	rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));