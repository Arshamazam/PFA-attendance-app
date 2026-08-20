import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';

// Catches raw Error objects (not HttpExceptions) — specifically multer's "Request aborted"
// which fires when the client drops the connection mid-upload. Without this filter NestJS
// returns an unhandled 500; we return 503 so the mobile client can distinguish a transient
// upload failure from a real server crash.
@Catch(Error)
export class RequestAbortFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (error.message === 'Request aborted') {
      response.status(503).json({
        statusCode: 503,
        message: 'Upload interrupted. Please check your connection and try again.',
      });
      return;
    }

    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
    });
  }
}
