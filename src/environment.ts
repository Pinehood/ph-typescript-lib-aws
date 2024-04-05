declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_REGION?: string | null;
      AWS_ACCESS_KEY_ID?: string | null;
      AWS_SECRET_ACCESS_KEY?: string | null;
    }
  }
}
export {};
