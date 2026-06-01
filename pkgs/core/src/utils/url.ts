import { BUCKETS } from "@repo/shared/constants/buckets"

export const getStaticUrl = (name: string, volumeUrl: string) =>
  `${volumeUrl}/${BUCKETS.STATIC}/${name}`
export const getObjectUrl = (bucket: string, key: string, volumeUrl: string) =>
  `${volumeUrl}/${bucket}/${key}`
