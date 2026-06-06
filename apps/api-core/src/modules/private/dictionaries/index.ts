import Elysia from "elysia";
import { dictionariesList } from "./dictionaries-list.route";
import { dictionariesEdit } from "./dictionaries-edit.route";
import { dictionariesDelete } from "./dictionaries-delete.route";
import { dictionariesCreate } from "./dictionaries-create.route";

export const dictionaries = new Elysia()
  .group("/dictionaries", app => app
    .use(dictionariesList)
    .use(dictionariesCreate)
    .use(dictionariesEdit)
    .use(dictionariesDelete)
  )