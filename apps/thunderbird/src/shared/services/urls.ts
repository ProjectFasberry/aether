import { createUrlsService } from "@repo/core/lib/urls"
import { general as generalDb } from "../database/general-db"

export const urlsService = createUrlsService({
  generalDb
})
