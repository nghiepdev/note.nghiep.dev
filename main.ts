import "https://deno.land/std@0.185.0/dotenv/load.ts";
import Chance from "chance";

import { Application, Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";

const app = new Application();
const chance = new Chance();
const router = new Router();

async function getTemplateHtml() {
  return await Deno.readTextFile("./index.html");
}

let templateHtml = await getTemplateHtml();

router
  .get("/", ({ response }) => {
    const id = chance.word();
    response.redirect(`/${id}`);
  })

  .get("/ws", (ctx) => {
    const socket = ctx.upgrade();
    socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log(1, data);
    };
  })
  .get("/:id", async ({ response, params, request }) => {
    const { host: hostname, protocol } = request.url;
    const id = params.id;
    console.log({ protocol });

    if (true) {
      // TODO
      templateHtml = await getTemplateHtml();
    }
    response.body = templateHtml
      .replace("{{id}}", id)
      .replace("{{note_content}}", "content")
      .replace(
        "{{websocket}}",
        `${protocol === "https:" ? "wss" : "ws"}://${hostname}/ws`
      );
  });

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ port, secure }) => {
  console.log(
    `Listening on: ${secure ? "https://" : "http://"}${"localhost"}:${port}`
  );
});

await app.listen({ port: 8000 });
