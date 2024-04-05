import { SESClient } from "@aws-sdk/client-ses";
import { ISESOptions } from "./interfaces";
import { IService } from "../shared";

// TODO:
// port logic from "ph-template-backend-nestjs/src/modules/communication/services/mail.service.ts"
// use AWS SES instead of SendGrid
// figure out a better way to store templates than in FS/resources, use SES API to create them remotely?

export class SESService implements IService<ISESOptions, SESClient> {
  private readonly options: ISESOptions;
  private readonly client: SESClient;

  constructor(options: ISESOptions) {
    this.options = options;
    if (!this.options.aws) {
      this.options.aws = {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    this.client = new SESClient({
      credentials: {
        accessKeyId: this.options.aws.accessKeyId,
        secretAccessKey: this.options.aws.secretAccessKey,
      },
      region: this.options.aws.region,
    });
  }

  get config(): ISESOptions {
    return this.options;
  }

  get instance(): SESClient {
    return this.client;
  }
}
