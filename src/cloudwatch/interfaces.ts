import { CloudWatchLogs } from "@aws-sdk/client-cloudwatch-logs";

export interface ICloudWatchConstructorOptions {
  logGroupName: string;
  logStreamNamePrefix?: string;
  logStreamName?: string;
  objectMode?: boolean;
  aws?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
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
