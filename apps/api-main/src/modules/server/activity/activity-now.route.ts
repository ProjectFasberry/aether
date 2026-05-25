import Elysia, { t } from "elysia";
import { getPlayerStatus } from "./activity.model";

export type PlayerActivityPayload =
  | {
    type: "online";
    nickname: string;
    server: string;
    issued_date: Date;
  }
  | {
    type: "offline";
    nickname: string;
    issued_date: Date | null;
  };

export const activityNow = new Elysia()
  .get("/now/:nickname", async ({ params: { nickname } }) => {
    const data: PlayerActivityPayload = await getPlayerStatus(nickname);
    return { data }
  }, {
    // response: {
    //   200: "activity-now"
    // }
  })
