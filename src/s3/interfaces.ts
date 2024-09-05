import { IAWSOptions } from "../utils";

export interface IS3Options {
  bucket: string;
  allowedSubBuckets: string[];
  aws?: IAWSOptions;
}

export interface IS3File {
  buffer: any;
  mimetype: string;
  originalname: string;
}

export interface IS3DownloadResponse {
  contentType: string;
  content: string | Uint8Array | Buffer;
  fileName: string;
}

export interface IS3UploadResponse {
  key: string;
  location: string;
}
