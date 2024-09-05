export interface IService<T, U> {
  get config(): T;
  get instance(): U;
}

export interface IAWSOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}
