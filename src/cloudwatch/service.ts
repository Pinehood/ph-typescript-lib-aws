import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  InputLogEvent,
} from "@aws-sdk/client-cloudwatch-logs";
import util from "util";
import { IService } from "../utils";
import { ICloudWatchLoggerOptions } from "./interfaces";
import {
  CW_DEFAULT_BATCH_SIZE,
  CW_RESOURCE_EXISTS_EXCEPTION,
} from "./constants";
import { TCloudWatchLogLevel } from "./types";

export class CloudWatchLoggerService
  implements IService<ICloudWatchLoggerOptions, CloudWatchLogsClient>
{
  private readonly client: CloudWatchLogsClient;
  private readonly options: ICloudWatchLoggerOptions;
  private readonly buffer: InputLogEvent[];
  private sequenceToken: string | null;
  private chalk: any | null;

  constructor(options: ICloudWatchLoggerOptions) {
    this.buffer = [];
    this.options = options;
    if (!this.options.aws) {
      this.options.aws = {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    if (!this.options.batchSize) {
      this.options.batchSize = CW_DEFAULT_BATCH_SIZE;
    }
    this.client = new CloudWatchLogsClient({
      credentials: {
        accessKeyId: this.options.aws.accessKeyId,
        secretAccessKey: this.options.aws.secretAccessKey,
      },
      region: this.options.aws.region,
    });
    this.init();
    this.loadChalk();
  }

  get config(): ICloudWatchLoggerOptions {
    return this.options;
  }

  get instance(): CloudWatchLogsClient {
    return this.client;
  }

  warn(metadata: any, message: string, ...args: any[]) {
    this.log("warn", metadata, message, ...args);
  }

  info(metadata: any, message: string, ...args: any[]) {
    this.log("info", metadata, message, ...args);
  }

  error(metadata: any, message: string, ...args: any[]) {
    this.log("error", metadata, message, ...args);
  }

  private async init() {
    try {
      await this.client.send(
        new CreateLogGroupCommand({ logGroupName: this.options.logGroupName }),
      );
      await this.client.send(
        new CreateLogStreamCommand({
          logGroupName: this.options.logGroupName,
          logStreamName: this.options.logStreamName,
        }),
      );
    } catch (error) {
      if (error.name !== CW_RESOURCE_EXISTS_EXCEPTION) {
        throw error;
      }
    }
  }

  private async loadChalk() {
    if (!this.options.useChalk) return;
    try {
      this.chalk = await import("chalk");
    } catch {
      this.chalk = null;
    }
  }

  private async sendBatch() {
    const command = new PutLogEventsCommand({
      logGroupName: this.options.logGroupName,
      logStreamName: this.options.logStreamName,
      logEvents: this.buffer,
      sequenceToken: this.sequenceToken,
    });
    const response = await this.client.send(command);
    this.sequenceToken = response.nextSequenceToken;
    this.buffer.splice(0, this.options.batchSize);
  }

  private log(
    level: TCloudWatchLogLevel,
    metadata: any,
    message: string,
    ...args: any[]
  ) {
    const timestamp = new Date().toISOString();
    const formattedMessage = util.format(message, ...args);
    const event: InputLogEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        msg: formattedMessage,
        pid: process.pid,
        timestamp,
        metadata,
      }),
    };

    const color =
      level === "error" ? "red" : level === "warn" ? "yellow" : "green";
    const output = `[${timestamp}] [${process.pid}] [${level.toUpperCase()}] ${formattedMessage}`;
    console.log(this.chalk ? this.chalk[color](output) : output);

    this.buffer.push(event);
    if (this.buffer.length >= this.options.batchSize) this.sendBatch();
  }
}
