import {Deta} from 'deta';

const deta = Deta(process.env.DETA_PROJECT_KEY);

export const db = deta.Base(process.env.NODE_ENV);
