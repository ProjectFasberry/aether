// import { Hono } from 'hono'
// import vike from '@vikejs/hono'
import type { Server } from "vike/types";
import vike from "vike/fetch";

console.log(typeof Bun === "undefined" ? "node runtime" : "bun runtime");

export default {
	fetch(req) {
		console.log(req);
		return vike.fetch(req);
	},
	prod: {
		port: 3006,
		bun: {
			port: 3006,
		},
	},
} satisfies Server;
