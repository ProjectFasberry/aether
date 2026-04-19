declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GENERAL_POSTGRES_URI: string
      LUCKPERMS_POSTGRES_URI: string
      LOBBY_MYSQL_URI: string;
      PLAYERPOINTS_MYSQL_URI: string;
      REPUTATION_MYSQL_URI: string;
      SKINS_MYSQL_URI: string;
      BISQUITE_MYSQL_URI: string
      PLAN_MYSQL_URI: string;
      LIBERTYBANS_POSTGRES_URI: string;
      SQLITE_DATABASE_URL: string;
    
      NATS_HOST: string;
      NATS_USER: string;
      NATS_PASSWORD: string;
      
      MINIO_HOST: string;
      MINIO_PORT: number;
      MINIO_ACCESS_KEY: string;
      MINIO_SECRET_KEY: string;

      REDIS_HOST: string;
      REDIS_PORT: number;
      REDIS_USER: string;
      REDIS_PASSWORD: string;

      VOLUME_URL: string;
      FRONTEND_URL: string;

      HELEKET_MERCHANT_KEY: string;
      HELEKET_PAYMENT_KEY: string;
      HELEKET_PAYOUT_KEY: string;

      CRYPTO_PAY_MAINNET_URL: string;
      CRYPTO_PAY_TESTNET_URL: string;
      CRYPTO_PAY_MAINNET_TOKEN: string;
      CRYPTO_PAY_TESTNET_TOKEN: string;

      CAP_SITE_KEY: string;
      CAP_URL: string;
      CAP_SECRET: string;

      PANEL_USER: string;
      PANEL_PASSWORD: string;
      PANEL_URL: string;

      RCON_PASSWORD: string;

      BOT_GUARD_TOKEN: string;

      PORT: string;

      MINESKIN_API_KEY: string;
      MINESKIN_AES_SECRET_KEY: string

      MAP_URL: string;

      BASE_URL: string;
    }
  }
}

export { }