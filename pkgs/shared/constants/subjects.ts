export const SUBJECTS = {
  PAYMENT: {
    BASE: "payment",
    STATUS: {
      BASE: "payment.status",
      SUCCESS: "payment.status.success",
    },
    FIAT: "payment.start.fiat",
  },
  PLAYER: {
    BASE: "general.player",
    COMPAT: "general.player.compat",
  },
  RESOURCEPACK: {
    /** Published pack changed: backends drop their cached URL/SHA-1. */
    UPDATED: "general.resourcepack.updated",
  },
  LUCKPERMS: {
    BASE: "luckperms",
    UPDATE: "luckperms:update",
  },
  SERVER: {
    BASE: "server",
    PLAYER: {
      BASE: "server.player",
      PLAYTIME: "server.player.playtime.report",
      REFERAL: {
        BASE: "server.player.referal",
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
      LOGIN_NEW_DEVICE: "events.authorization.login.new_device",
      REGISTER: "events.authorization.register",
      UNREGISTER: "events.authorization.unregister"
    },
    SKINS: {
      UPDATE: "events.skins.update",
      CHANGED: "events.skins.changed",
    },
    USERS: {
      CONTROL: {
        WILDCARD: "events.users.control.*"
      },
    }
  },
  GRIM: {
    BASE: "grim",
    FLAG: "general.grim.flag",
  },
  INTERNAL: {
    HEALTH: "internal.health",
  },
  ADMIN: {
    ACTIVITY: {
      LOG: "admin.activity.log"
    }
  },
  CONFIG: {
    BASE: 'config'
  }
} as const;
