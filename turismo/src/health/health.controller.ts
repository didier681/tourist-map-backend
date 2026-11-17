import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get()
  // Permite que los orquestadores comprueben disponibilidad sin consumir cuota ni autenticarse.
  @SkipThrottle()
  @HealthCheck()
  check() {
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
