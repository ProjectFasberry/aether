import Elysia from "elysia";
import { releasesList } from "./releases-list.route";
import { releasesDownload } from "./releases-download.route";

export const releases = new Elysia()
  .use(releasesList)
  .use(releasesDownload);
