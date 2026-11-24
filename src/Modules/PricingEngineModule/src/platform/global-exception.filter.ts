import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { writeElasticLog } from './observability/elastic-sink';

/**
 * Nest parity of C# GlobalExceptionHandler → application/problem+json.
 * HttpException keeps its status/body; unexpected errors become 500 ProblemDetails.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status);
      if (typeof body === 'string') {
        res.type('application/problem+json').json({
          status,
          title: body,
        });
        return;
      }
      res.type('application/json').json(body);
      return;
    }

    this.logger.error(
      'Unhandled exception occurred',
      exception instanceof Error ? exception.stack : String(exception),
    );

    writeElasticLog({
      message: 'Unhandled exception occurred',
      level: 'Error',
      exception:
        exception instanceof Error
          ? { message: exception.message, stack: exception.stack }
          : String(exception),
    });

    const isDev = (process.env.NODE_ENV ?? '').toLowerCase() === 'development';
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).type('application/problem+json').json({
      status: 500,
      title: 'An unexpected error occurred.',
      detail: isDev
        ? exception instanceof Error
          ? exception.stack ?? exception.message
          : String(exception)
        : 'Please contact support.',
    });
  }
}
