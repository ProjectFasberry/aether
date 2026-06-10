import Elysia from "elysia";
import { newsCreateRoute } from "./news-create.route";
import { newsDeleteRoute } from "./news-delete.route";
import { newsUpdateRoute } from "./news-update.route";
import { newsList } from "./news-list.route";

export const news = new Elysia().group("/news", (app) =>
	app.use(newsList).use(newsCreateRoute).use(newsDeleteRoute).use(newsUpdateRoute),
);
