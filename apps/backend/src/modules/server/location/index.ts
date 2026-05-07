import Elysia, { t } from "elysia"
import { defineRequiredUser } from "#/lib/define"
import { getCustomLocation, getLocation, parseWorldName, type UserLocation } from "./location.model"
import { withData } from "#/shared/schemas"

export const playerLocation = new Elysia()
  .use(defineRequiredUser())  
  .get("/location/:nickname", async ({ params: { nickname } }) => {
    const rawLocation = await getLocation(nickname);
    if (!rawLocation) {
      return { data: null }
    }

    let location: UserLocation | null = null;
    const world: string = parseWorldName(rawLocation.world) ?? rawLocation.world

    location = {
      ...rawLocation,
      world,
      customLocation: getCustomLocation({
        world,
        coords: { x: rawLocation.x, z: rawLocation.z }
      })
    }

    return { data: location }
  }, {
    response: {
      200: withData(
        t.Nullable(
          t.Object({
            world: t.String(),
            x: t.Number(),
            y: t.Number(),
            z: t.Number(),
            pitch: t.Number(),
            yaw: t.Number(),
            customLocation: t.Nullable(t.String())
          })
        )
      )
    }
  })