import { ICloudWatchOptions } from "./interfaces";

export type TCloudWatchCallback = (
  err: any,
  options: ICloudWatchOptions,
) => void;

export type TCloudWatchCallbackEx = (err?: any) => void;

export type TCloudWatchData = {
  logStreams?: any[];
  nextSequenceToken?: any;
};

export type TCloudWatchLogLevel = "info" | "warn" | "error";
