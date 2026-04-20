import * as z from "zod/v4";
import type { DONATE_GROUPS } from "../../constants/donate-aliases";

export const donateSchema = z.enum(["arkhont", "authentic", "loyal", "default", "dev", "helper", "moder"]);

export type Donate = keyof typeof DONATE_GROUPS;
