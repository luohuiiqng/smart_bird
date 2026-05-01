import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { GradesController } from './grades.controller';
import { ClassesController } from './classes.controller';
import { SubjectsController } from './subjects.controller';

@Module({
  providers: [OrgService],
  controllers: [GradesController, ClassesController, SubjectsController],
})
export class OrgModule {}
