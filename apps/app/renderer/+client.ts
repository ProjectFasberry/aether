import { isError } from "@/shared/lib/helpers"
import { logger } from "@/shared/lib/logger"

window.addEventListener('error', (e) => {
  if (isError(e)) {
    logger.withTag("Client").error(e.message)
  }
})
