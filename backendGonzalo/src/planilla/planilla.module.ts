import { Module } from '@nestjs/common';
import { PlanillaRepository } from './planilla.repository.js';
import { PlanillaService } from './planilla.service.js';

@Module({
  providers: [PlanillaService, PlanillaRepository],
})
export class PlanillaModule {}
