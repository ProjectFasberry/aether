import { getServiceState } from "#/shared/constants";
import { permissionsService } from "#/shared/constants/permissions";
import { urlsService } from "#/shared/services/urls";
import { CRON_JOBS } from "#/shared/cron/jobs";
import { logErrorMsg } from "#/utils/config/log-utils";
import type { NatsConnection } from "@nats-io/nats-core";
import { isError } from "@repo/shared/lib/helpers";
import * as z from "zod";

const targetsSchema = z.enum(["permissions", "urls", "jobs", "global-state"]);

const targetEvents: Record<z.infer<typeof targetsSchema>, () => Record<string, unknown>> = {
	urls: () => Object.fromEntries(urlsService.getData()),
	permissions: () => permissionsService.getList(),
	jobs: () => Object.fromEntries(CRON_JOBS.map(({ callback, ...job }) => [job.name, job])),
	"global-state": () => getServiceState(),
};

export const subscribeConfig = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (e, msg) => {
			if (e) {
				return logErrorMsg(e, { subject });
			}

			const target = msg.subject.split(".")[2];
			const parsed = targetsSchema.safeParse(target);

			if (!parsed.success) {
				msg.respond(JSON.stringify({ error: `Invalid target: ${target}` }));
				return logErrorMsg(parsed.error.issues[0].message, { subject });
			}

			try {
				const data = targetEvents[parsed.data]();
				msg.respond(JSON.stringify({ data }));
			} catch (e) {
				logErrorMsg(isError(e) ? e : new Error(String(e)), { subject });
				msg.respond(JSON.stringify({ error: "Internal server error" }));
			}
		},
	});

	return subscription;
};
