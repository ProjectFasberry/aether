import { env } from "../env"

export const getStaticImage = (target: string) => `${env.VITE_VOLUME_URL}/static/${target}`
export const getObjectUrl = (bucket: string, key: string) => `${env.VITE_VOLUME_URL}/${bucket}/${key}`