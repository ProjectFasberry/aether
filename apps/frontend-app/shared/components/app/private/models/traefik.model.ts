import { panelClient, withJsonBody } from "@/shared/lib/client-wrapper";
import { reatomAsync, withDataAtom, withErrorAtom, withStatusesAtom } from "@reatom/framework";
import { atom } from "@reatom/framework";
import { toast } from "sonner";

export const configAtom = atom("", "codeAtom");
export const lastSavedConfigAtom = atom("", "lastSavedCodeAtom");

type ConfigPayload = { yaml: string };

export const traefikConfig = reatomAsync(async (ctx) => {
	const data = await panelClient<ConfigPayload>("traefik").exec();

	configAtom(ctx, data.yaml);
	lastSavedConfigAtom(ctx, data.yaml);

	return data.yaml;
}, "traefikConfig").pipe(withStatusesAtom(), withDataAtom(), withErrorAtom());

export const saveConfig = reatomAsync(
	async (ctx) => {
		const currentCode = ctx.get(configAtom);

		lastSavedConfigAtom(ctx, currentCode);
		saveConfig.errorAtom.reset(ctx);

		await panelClient
			.post("traefik")
			.pipe(withJsonBody({ yaml: currentCode }))
			.exec();
	},
	{
		name: "saveConfig",
		onFulfill: (ctx, res) => {
			toast.success("Сохранено");

			const backup = ctx.get(lastSavedConfigAtom);

			configAtom(ctx, backup);
			lastSavedConfigAtom(ctx, backup);
		},
		onReject: (_, e) => {
			toast.error("Ошибка при сохранении", { description: JSON.stringify(e) });
		},
	},
).pipe(withStatusesAtom(), withErrorAtom());
