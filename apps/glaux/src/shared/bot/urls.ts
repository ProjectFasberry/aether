import { general as generalDb } from "../database";
import { createUrlsService } from "@repo/core/lib/urls";

export const urlsService = createUrlsService({
	generalDb,
});
