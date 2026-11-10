import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { nanoid } from "nanoid";
import type { LuckpermsLogContent } from "../subscribers/sub-player-group";

type PublishUpdateGroup = {
	nickname: string;
	permission: string;
};

export function publishUpdateGroup({ nickname, permission }: PublishUpdateGroup) {
	const nc = natsService.getInstance();
	const id = nanoid(6);

	const payload: {
		content: LuckpermsLogContent;
		id: string;
		type: "log";
	} = {
		id,
		type: "log",
		content: {
			timestamp: Date.now(),
			source: {
				uniqueId: "00000000-0000-0000-0000-000000000000",
				name: "CONSOLE",
			},
			target: {
				type: "USER",
				uniqueId: "00000000-0000-0000-0000-000000000000",
				name: nickname,
			},
			description: `permission set ${permission} true`,
		},
	};

	return nc.publish(SUBJECTS.LUCKPERMS.UPDATE, JSON.stringify(payload));
}
