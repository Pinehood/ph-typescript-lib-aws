import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { BucketCannedACL, ObjectCannedACL, S3 } from "@aws-sdk/client-s3";
import { IService } from "../utils";
import {
  IS3DownloadResponse,
  IS3File,
  IS3Options,
  IS3UploadResponse,
} from "./interfaces";

export class S3Service implements IService<IS3Options, S3> {
  private readonly options: IS3Options;
  private readonly client: S3;

  constructor(options: IS3Options) {
    this.options = options;
    if (!this.options.aws) {
      this.options.aws = {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    this.client = new S3({
      credentials: {
        accessKeyId: this.options.aws.accessKeyId,
        secretAccessKey: this.options.aws.secretAccessKey,
      },
      region: this.options.aws.region,
    });
  }

  get config(): IS3Options {
    return this.options;
  }

  get instance(): S3 {
    return this.client;
  }

  async upload(
    file: IS3File,
    bucket: string,
    acl: ObjectCannedACL = "private",
  ): Promise<IS3UploadResponse> {
    await this.ensureBucketExists(bucket);
    const key = `${bucket}/${randomUUID()}${path.extname(file.originalname)}`;
    const location = `https://${this.options.bucket}.${this.options.aws.region}.amazonaws.com/${key}`;
    const result = await this.client.putObject({
      Bucket: this.options.bucket,
      Key: key,
      Body: Readable.from(Buffer.from(file.buffer, "binary")),
      ACL: acl,
      ContentType: file.mimetype,
      ContentDisposition: "inline",
      Metadata: {
        originalName: file.originalname,
      },
    });
    if (!result) return null;
    return {
      key,
      location,
    };
  }

  async uploadMultiple(
    files: IS3File[],
    bucket: string,
    acl: ObjectCannedACL = "private",
  ): Promise<IS3UploadResponse[]> {
    const promises: Promise<IS3UploadResponse>[] = [];
    files.forEach((file) => promises.push(this.upload(file, bucket, acl)));
    const results = await Promise.allSettled(promises);
    return results.map((r) => r.status === "fulfilled" && r.value);
  }

  async download(key: string): Promise<IS3DownloadResponse> {
    const response = await this.client.getObject({
      Bucket: this.options.bucket,
      Key: key,
    });
    return {
      contentType: response.ContentType,
      content: await response.Body.transformToByteArray(),
      fileName: response.Metadata?.originalName ?? key,
    };
  }

  delete(key: string) {
    return this.client.deleteObject({
      Bucket: this.options.bucket,
      Key: key,
    });
  }

  acl(key: string, acl: ObjectCannedACL = "private") {
    return this.client.putObjectAcl({
      Bucket: this.options.bucket,
      Key: key,
      ACL: acl,
    });
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    let result = await this.bucketExists(this.options.bucket);
    if (!result) {
      result = await this.createBucket(this.options.bucket);
    }
    if (!result || !this.options.allowedSubBuckets.includes(bucket)) {
      throw new Error(`Sub-bucket name '${bucket}' is invalid`);
    }
  }

  private async bucketExists(bucket: string): Promise<boolean> {
    try {
      return !!(await this.client.headBucket({ Bucket: bucket }))
        ?.BucketLocationName;
    } catch {
      return false;
    }
  }

  private async createBucket(
    bucket: string,
    acl: BucketCannedACL = "private",
  ): Promise<boolean> {
    try {
      return !!(await this.client.createBucket({ Bucket: bucket, ACL: acl }))
        ?.Location;
    } catch {
      return false;
    }
  }
}
