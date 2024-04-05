import { waterfall } from "async";
import { Writable } from "readable-stream";
import { CloudWatchLogs, InputLogEvent } from "@aws-sdk/client-cloudwatch-logs";
import { getLevel, getStreamName } from "./helpers";
import {
  CW_EMIT_EVENT,
  CW_INVALID_TOKEN_EXCEPTION,
  CW_RESOURCE_EXISTS_EXCEPTION,
  CW_STREAM_NOT_FOUND_MESSAGE,
} from "./constants";
import {
  ICloudWatchConstructorOptions,
  ICloudWatchOptions,
} from "./interfaces";
import {
  TCloudWatchCallback,
  TCloudWatchCallbackEx,
  TCloudWatchData,
} from "./types";

export class CloudWatchStream extends Writable implements ICloudWatchOptions {
  readonly cloudWatchLogs: CloudWatchLogs;
  readonly logGroupName: string;
  readonly logStreamNamePrefix?: string;
  readonly logStreamName: string;
  logEvents: any[];
  nextSequenceToken: any;
  httpResponse: any;

  constructor(options: ICloudWatchConstructorOptions, fd?: 1) {
    super();

    if (options.objectMode === null || options.objectMode === undefined) {
      options.objectMode = true;
    }

    if (!options.aws) {
      options.aws = {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    this.nextSequenceToken = null;
    this.logGroupName = options.logGroupName;
    this.logStreamNamePrefix = options.logStreamNamePrefix;
    this.logStreamName =
      this.logStreamName || getStreamName(this.logStreamNamePrefix);

    this.cloudWatchLogs = new CloudWatchLogs({
      region: options.aws.region,
      credentials: {
        accessKeyId: options.aws.accessKeyId,
        secretAccessKey: options.aws.secretAccessKey,
      },
    });
  }

  createLogGroup(
    options: ICloudWatchOptions,
    callback: TCloudWatchCallback,
  ): void {
    if (options.nextSequenceToken) {
      return callback(null, options);
    }
    this.cloudWatchLogs.createLogGroup(
      {
        logGroupName: options.logGroupName,
      },
      (err: any) => {
        if (err && err.code === CW_RESOURCE_EXISTS_EXCEPTION) {
          err = null;
        }
        callback(err, options);
      },
    );
  }

  createLogStream(
    options: ICloudWatchOptions,
    callback: TCloudWatchCallback,
  ): void {
    if (options.nextSequenceToken) {
      return callback(null, options);
    }
    this.cloudWatchLogs.createLogStream(
      {
        logGroupName: options.logGroupName,
        logStreamName: options.logStreamName,
      },
      (err: any) => {
        if (err && err.code === CW_RESOURCE_EXISTS_EXCEPTION) {
          err = null;
        }
        callback(err, options);
      },
    );
  }

  nextToken(options: ICloudWatchOptions, callback: TCloudWatchCallback): void {
    if (options.nextSequenceToken) {
      return callback(null, options);
    }
    this.cloudWatchLogs.describeLogStreams(
      {
        logGroupName: options.logGroupName,
        logStreamNamePrefix: options.logStreamName,
      },
      (err: any, data?: TCloudWatchData) => {
        if (err) {
          return callback(err, null);
        }
        if (data?.logStreams?.length === 0) {
          return callback(new Error(CW_STREAM_NOT_FOUND_MESSAGE), null);
        }
        options.nextSequenceToken = data?.logStreams?.[0].uploadSequenceToken;
        callback(err, options);
      },
    );
  }

  putLogEvents(
    options: ICloudWatchOptions,
    callback: TCloudWatchCallback,
  ): void {
    const finalEvents: InputLogEvent[] = [];
    options.logEvents.forEach((e) => {
      const json = JSON.parse(e.message);
      const level = getLevel(json);
      finalEvents.push({
        timestamp: e.timestamp,
        message: JSON.stringify({
          content: `[${level}] [${json.context}] ${json.msg}`,
          context: json.context,
          level: level,
          request: {
            id: json.reqId,
            process: json.pid,
            hostname: json.hostname,
            data: json.req,
          },
        }),
      });
    });
    this.cloudWatchLogs.putLogEvents(
      {
        logEvents: finalEvents,
        logGroupName: options.logGroupName,
        logStreamName: options.logStreamName,
        sequenceToken: options.nextSequenceToken,
      },
      (err: any, data?: TCloudWatchData) => {
        if (err && err.code === CW_INVALID_TOKEN_EXCEPTION) {
          const body = JSON.parse(this.httpResponse?.body?.toString() ?? "{}");
          options.nextSequenceToken = body.expectedSequenceToken;
          return this.putLogEvents(options, callback);
        }
        options.nextSequenceToken = data?.nextSequenceToken;
        callback(err, options);
      },
    );
  }

  _write(chunks: any, _encoding: any, callback: TCloudWatchCallbackEx): void {
    if (!Array.isArray(chunks)) {
      chunks = [chunks];
    }
    const options: ICloudWatchOptions = {
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      logStreamNamePrefix: this.logStreamNamePrefix,
      httpResponse: this.httpResponse,
      cloudWatchLogs: this.cloudWatchLogs,
      nextSequenceToken: this.nextSequenceToken,
      logEvents: chunks.map((c: any) => {
        return {
          timestamp: new Date().getTime(),
          message: c.toString(),
        };
      }),
    };
    waterfall(
      [
        this.createLogGroup.bind(this, options),
        this.createLogStream.bind(this),
        this.nextToken.bind(this),
        this.putLogEvents.bind(this),
      ],
      ((err: any, options: ICloudWatchOptions) => {
        if (err) {
          return callback(err);
        }
        this.nextSequenceToken = options.nextSequenceToken;
        this.emit(CW_EMIT_EVENT);
        return callback();
      }).bind(this),
    );
  }
}
