import { CloudWatchLogs } from "@aws-sdk/client-cloudwatch-logs";
import { IAWSOptions } from "../utils";

export interface ICloudWatchLoggerOptions {
  logGroupName: string;
  logStreamName: string;
  aws?: IAWSOptions;
  useChalk?: boolean;
  batchSize?: number;
}

export interface ICloudWatchConstructorOptions {
  logGroupName: string;
  logStreamNamePrefix?: string;
  logStreamName?: string;
  objectMode?: boolean;
  aws?: IAWSOptions;
}

export interface ICloudWatchOptions {
  readonly cloudWatchLogs: CloudWatchLogs;
  readonly logGroupName: string;
  readonly logStreamNamePrefix?: string;
  readonly logStreamName: string;
  logEvents: any[];
  nextSequenceToken: any;
  httpResponse: any;
}
