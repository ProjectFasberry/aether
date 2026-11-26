import Elysia from "elysia";
import { resourcePackList } from "./resourcepack-list.route";
import { resourcePackUpload } from "./resourcepack-upload.route";
import { resourcePackPublish } from "./resourcepack-publish.route";
import { resourcePackAdopt } from "./resourcepack-adopt.route";

export const resourcePack = new Elysia()
	.group("/resourcepack", (app) => app
		.use(resourcePackList)
		.use(resourcePackUpload)
		.use(resourcePackPublish)
		.use(resourcePackAdopt)
	);
