import "https://deno.land/std@0.185.0/dotenv/load.ts";
import { Application, Router } from "https://deno.land/x/oak@v12.4.0/mod.ts";
import Chance from "chance";
import { Deta } from "deta";
import throttle from "throttle";

interface Note {
  key: string;
  value: string;
}

interface NotePayload {
  id: string;
  content: string;
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

const updateDetaContent = throttle(
  ({ content, id }: NotePayload) => db.put(content, id),
  1000
);

let templateHtml = await getTemplateHtml();

router
  .get("/", ({ response }) => {
    const id = chance.first().toLowerCase();
    response.redirect(`/${id}`);
  })
  .get("/ws/:id", (ctx) => {
    const id = ctx.params.id;
    const socket = ctx.upgrade();
    socket.onmessage = async (message) => {
      try {
        const { content }: NotePayload = JSON.parse(message.data);
        await updateDetaContent({ id, content });
      } catch (error) {
        console.error(error);
      }
    };
  })
  .get("/:id", async ({ response, params, request }) => {
    if (__IS_DEV) {
      templateHtml = await getTemplateHtml();
    }

    const id = params.id;
    const userAgent = request.headers.get("User-Agent");
    const { host: hostname, protocol } = request.url;
    const item = (await db.get(id)) as Note | null;

    if (!userAgent?.includes("Mozilla")) {
      response.body = item?.value;
      return response;
    }

    response.body = templateHtml
      .replace("{{note_content}}", item?.value ?? "")
      .replace(
        "{{websocket}}",
        `${protocol === "https:" ? "wss" : "ws"}://${hostname}/ws/${id}`
      );
  });

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ port, hostname, secure }) => {
  console.log(
    `Listening on: ${secure ? "https://" : "http://"}${hostname}:${port}`
  );
});

await app.listen({ port: 8000 });
