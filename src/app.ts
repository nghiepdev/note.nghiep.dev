import Fastify from 'fastify';
import FastifyWebsocket from '@fastify/websocket';
import Chance from 'chance';
import fs from 'node:fs';
import path from 'node:path';

import {db} from './db';

const chance = new Chance();
const app = Fastify();
app.register(FastifyWebsocket);

function getTemplateHtml() {
  return fs.readFileSync(path.resolve(__dirname, './index.html')).toString();
}

let templateHtml = getTemplateHtml();

app.register(async fastify => {
  fastify.get('/', (_request, reply) => {
    const id = chance.word();
    return reply.redirect(`/${id}`);
  });

  fastify.get('/ws', {websocket: true}, connection => {
    connection.socket.on('message', async message => {
      try {
        const {
          id,
          content,
        }: {
          content: string;
          id: string;
        } = JSON.parse(message.toString());
        await db.put(content, id);
      } catch (error) {
        console.error(error);
      }
    });
  });

  fastify.get<{Params: {id: string}}>('/:id', async (request, reply) => {
    const {id} = request.params;
    const hostname = request.hostname;

    if (process.env.NODE_ENV === 'development') {
      templateHtml = getTemplateHtml();
    }

    const item = await db.get(id);
    const content = (item as {value: string} | null)?.value ?? '';

    // TODO: Check user-agent browser
    reply.type('text/html; charset=utf-8');

    return reply.send(
      templateHtml
        .replace('{{id}}', id)
        .replace('{{note_content}}', content)
        .replace(
          '{{websocket}}',
          `${
            process.env.NODE_ENV === 'production' ? 'wss' : 'ws'
          }://${hostname}/ws`,
        ),
    );
  });
});

app.listen({port: process.env.PORT});
