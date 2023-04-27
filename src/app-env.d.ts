declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    PORT: number;

    DETA_PROJECT_KEY: string;
  }
}
