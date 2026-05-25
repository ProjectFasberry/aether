import ky from "ky";
import { API_PREFIX } from "../env";

export const client = ky.extend({
  prefixUrl: API_PREFIX,
  credentials: "include"
})
