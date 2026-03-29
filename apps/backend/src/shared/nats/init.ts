import { getNats, initNats, natsLogger } from "./client";
import { jetstream, jetstreamManager } from "@nats-io/jetstream";
import { startOrderConsumer } from "#/utils/server/call-command";
import { NATS_SUBCRIBERS } from "./subscribers";
import { NATS_CONSUMERS, NATS_JS_STREAMS } from "./cons";
import { appLogger } from "#/utils/config/logger";

export async function startNats() {
	appLogger.log(`Starting NATS...`);

	await initNats();

	try {
		for (const { fn, name, subject } of NATS_SUBCRIBERS) {
			fn(subject);
			natsLogger.success(`${name} subscribed to ${subject}`);
		}
	} catch (e) {
		natsLogger.log(e);
	}

	const nc = getNats();

	const js = jetstream(nc);
	const jsm = await jetstreamManager(nc);

	for (const { name, subjects } of NATS_JS_STREAMS) {
		try {
			await jsm.streams.add({ name, subjects });
			natsLogger.log(`Stream ${name} with ${subjects.map((d) => d).join(",")} added`);
		} catch (e) {
			natsLogger.log(`Stream ${name} with ${subjects.map((d) => d).join(",")} exists`);
		}
	}

	for (const { name, stream_name } of Object.entries(NATS_CONSUMERS).flatMap(([_, arr]) => arr)) {
		try {
			const ec = await js.consumers.get(stream_name, name);
			natsLogger.log(`Consumer ${name} exists `);
		} catch (e) {
			const c = await jsm.consumers.add(stream_name, { name });
			natsLogger.log(`Consumer ${name} added`);
		}
	}

	startOrderConsumer();
}
