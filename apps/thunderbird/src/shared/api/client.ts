import { createClient } from "@repo/core/lib/api/root"
import { logging } from "../constants"

export const client = createClient({
  verbose: logging.requests
})
