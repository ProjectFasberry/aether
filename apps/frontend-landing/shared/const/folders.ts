import { VOLUME_ENDPOINT } from '../env/index';

export const getGalleryFolder = (name: string) => `${VOLUME_ENDPOINT}/static/gallery/${name}.webp`
export const getLocationFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/locations/${name}.png`
export const getGameplayFolder = (name: string) => `${VOLUME_ENDPOINT}/static/gameplay/${name}.webp`
export const getCommunityFolder = (name: string) => `${VOLUME_ENDPOINT}/static/community/${name}.webp`
export const getMenusFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/menus/${name}.png`
export const getWalletsFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/wallets/${name}.png`
export const getOtherFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/other/${name}.png`
export const getAnimalsFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/animals/${name}.png`
export const getPetsFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/animals/${name}.png`
export const getArmorFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/armor/${name}.png`
export const getRegionsFolder = (name: string) => `${VOLUME_ENDPOINT}/static/game-content/regions/${name}.png`
