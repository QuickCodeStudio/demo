import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Nest parity of C# UseHealthChecks("/hc") + HealthChecks.UI response shape.
 * Skipped from audit + rate-limit via isHealthPath.
 */
@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('hc')
  async healthCheck(): Promise<Record<string, unknown>> {
    const started = process.hrtime.bigint();
    const entries: Record<
      string,
      { status: string; duration: string; description?: string; data: Record<string, never>; tags: string[] }
    > = {};
    let healthy = true;

    const dbStarted = process.hrtime.bigint();
    try {
      await this.dataSource.query('SELECT 1');
      entries.database = {
        status: 'Healthy',
        duration: formatDuration(process.hrtime.bigint() - dbStarted),
        data: {},
        tags: ['ready'],
      };
    } catch (err) {
      healthy = false;
      entries.database = {
        status: 'Unhealthy',
        duration: formatDuration(process.hrtime.bigint() - dbStarted),
        description: err instanceof Error ? err.message : String(err),
        data: {},
        tags: ['ready'],
      };
    }

    const body = {
      status: healthy ? 'Healthy' : 'Unhealthy',
      totalDuration: formatDuration(process.hrtime.bigint() - started),
      entries,
    };

    if (!healthy) {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }
}

/** .NET TimeSpan-like "hh:mm:ss.fffffff" (7 fractional digits = 100ns ticks). */
function formatDuration(ns: bigint): string {
  const totalNs = Number(ns);
  const totalSec = Math.floor(totalNs / 1e9);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const fracTicks = Math.floor((totalNs % 1e9) / 100);
  const frac = String(fracTicks).padStart(7, '0').slice(0, 7);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${frac}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
