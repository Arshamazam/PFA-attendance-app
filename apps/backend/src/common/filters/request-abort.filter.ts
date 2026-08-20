import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

// Catches raw Error objects — specifically multer's "Request aborted" which fires when the
// client drops the connection mid-upload. Returns 503 so the mobile client can distinguish
// a transient upload drop from a real server fault.
//
// IMPORTANT: HttpException extends Error, so this filter also intercepts all NestJS
// HttpExceptions (400/401/403/404 etc). We must pass those through correctly so the
// standard error responses are not swallowed and turned into 500s.
@Catch(Error)
export class RequestAbortFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Pass HttpExceptions through with their correct status and body
    if (error instanceof HttpException) {
      const status = error.getStatus();
      response.status(status).json(error.getResponse());
      return;
    }

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
