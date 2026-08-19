import { FileUploadSchema } from '../contracts';
import type { UploadFile } from '../fileUpload';
import type { HttpTransport } from '../httpTransport';

/** Uploads files that are not yet associated with an authenticated profile. */
export class UploadsApi {
  constructor(private readonly transport: HttpTransport) {}

  uploadRegistrationPhoto(file: UploadFile) {
    return this.transport.send({
      method: 'POST',
      path: '/api/upload/photo',
      schema: FileUploadSchema,
      multipart: { photo: file },
    });
  }
}
