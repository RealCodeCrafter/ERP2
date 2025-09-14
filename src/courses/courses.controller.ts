import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { CourseService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() createCourseDto: CreateCourseDto): Promise<Course> {
    return this.courseService.create(createCourseDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(
    @Query('name') name?: string,
  ): Promise<any> {
    return this.courseService.findAll(name);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Course> {
    return this.courseService.findOne(+id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateCourseDto: UpdateCourseDto): Promise<Course> {
    return this.courseService.update(+id, updateCourseDto);
  }

  @Roles('admin', 'superAdmin')
@UseGuards(AuthGuard)
@Delete(':id')
async remove(@Param('id') id: string): Promise<{ message: string }> {
  return this.courseService.remove(+id);
}

}