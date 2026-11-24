import type { Generated } from "kysely";

/**
 * Side tables added by the hand-applied skins migrations (`0001`, `0003`).
 * `pkgs/shared/.out` is regenerated from a live database, so until the next
 * regeneration these declarations keep the Kysely builder typed. Remove this
 * file after the tables appear in `@gen/db/skins`.
 */
declare module "@gen/db/skins" {
  interface SkinOwners {
    created_at: number;
    is_public: Generated<number>;
    owner_uuid: string;
    skin_name: string;
  }

  interface SkinAudit {
    action: string;
    actor_uuid: string;
    created_at: number;
    id: Generated<string>;
    skin_name: string;
    target_uuid: string | null;
  }

  interface SkinHeadJobs {
    attempts: Generated<number>;
    created_at: number;
    hash: string;
    last_error: string | null;
    skin_url: string;
    status: Generated<string>;
    updated_at: number;
  }

  interface DB {
    skin_audit: SkinAudit;
    skin_head_jobs: SkinHeadJobs;
    skin_owners: SkinOwners;
  }
}
