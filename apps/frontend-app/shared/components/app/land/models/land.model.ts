import { reatomAsync, withDataAtom, withStatusesAtom } from "@reatom/framework";
import { atom } from "@reatom/framework";
import { withReset } from "@reatom/framework";
import { currentUserState } from "@/shared/models/current-user/index.model";
import { withHistory } from "@/shared/lib/reatom/helpers";
import { withSsr } from "@/shared/models/ssr";
import { logError } from "@/shared/lib/log";
import { client, withQueryParams } from "@/shared/lib/client-wrapper";

export type Land = ExtractApiData<"getServerLandsByUlid">["data"]
export const landAtom = atom<Land | null>(null, "land").pipe(withReset(), withSsr("land"));

export const landParamAtom = atom<string>((ctx) => {
	const state = ctx.spy(landAtom);
	if (!state) return "";
	return state.ulid;
}, "landParamAtom").pipe(withHistory());

export const landOwnerAtom = atom<string>((ctx) => {
	const state = ctx.spy(landAtom);
	if (!state) return "";
	return state.members[0].nickname;
}, "landOwner").pipe(withReset());

export const landIsMemberAtom = atom<boolean>((ctx) => {
	const state = ctx.spy(landAtom);
	const currentUser = ctx.get(currentUserState);
	if (!currentUser || !state) return false;

	return state.members.some((exist) => exist.nickname === currentUser.nickname);
}, "landIsMemberAtom").pipe(withReset());

export const landIsOwnerAtom = atom((ctx) => {
	const currentUser = ctx.get(currentUserState);
	if (!currentUser) return false;

	const state = ctx.spy(landAtom);
	if (!state) return false;

	const owner = state.members[0].nickname;

	return currentUser.nickname === owner;
}, "landIsOwnerAtom").pipe(withReset());

export const landBannerAtom = atom((ctx) => {
	const state = ctx.spy(landAtom);
	if (!state) return "";
	return state.details.banner ?? "";
}, "landBanner").pipe(withReset());

export const landGalleryAtom = atom<string[]>((ctx) => {
	const state = ctx.spy(landAtom);
	if (!state) return [];
	return state.details.gallery ?? [];
}, "landGalleryAtom").pipe(withReset());

type AnotherLands = {
	data: Pick<Land, "ulid" | "name" | "members">[];
	meta: PaginatedMeta;
};

export const anotherLandsByOwnerAction = reatomAsync(
	async (ctx, nickname: string) => {
		const exclude = ctx.get(landParamAtom);

		return await ctx.schedule(() =>
			client<AnotherLands>(`server/lands/list/${nickname}`, { signal: ctx.controller.signal, throwHttpErrors: false })
				.pipe(withQueryParams({ exclude }))
				.exec(),
		);
	},
	{
		name: "anotherLandsByOwnerAction",
		onReject: (_, e) => {
			logError(e, { type: "combined" });
		},
	},
).pipe(withStatusesAtom(), withDataAtom());
