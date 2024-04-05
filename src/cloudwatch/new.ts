import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  InputLogEvent,
} from "@aws-sdk/client-cloudwatch-logs";
import util from "util";

// TODO:
// - Rename to service.ts & LoggerService
// - Create options interface and implement IService like other services

class Logger {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private buffer: InputLogEvent[];
  private sequenceToken: string | undefined;
  private chalk: any;

  constructor(logGroupName: string, logStreamName: string) {
    this.client = new CloudWatchLogsClient({ region: "us-west-2" }); // replace with your region
    this.logGroupName = logGroupName;
    this.logStreamName = logStreamName;
    this.buffer = [];
    this.init();
    this.loadChalk();
  }

  private async init() {
    try {
      await this.client.send(
        new CreateLogGroupCommand({ logGroupName: this.logGroupName }),
      );
    } catch (error) {
      if (error.name !== "ResourceAlreadyExistsException") {
        throw error;
      }
    }

    try {
      await this.client.send(
        new CreateLogStreamCommand({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName,
        }),
      );
    } catch (error) {
      if (error.name !== "ResourceAlreadyExistsException") {
        throw error;
      }
    }
  }

  private async loadChalk() {
    try {
      this.chalk = await import("chalk");
    } catch (error) {
      this.chalk = null;
    }
  }

  private async sendBatch() {
    const command = new PutLogEventsCommand({
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      logEvents: this.buffer,
      sequenceToken: this.sequenceToken,
    });

    const response = await this.client.send(command);
    this.sequenceToken = response.nextSequenceToken;
    this.buffer = [];
  }

  private log(
    level: "warn" | "info" | "error",
    message: string,
    metadata: any,
    ...args: any[]
  ) {
    const timestamp = new Date().toISOString();
    const formattedMessage = util.format(message, ...args);
    const event: InputLogEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message: formattedMessage,
        timestamp,
        pid: process.pid,
        context: metadata,
      }),
    };

    this.buffer.push(event);

    // Print to console
    const color =
      level === "error" ? "red" : level === "warn" ? "yellow" : "green";
    const output = `[${timestamp}] [${level.toUpperCase()}] [PID: ${process.pid}] ${formattedMessage}`;
    console.log(this.chalk ? this.chalk[color](output) : output);

    if (this.buffer.length >= 5) {
      this.sendBatch();
    }
  }

  warn(message: string, metadata: any, ...args: any[]) {
    this.log("warn", message, metadata, ...args);
  }

  info(message: string, metadata: any, ...args: any[]) {
    this.log("info", message, metadata, ...args);
  }

  error(message: string, metadata: any, ...args: any[]) {
    this.log("error", message, metadata, ...args);
  }
}
