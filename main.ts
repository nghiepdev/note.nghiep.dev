import "https://deno.land/std@0.185.0/dotenv/load.ts";
import { Application, Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import Chance from "chance";
import { Deta } from "deta";
import throttle from "throttle";

interface Note {
  key: string;
  value: string;
}

const deta = Deta(Deno.env.get("DETA_PROJECT_KEY"));
const db = deta.Base(Deno.env.get("DETA_PROJECT_BASE") ?? "note");

const __IS_DEV = Deno.args.includes("--development");

const app = new Application();
const chance = new Chance();
const router = new Router();

async function getTemplateHtml() {
  return await Deno.readTextFile("./index.html");
}

const updateDetaValue = throttle(
  ({ value, key }: Note) => db.put(value, key),
  1000
);

let templateHtml = await getTemplateHtml();

router
  .get("/", ({ response }) => {
    const key = chance.first().toLowerCase();
    response.redirect(`/${key}`);
  })
  .get("/ws", (ctx) => {
    const key = ctx.request.url.searchParams.get("key");
    if (!key) {
      ctx.response.body = "Missing client ID";
      ctx.response.status = 400;
      return ctx.response;
    }

    const socket = ctx.upgrade();

    socket.onmessage = async (message) => {
      try {
        const { value }: Note = JSON.parse(message.data);
        await updateDetaValue({ key, value });
      } catch (error) {
        console.error(error);
      }
    };
  })
  .get("/:key", async ({ response, params, request }) => {
    if (__IS_DEV) {
      templateHtml = await getTemplateHtml();
    }

    const key = params.key;
    const userAgent = request.headers.get("user-agent");
    const { host: hostname, protocol } = request.url;
    const note = (await db.get(key)) as Note | null;

    if (!userAgent?.includes("Mozilla")) {
      response.body = note?.value;
      return response;
    }

    response.body = templateHtml
      .replace("{{note_content}}", note?.value ?? "")
      .replace("{{key}}", key)
      .replace(
        "{{websocket}}",
        `${protocol === "https:" ? "wss" : "ws"}://${hostname}/ws/?key=${key}`
      );
  });

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ port, hostname, secure }) => {
  console.info(
    `⚡⚡⚡ Listening on: ${secure ? "https://" : "http://"}${hostname}:${port}`
  );
});

await app.listen({ port: 8000 });
