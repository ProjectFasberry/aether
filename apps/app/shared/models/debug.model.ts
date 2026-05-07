import { atom, withAssign, action } from "@reatom/framework";
import { withLocalStorage } from "@reatom/persist-web-storage";

export const debugState = atom(null, "debugState").pipe(
	withAssign((_, name) => ({
		enabled: atom(false, `${name}.enabled`).pipe(withLocalStorage({ key: "debugIsEnabled" })),
	}))
);

export const debug = atom(null, "debug").pipe(
	withAssign(() => ({
		init: action((ctx) => {
			const isDebug = ctx.get(debugState.enabled);
			if (isDebug) {
				debug.activate(ctx);
			}
		}),
		activate: action((ctx) => {
			debugState.enabled(ctx, true);

			if (document.getElementById("react-scan")) return;

			const script = document.createElement('script');
			script.id = "react-scan";
			script.src = '//unpkg.com/react-scan/dist/auto.global.js';
			script.async = true;
			script.crossOrigin = "anonymous";

			document.head.appendChild(script);
		}),
		deactivate: action((ctx) => {
			debugState.enabled(ctx, false);

			window.location.reload();
		}),
		toggle: action((ctx) => {
			const isDebug = ctx.get(debugState.enabled);
			isDebug ? debug.deactivate(ctx) : debug.activate(ctx);
		})
	}))
);
