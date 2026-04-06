import Elysia from "elysia";
import { appOptionsList } from "./app-options.route";
import { appDictionaries } from "./app-dictionaries.route";
import { appLibrary } from "./app-library.route";

export const appGroup = new Elysia().group("/app", (app) =>
	app.use(appOptionsList).use(appDictionaries).use(appLibrary),
);
