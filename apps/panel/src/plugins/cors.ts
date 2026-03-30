import cors from "@elysiajs/cors";
import Elysia from "elysia";

export const corsPlugin = () => new Elysia().use(cors({ credentials: true }));
