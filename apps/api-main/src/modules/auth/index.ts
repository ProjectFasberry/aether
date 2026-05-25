import Elysia from "elysia";
import { login } from "./login.route";
import { invalidate } from "./invalidate.route";
import { registerRoute } from "./register.route";
import { validate } from "./validate.route";
import { restore } from "./restore.route";
import { session } from "./session.route";

export const auth = new Elysia()
	.group("/auth", (app) => app
		.use(login)
		.use(invalidate)
		.use(registerRoute)
		.use(validate)
		.use(restore)
		.use(session)
	);