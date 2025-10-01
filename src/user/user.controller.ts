import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto, @Req() req) {
    return this.userService.create(createUserDto, req.user);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get()
  findAll(
    @Query('role') role?: string,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('phone') phone?: string,
  ) {
    return this.userService.findAll(role, firstName, lastName, phone);
  }

  
  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    const id = req.user.id;
    return this.userService.getMe(id);
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('dashboard')
  getDashboard() {
    return this.userService.getDashboard();
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('admins')
  getAdmins(
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('phone') phone?: string,
  ) {
    return this.userService.getAdmins(firstName, lastName, phone);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('students')
  getStudents(
    @Query('id') id?: string,
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
  ) {
    return this.userService.getStudents(id ? +id : undefined, firstName, lastName);
  }

  @Roles('admin', 'superAdmin', 'teacher')
  @UseGuards(AuthGuard)
  @Get('all/students')
  getAllStudents(
    @Query('groupId') groupIdRaw?: string,
    @Query('paid') paid?: 'true' | 'false',
    @Query('firstName') firstName?: string,
    @Query('lastName') lastName?: string,
    @Query('phone') phone?: string,
    @Query('address') address?: string,
    @Query('monthFor') monthFor?: string,
  ) {
    const groupId =
      groupIdRaw && groupIdRaw !== '' && !isNaN(Number(groupIdRaw))
        ? Number(groupIdRaw)
        : undefined;

    return this.userService.getAllStudents({
      groupId,
      paid,
      firstName,
      lastName,
      phone,
      address,
      monthFor,
    });
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get('workers')
  getWorkers() {
    return this.userService.getWorkers();
  }

  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Patch('me/update')
  updateMe(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    const id = Number(req.user.id);
    return this.userService.updateMe(id, updateUserDto);
  }

  
  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }


  @Roles('admin', 'superAdmin')
  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.userService.remove(id, req.user.id);
  }
}