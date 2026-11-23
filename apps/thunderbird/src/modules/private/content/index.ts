import Elysia from "elysia";
import { contentList } from "./content-list.route";
import { contentDraft } from "./content-draft.route";
import { contentPublish } from "./content-publish.route";

export const content = new Elysia()
  .group("/content", (app) => app
    .use(contentList)
    .use(contentDraft)
    .use(contentPublish)
  );
