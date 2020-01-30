import polka from "polka";
import { json } from "body-parser";
import * as sapper from "@sapper/server";

const { PORT, NODE_ENV } = process.env;

function logger(req, res, next) {
  console.log(`[node] ${req.method} ${req.path} ${res.statusCode}`);
  next();
}

polka()
  .get("*", logger, sapper.middleware())
  .post(
    "*",
    json(),
    logger,
    sapper.middleware({
      session: (req, res) => req.body
    })
  )
  .listen(PORT, err => {
    if (err) console.error("error", err);
    console.log(
      `[node] Svelte SSR renderer listening in ${NODE_ENV} mode on port ${PORT}`
    );
  });
