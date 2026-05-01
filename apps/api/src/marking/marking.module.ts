import { Module } from '@nestjs/common';
import { MarkingController } from './marking.controller';
import { MarkingService } from './marking.service';

@Module({
  controllers: [MarkingController],
  providers: [MarkingService],
})
export class MarkingModule {}
