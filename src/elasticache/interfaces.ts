import { ConnectionOptions } from "node:tls";
import { ClusterOptions } from "ioredis";

export interface IElastiCacheRedisOptions {
  hosts: string[];
  ports: number[];
  password: string;
  tlsOptions?: ConnectionOptions;
  clusterOptions?: ClusterOptions;
}
