import Elysia from "elysia";
import { economyWallet } from "./economy-wallet.route";
import { economyLedger } from "./economy-ledger.route";
import { economyAdjust } from "./economy-adjust.route";
import { economyRefund } from "./economy-refund.route";
import { economyMigrate } from "./economy-migrate.route";

export const economy = new Elysia()
	.group("/economy", (app) => app
		.use(economyWallet)
		.use(economyLedger)
		.use(economyAdjust)
		.use(economyRefund)
		.use(economyMigrate)
	);
