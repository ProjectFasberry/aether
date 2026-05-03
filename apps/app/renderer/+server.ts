import type { Server } from "vike/types";
import Elysia from "elysia";
import vike from "@vikejs/elysia";
import compress from '@universal-middleware/compress'
import { paraglideMiddleware } from "@/paraglide/server"

const app = new Elysia()

vike(app, [
	compress(),
	// @ts-expect-error
	(request) => {
		return paraglideMiddleware(request, ({ request: newRequest }) => newRequest);
	}]
);

export default {
	fetch: app.fetch,
	prod: {
		port: 3006,
		onReady(server) {
			console.log("Server ready", server.options);
			console.log(typeof Bun === "undefined" ? "nodejs runtime" : "bun runtime");
		}
	},
} satisfies Server;
