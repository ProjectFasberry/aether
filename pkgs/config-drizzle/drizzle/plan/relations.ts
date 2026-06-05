import { relations } from "drizzle-orm/relations";
import { planServers, planAllowlistBounce, planExtensionProviders, planExtensionGroups, planExtensionIcons, planExtensionPlugins, planExtensionTabs, planExtensionTables, planExtensionServerTableValues, planExtensionServerValues, planExtensionUserTableValues, planExtensionUserValues, planUsers, planGeolocations, planSessions, planKills, planPing, planPluginVersions, planWebGroup, planSecurity, planTps, planUserInfo, planWebGroupToPermission, planWebPermission, planWebUserPreferences, planWorlds, planWorldTimes } from "./schema";

export const planAllowlistBounceRelations = relations(planAllowlistBounce, ({one}) => ({
	planServer: one(planServers, {
		fields: [planAllowlistBounce.serverId],
		references: [planServers.id]
	}),
}));

export const planServersRelations = relations(planServers, ({many}) => ({
	planAllowlistBounces: many(planAllowlistBounce),
	planPings: many(planPing),
	planPluginVersions: many(planPluginVersions),
	planSessions: many(planSessions),
	planTps: many(planTps),
	planUserInfos: many(planUserInfo),
	planWorldTimes: many(planWorldTimes),
}));

export const planExtensionGroupsRelations = relations(planExtensionGroups, ({one}) => ({
	planExtensionProvider: one(planExtensionProviders, {
		fields: [planExtensionGroups.providerId],
		references: [planExtensionProviders.id]
	}),
}));

export const planExtensionProvidersRelations = relations(planExtensionProviders, ({one, many}) => ({
	planExtensionGroups: many(planExtensionGroups),
	planExtensionPlugin: one(planExtensionPlugins, {
		fields: [planExtensionProviders.pluginId],
		references: [planExtensionPlugins.id]
	}),
	planExtensionIcon: one(planExtensionIcons, {
		fields: [planExtensionProviders.iconId],
		references: [planExtensionIcons.id]
	}),
	planExtensionTab: one(planExtensionTabs, {
		fields: [planExtensionProviders.tabId],
		references: [planExtensionTabs.id]
	}),
	planExtensionServerValues: many(planExtensionServerValues),
	planExtensionUserValues: many(planExtensionUserValues),
}));

export const planExtensionPluginsRelations = relations(planExtensionPlugins, ({one, many}) => ({
	planExtensionIcon: one(planExtensionIcons, {
		fields: [planExtensionPlugins.iconId],
		references: [planExtensionIcons.id]
	}),
	planExtensionProviders: many(planExtensionProviders),
	planExtensionTables: many(planExtensionTables),
	planExtensionTabs: many(planExtensionTabs),
}));

export const planExtensionIconsRelations = relations(planExtensionIcons, ({many}) => ({
	planExtensionPlugins: many(planExtensionPlugins),
	planExtensionProviders: many(planExtensionProviders),
	planExtensionTables_icon1Id: many(planExtensionTables, {
		relationName: "planExtensionTables_icon1Id_planExtensionIcons_id"
	}),
	planExtensionTables_icon2Id: many(planExtensionTables, {
		relationName: "planExtensionTables_icon2Id_planExtensionIcons_id"
	}),
	planExtensionTables_icon3Id: many(planExtensionTables, {
		relationName: "planExtensionTables_icon3Id_planExtensionIcons_id"
	}),
	planExtensionTables_icon4Id: many(planExtensionTables, {
		relationName: "planExtensionTables_icon4Id_planExtensionIcons_id"
	}),
	planExtensionTables_icon5Id: many(planExtensionTables, {
		relationName: "planExtensionTables_icon5Id_planExtensionIcons_id"
	}),
	planExtensionTabs: many(planExtensionTabs),
}));

export const planExtensionTabsRelations = relations(planExtensionTabs, ({one, many}) => ({
	planExtensionProviders: many(planExtensionProviders),
	planExtensionTables: many(planExtensionTables),
	planExtensionPlugin: one(planExtensionPlugins, {
		fields: [planExtensionTabs.pluginId],
		references: [planExtensionPlugins.id]
	}),
	planExtensionIcon: one(planExtensionIcons, {
		fields: [planExtensionTabs.iconId],
		references: [planExtensionIcons.id]
	}),
}));

export const planExtensionServerTableValuesRelations = relations(planExtensionServerTableValues, ({one}) => ({
	planExtensionTable: one(planExtensionTables, {
		fields: [planExtensionServerTableValues.tableId],
		references: [planExtensionTables.id]
	}),
}));

export const planExtensionTablesRelations = relations(planExtensionTables, ({one, many}) => ({
	planExtensionServerTableValues: many(planExtensionServerTableValues),
	planExtensionPlugin: one(planExtensionPlugins, {
		fields: [planExtensionTables.pluginId],
		references: [planExtensionPlugins.id]
	}),
	planExtensionIcon_icon1Id: one(planExtensionIcons, {
		fields: [planExtensionTables.icon1Id],
		references: [planExtensionIcons.id],
		relationName: "planExtensionTables_icon1Id_planExtensionIcons_id"
	}),
	planExtensionIcon_icon2Id: one(planExtensionIcons, {
		fields: [planExtensionTables.icon2Id],
		references: [planExtensionIcons.id],
		relationName: "planExtensionTables_icon2Id_planExtensionIcons_id"
	}),
	planExtensionIcon_icon3Id: one(planExtensionIcons, {
		fields: [planExtensionTables.icon3Id],
		references: [planExtensionIcons.id],
		relationName: "planExtensionTables_icon3Id_planExtensionIcons_id"
	}),
	planExtensionIcon_icon4Id: one(planExtensionIcons, {
		fields: [planExtensionTables.icon4Id],
		references: [planExtensionIcons.id],
		relationName: "planExtensionTables_icon4Id_planExtensionIcons_id"
	}),
	planExtensionIcon_icon5Id: one(planExtensionIcons, {
		fields: [planExtensionTables.icon5Id],
		references: [planExtensionIcons.id],
		relationName: "planExtensionTables_icon5Id_planExtensionIcons_id"
	}),
	planExtensionTab: one(planExtensionTabs, {
		fields: [planExtensionTables.tabId],
		references: [planExtensionTabs.id]
	}),
	planExtensionUserTableValues: many(planExtensionUserTableValues),
}));

