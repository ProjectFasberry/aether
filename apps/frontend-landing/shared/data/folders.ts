import { VOLUME_ENDPOINT } from '../env/index';

export const GALLERY_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/gallery/${name}.webp`
export const LOCATION_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/locations/${name}.png`
export const GAMEPLAY_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/gameplay/${name}.webp`
export const COMMUNITY_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/community/${name}.webp`
export const MENUS_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/menus/${name}.png`
export const WALLETS_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/wallets/${name}.png`
export const OTHER_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/other/${name}.png`
export const ANIMALS_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/animals/${name}.png`
export const PETS_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/animals/${name}.png`
export const ARMOR_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/armor/${name}.png`
export const REGIONS_FOLDER_ITEM = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/regions/${name}.png`