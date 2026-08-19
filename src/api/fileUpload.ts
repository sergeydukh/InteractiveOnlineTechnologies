export interface UploadFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}