export const planExtensionServerValuesRelations = relations(planExtensionServerValues, ({one}) => ({
	planExtensionProvider: one(planExtensionProviders, {
		fields: [planExtensionServerValues.providerId],
		references: [planExtensionProviders.id]
	}),
}));

export const planExtensionUserTableValuesRelations = relations(planExtensionUserTableValues, ({one}) => ({
	planExtensionTable: one(planExtensionTables, {
		fields: [planExtensionUserTableValues.tableId],
		references: [planExtensionTables.id]
	}),
}));

export const planExtensionUserValuesRelations = relations(planExtensionUserValues, ({one}) => ({
	planExtensionProvider: one(planExtensionProviders, {
		fields: [planExtensionUserValues.providerId],
		references: [planExtensionProviders.id]
	}),
}));

export const planGeolocationsRelations = relations(planGeolocations, ({one}) => ({
	planUser: one(planUsers, {
		fields: [planGeolocations.userId],
		references: [planUsers.id]
	}),
}));

export const planUsersRelations = relations(planUsers, ({many}) => ({
	planGeolocations: many(planGeolocations),
	planPings: many(planPing),
	planSessions: many(planSessions),
	planUserInfos: many(planUserInfo),
	planWorldTimes: many(planWorldTimes),
}));

export const planKillsRelations = relations(planKills, ({one}) => ({
	planSession: one(planSessions, {
		fields: [planKills.sessionId],
		references: [planSessions.id]
	}),
}));

export const planSessionsRelations = relations(planSessions, ({one, many}) => ({
	planKills: many(planKills),
	planUser: one(planUsers, {
		fields: [planSessions.userId],
		references: [planUsers.id]
	}),
	planServer: one(planServers, {
		fields: [planSessions.serverId],
		references: [planServers.id]
	}),
	planWorldTimes: many(planWorldTimes),
}));

export const planPingRelations = relations(planPing, ({one}) => ({
	planUser: one(planUsers, {
		fields: [planPing.userId],
		references: [planUsers.id]
	}),
	planServer: one(planServers, {
		fields: [planPing.serverId],
		references: [planServers.id]
	}),
}));

export const planPluginVersionsRelations = relations(planPluginVersions, ({one}) => ({
	planServer: one(planServers, {
		fields: [planPluginVersions.serverId],
		references: [planServers.id]
	}),
}));

export const planSecurityRelations = relations(planSecurity, ({one, many}) => ({
	planWebGroup: one(planWebGroup, {
		fields: [planSecurity.groupId],
		references: [planWebGroup.id]
	}),
	planWebUserPreferences: many(planWebUserPreferences),
}));

export const planWebGroupRelations = relations(planWebGroup, ({many}) => ({
	planSecurities: many(planSecurity),
	planWebGroupToPermissions: many(planWebGroupToPermission),
}));

export const planTpsRelations = relations(planTps, ({one}) => ({
	planServer: one(planServers, {
		fields: [planTps.serverId],
		references: [planServers.id]
	}),
}));

export const planUserInfoRelations = relations(planUserInfo, ({one}) => ({
	planUser: one(planUsers, {
		fields: [planUserInfo.userId],
		references: [planUsers.id]
	}),
	planServer: one(planServers, {
		fields: [planUserInfo.serverId],
		references: [planServers.id]
	}),
}));

export const planWebGroupToPermissionRelations = relations(planWebGroupToPermission, ({one}) => ({
	planWebGroup: one(planWebGroup, {
		fields: [planWebGroupToPermission.groupId],
		references: [planWebGroup.id]
	}),
	planWebPermission: one(planWebPermission, {
		fields: [planWebGroupToPermission.permissionId],
		references: [planWebPermission.id]
	}),
}));

export const planWebPermissionRelations = relations(planWebPermission, ({many}) => ({
	planWebGroupToPermissions: many(planWebGroupToPermission),
}));

export const planWebUserPreferencesRelations = relations(planWebUserPreferences, ({one}) => ({
	planSecurity: one(planSecurity, {
		fields: [planWebUserPreferences.webUserId],
		references: [planSecurity.id]
	}),
}));

export const planWorldTimesRelations = relations(planWorldTimes, ({one}) => ({
	planWorld: one(planWorlds, {
		fields: [planWorldTimes.worldId],
		references: [planWorlds.id]
	}),
	planSession: one(planSessions, {
		fields: [planWorldTimes.sessionId],
		references: [planSessions.id]
	}),
	planUser: one(planUsers, {
		fields: [planWorldTimes.userId],
		references: [planUsers.id]
	}),
	planServer: one(planServers, {
		fields: [planWorldTimes.serverId],
		references: [planServers.id]
	}),
}));

export const planWorldsRelations = relations(planWorlds, ({many}) => ({
	planWorldTimes: many(planWorldTimes),
}));