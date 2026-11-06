export const CHARISM_SERVERS = ["bisquite", "muffin"] as const;
export type CharismServer = typeof CHARISM_SERVERS[number];

export type CharismProvider = {
	server: CharismServer;
	title: string;
	/** A readable balance exists for this server. */
	available(): boolean;
	/** Spending from this server is wired through the wallet. */
	purchasable(): boolean;
	getBalance(nickname: string): Promise<number | null>;
};

export type CharismServerInfo = {
	server: CharismServer;
	title: string;
	available: boolean;
	purchasable: boolean;
};

export function isCharismServer(value: string): value is CharismServer {
	return (CHARISM_SERVERS as readonly string[]).includes(value);
}

/**
 * One place that knows which servers exist and whether their charisma can be
 * read or spent. The game code (balance, cart, checkout) only talks to this
 * registry, so wiring Muffin later is a provider change, not a caller change.
 */
export function createCharismRegistry(providers: CharismProvider[]) {
	const map = new Map<CharismServer, CharismProvider>(providers.map((provider) => [provider.server, provider]));

	return {
		list(): CharismServerInfo[] {
			return providers.map((provider) => ({
				server: provider.server,
				title: provider.title,
				available: provider.available(),
				purchasable: provider.purchasable(),
			}));
		},

		get(server: string): CharismProvider | null {
			if (!isCharismServer(server)) return null;

			return map.get(server) ?? null;
		},

		async balance(server: string, nickname: string): Promise<number | null> {
			const provider = this.get(server);
			if (!provider || !provider.available()) return null;

			return await provider.getBalance(nickname);
		},
	};
}
