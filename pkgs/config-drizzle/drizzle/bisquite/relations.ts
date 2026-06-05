import { relations } from "drizzle-orm/relations";
import { betonquestProfile, betonquestBackpack, betonquestJournal, betonquestObjectives, betonquestPlayer, betonquestPlayerProfile, betonquestPoints, betonquestTags, landsServers, landsLands, landsWorlds, landsLandsClaims, landsPlayers, playerparticlesParticle, playerparticlesFixed } from "./schema";

export const betonquestBackpackRelations = relations(betonquestBackpack, ({one}) => ({
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestBackpack.profileId],
		references: [betonquestProfile.profileId]
	}),
}));

export const betonquestProfileRelations = relations(betonquestProfile, ({many}) => ({
	betonquestBackpacks: many(betonquestBackpack),
	betonquestJournals: many(betonquestJournal),
	betonquestObjectives: many(betonquestObjectives),
	betonquestPlayers: many(betonquestPlayer),
	betonquestPlayerProfiles: many(betonquestPlayerProfile),
	betonquestPoints: many(betonquestPoints),
	betonquestTags: many(betonquestTags),
}));

export const betonquestJournalRelations = relations(betonquestJournal, ({one}) => ({
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestJournal.profileId],
		references: [betonquestProfile.profileId]
	}),
}));

export const betonquestObjectivesRelations = relations(betonquestObjectives, ({one}) => ({
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestObjectives.profileId],
		references: [betonquestProfile.profileId]
	}),
}));

export const betonquestPlayerRelations = relations(betonquestPlayer, ({one, many}) => ({
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestPlayer.activeProfile],
		references: [betonquestProfile.profileId]
	}),
	betonquestPlayerProfiles: many(betonquestPlayerProfile),
}));

export const betonquestPlayerProfileRelations = relations(betonquestPlayerProfile, ({one}) => ({
	betonquestPlayer: one(betonquestPlayer, {
		fields: [betonquestPlayerProfile.playerId],
		references: [betonquestPlayer.playerId]
	}),
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestPlayerProfile.profileId],
		references: [betonquestProfile.profileId]
	}),
}));

export const betonquestPointsRelations = relations(betonquestPoints, ({one}) => ({
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestPoints.profileId],
		references: [betonquestProfile.profileId]
	}),
}));

export const betonquestTagsRelations = relations(betonquestTags, ({one}) => ({
	betonquestProfile: one(betonquestProfile, {
		fields: [betonquestTags.profileId],
		references: [betonquestProfile.profileId]
	}),
}));

export const landsLandsRelations = relations(landsLands, ({one, many}) => ({
	landsServer: one(landsServers, {
		fields: [landsLands.server],
		references: [landsServers.server]
	}),
	landsWorld: one(landsWorlds, {
		fields: [landsLands.world],
		references: [landsWorlds.ulid]
	}),
	landsLandsClaims: many(landsLandsClaims),
	landsPlayers: many(landsPlayers),
}));

export const landsServersRelations = relations(landsServers, ({many}) => ({
	landsLands: many(landsLands),
	landsWorlds: many(landsWorlds),
}));

export const landsWorldsRelations = relations(landsWorlds, ({one, many}) => ({
	landsLands: many(landsLands),
	landsLandsClaims: many(landsLandsClaims),
	landsServer: one(landsServers, {
		fields: [landsWorlds.server],
		references: [landsServers.server]
	}),
}));

export const landsLandsClaimsRelations = relations(landsLandsClaims, ({one}) => ({
	landsLand: one(landsLands, {
		fields: [landsLandsClaims.land],
		references: [landsLands.ulid]
	}),
	landsWorld: one(landsWorlds, {
		fields: [landsLandsClaims.world],
		references: [landsWorlds.ulid]
	}),
}));

export const landsPlayersRelations = relations(landsPlayers, ({one}) => ({
	landsLand: one(landsLands, {
		fields: [landsPlayers.editLand],
		references: [landsLands.ulid]
	}),
}));

export const playerparticlesFixedRelations = relations(playerparticlesFixed, ({one}) => ({
	playerparticlesParticle: one(playerparticlesParticle, {
		fields: [playerparticlesFixed.particleUuid],
		references: [playerparticlesParticle.uuid]
	}),
}));

export const playerparticlesParticleRelations = relations(playerparticlesParticle, ({many}) => ({
	playerparticlesFixeds: many(playerparticlesFixed),
}));