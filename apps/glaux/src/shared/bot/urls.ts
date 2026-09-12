import { general as generalDb } from "../database/general-db";
import { createUrlsService } from "@repo/core/lib/urls";

export const urlsService = createUrlsService({
	generalDb,
});
