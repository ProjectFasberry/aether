export const SUBJECTS = {
	PAYMENT: {
		BASE: "payment",
		STATUS: {
			BASE: "payment.status",
			SUCCESS: "payment.status.success",
		},
		FIAT: "payment.start.fiat",
	},
	LUCKPERMS: {
		BASE: "luckperms",
		UPDATE: "luckperms:update",
	},
	/**
	 * @deprecated Will be replaced by SUBJECTS.SERVER.PLAYER.REFERAL.*
	 */
	USERS: {
		BASE: "users",
		REWARD: "users.referal.reward",
		REWARD_CHECK: "users.referal.check",
	},
	SERVER: {
		BASE: "server",
		PLAYER: {
			BASE: "server.player",
			REFERAL: {
				BASE: "server.player.referal",
				REWARD: "server.player.referal.reward",
				CHECK: "server.player.referal.check",
			},
		},
		EVENTS: {
			EXECUTE_CMD: "executeCommand",
			USER: {
				GET_LOCATION: "getLocation",
				CHECK_ONLINE: "checkOnline",
				EVENT: "server.user.event",
				GIVE_BALANCE: "give.balance",
			},
			STATS: "getServerStats",
		},
	},
	EVENTS: {
		BASE: "events",
		AUTHORIZATION: {
			BASE: "events.authorization",
			LOGIN: "events.authorization.login",
			REGISTER: "events.authorization.register",
			UNREGISTER: "events.authorization.unregister"
		},
		SKINS: {
			UPDATE: "events.skins.update",
		},
		USERS: {
			CONTROL: {
				WILDCARD: "events.users.control.*"
			},
		}
	},
	INTERNAL: {
		HEALTH: "internal.health",
  },
  ADMIN: {
    ACTIVITY: {
      LOG: "admin.activity.log"
    }
	}
} as const;
