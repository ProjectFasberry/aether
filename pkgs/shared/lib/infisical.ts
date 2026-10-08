import { InfisicalSDK } from "@infisical/sdk";

let client: InfisicalSDK | null = null;

export async function connect(): Promise<void> {
  client = new InfisicalSDK({ siteUrl: process.env["INFISICAL_API_URL"]! });

  await client.auth().universalAuth.login({
    clientId: process.env["INFISICAL_CLIENT_ID"]!,
    clientSecret: process.env["INFISICAL_CLIENT_SECRET"]!,
  });
}

export const getOrCreateClient = async (): Promise<InfisicalSDK> => {
  if (!client) {
    await connect();
    return client!;
  }
  return client;
};