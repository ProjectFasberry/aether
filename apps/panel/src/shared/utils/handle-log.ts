import { SERVICE_NAME } from "../const/internal";
import { nats } from "../nats/client";
import { SUBJECTS } from "../nats/subjects";

export async function handleFatalError(error: Error | unknown) {
	if (!Bun.env.PROD) return;

	let msg: string = "";

	if (error instanceof Error) {
		msg = error.message;
	} else {
		msg = `UNHANDLED REJECTION: ${error}`;
	}

	const nc = nats.get();

	nc.publish(
		SUBJECTS.INTERNAL.HEALTH,
		JSON.stringify({
			data: msg,
			type: "error",
			service: SERVICE_NAME,
		}),
	);

	process.exit(1);
}
