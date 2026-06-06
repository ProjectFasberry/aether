
// test min playtime = 5 minutes
// const TEST_MIN_PLAYTIME = 5 * 60 * 1000

import { bisquite } from "#/shared/database/bisquite-db";
import { general } from "#/shared/database/general-db";

// min playtime for reward //

// 3 hours
const MIN_PLAYTIME_FOR_RECIPIENT = 3 * 60 * 60 * 1000
// 6 hours
const MIN_PLAYTIME_FOR_INITIATOR = 6 * 60 * 60 * 1000

export async function validateReferal(nickname: string) {
  const queryRefferals = await general
    .selectFrom("referrals")
    .selectAll()
    .where(eb =>
      eb.or([
        eb("referral", "=", nickname),
        eb("referrer", "=", nickname)
      ])
    )
    .where("completed", "=", false)
    .executeTakeFirst()

  if (!queryRefferals) return null;

  const queryPlaytime = await bisquite
    .selectFrom("cmi_users")
    .select(["TotalPlayTime", "username"])
    .where(eb =>
      eb.or([
        eb("username", "=", queryRefferals.referrer),
        eb("username", "=", queryRefferals.referral)
      ])
    )
    .execute()

  if (!queryPlaytime || queryPlaytime.length < 2) {
    return null;
  }

  const initiatorPlaytime = queryPlaytime.find(
    p => p.username === queryRefferals.referrer
  )

  const recipientPlaytime = queryPlaytime.find(
    p => p.username === queryRefferals.referral
  )

  if (!initiatorPlaytime?.TotalPlayTime || !recipientPlaytime?.TotalPlayTime) {
    return null;
  }

  let isPlaytimeValid: boolean = false;

  if (initiatorPlaytime.TotalPlayTime > MIN_PLAYTIME_FOR_INITIATOR) {
    if (recipientPlaytime.TotalPlayTime > MIN_PLAYTIME_FOR_RECIPIENT) {
      isPlaytimeValid = true;
    }
  }

  console.log(`playtime for ${queryRefferals.referrer} and ${queryRefferals.referral} is ${isPlaytimeValid}`)

  if (!isPlaytimeValid) return null;

  return { initiator: queryRefferals.referrer, recipient: queryRefferals.referral }
}