import IORedis, {
  Cluster,
  ClusterNode,
  ClusterOptions,
  Redis,
  RedisKey,
  RedisOptions,
  RedisValue,
} from "ioredis";
import { IService } from "../utils";
import { IElastiCacheRedisOptions } from "./interfaces";

export class ElastiCacheRedisService
  implements IService<IElastiCacheRedisOptions, Redis | Cluster>
{
  private readonly options: IElastiCacheRedisOptions;
  private readonly client: Redis | Cluster;

  constructor(options: IElastiCacheRedisOptions) {
    this.options = options;
    const hosts = this.options.hosts;
    const ports = this.options.ports;
    const clusterMode = hosts.length >= 2 && ports.length >= 2;
    if (!clusterMode) {
      const options: RedisOptions = {
        host: hosts[0],
        port: ports[0],
        password: this.options.password,
      };
      if (this.options.tlsOptions) {
        options.tls = { ...this.options.tlsOptions };
      }
      this.client = new IORedis(options);
    } else {
      const nodes: ClusterNode[] = [];
      for (let i = 0; i < hosts.length; i++) {
        nodes.push({ host: hosts[i], port: ports[i] });
      }
      const clusterOptions: ClusterOptions = {
        ...(this.options.clusterOptions ?? {}),
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: { password: this.options.password },
      };
      if (this.options.tlsOptions) {
        clusterOptions.redisOptions.tls = this.options.tlsOptions;
      } else {
        clusterOptions.redisOptions.tls = {};
      }
      this.client = new Cluster(nodes, clusterOptions);
    }
  }

  get config(): IElastiCacheRedisOptions {
    return this.options;
  }

  get instance(): Redis | Cluster {
    return this.client;
  }

  set(key: RedisKey, value: RedisValue, ttl?: number) {
    if (!ttl) {
      return this.client.set(key, value);
    } else {
      return this.client.set(key, value, "EX", ttl);
    }
  }

  get(key: RedisKey) {
    return this.client.get(key);
  }

  delete(key: RedisKey) {
    return this.client.del(key);
  }

  async exists(key: RedisKey) {
    return (await this.client.exists(key)) === 1;
  }
}
