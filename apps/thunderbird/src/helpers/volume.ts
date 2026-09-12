import { getEnv } from "#/shared/env";
import { BUCKETS } from "#/shared/minio/client";

export const getSkinName = (key: string) => `skin-${key}.png`;
export const getAvatarName = (nickname: string, identifier: string) => `${nickname}-${identifier}.png`;

export const getObjectUrl = (bucket: string, key: string) => `${getEnv().VOLUME_URL}/${bucket}/${key}`;
export const getStaticUrl = (path: string) => `${getEnv().VOLUME_URL}/${BUCKETS.STATIC}/${path}`;
export const getUrl = (path: string) => `${getEnv().VOLUME_URL}/${path}`;
