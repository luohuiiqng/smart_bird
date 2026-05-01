import { Module } from '@nestjs/common';
import { OrgService } from './org.service';
import { GradesController } from './grades.controller';
import { ClassesController } from './classes.controller';
import { SubjectsController } from './subjects.controller';
import { TeachersController } from './teachers.controller';
import { StudentsController } from './students.controller';

@Module({
  providers: [OrgService],
  controllers: [
    GradesController,
    ClassesController,
    SubjectsController,
    TeachersController,
    StudentsController,
  ],
})
export class OrgModule {}
