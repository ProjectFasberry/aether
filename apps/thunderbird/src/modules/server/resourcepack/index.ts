import Elysia from "elysia";
import { resourcePackMeta } from "./resourcepack.route";

export const resourcePack = new Elysia()
	.group("/resourcepack", (app) => app.use(resourcePackMeta));
