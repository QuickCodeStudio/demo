import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { getPrometheusExporter } from './otel-bootstrap';

/**
 * Nest parity of C# OpenTelemetry.Exporter.Prometheus.AspNetCore scrape endpoint.
 */
@Controller()
export class MetricsController {
  @Get('metrics')
  metrics(@Req() req: Request, @Res() res: Response): void {
    const exporter = getPrometheusExporter();
    if (!exporter) {
      res.status(503).type('text/plain').send('Prometheus exporter is not enabled');
      return;
    }
    exporter.getMetricsRequestHandler(req, res);
  }
}
