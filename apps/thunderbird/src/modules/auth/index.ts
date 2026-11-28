import Elysia from "elysia";
import { login } from "./login.route";
import { clientAuth } from "./client.route";
import { invalidate } from "./invalidate.route";
import { registerRoute } from "./register.route";
import { validate } from "./validate.route";
import { session } from "./session.route";
import { authLinks } from "./links.route";
import { twoFactor } from "./two-factor.route";

export const auth = new Elysia()
  .group("/auth", app => app
    .use(login)
    .use(clientAuth)
    .use(invalidate)
    .use(registerRoute)
    .use(authLinks)
    .use(validate)
    .use(twoFactor)
    .use(session),
  );
