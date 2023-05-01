import "https://deno.land/std@0.185.0/dotenv/load.ts";
import { Application, Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import Chance from "chance";
import { Deta } from "deta";

const deta = Deta(Deno.env.get("DETA_PROJECT_KEY"));
const db = deta.Base(Deno.env.get("DETA_PROJECT_BASE") ?? "note");

const __IS_DEV = Deno.args.includes("--development");

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
    socket.onmessage = async (message) => {
      try {
        const {
          id,
          content,
        }: {
          content: string;
          id: string;
        } = JSON.parse(message.data);
        await db.put(content, id);
      } catch (error) {
        console.error(error);
      }
    };
  })
  .get("/:id", async ({ response, params, request }) => {
    const { host: hostname, protocol } = request.url;
    const id = params.id;

    if (__IS_DEV) {
      templateHtml = await getTemplateHtml();
    }

    const item = await db.get(id);
    const content = (item as { value: string } | null)?.value ?? "";

    response.body = templateHtml
      .replace("{{id}}", id)
      .replace("{{note_content}}", content)
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
