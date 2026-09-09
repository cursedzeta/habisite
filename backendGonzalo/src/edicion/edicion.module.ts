import { Module } from '@nestjs/common';
import { EdicionController } from './edicion.controller.js';
import { EdicionRepository } from './edicion.repository.js';
import { EdicionService } from './edicion.service.js';

@Module({
  controllers: [EdicionController],
  providers: [EdicionService, EdicionRepository],
  exports: [EdicionRepository, EdicionService],
})
export class EdicionModule {}
