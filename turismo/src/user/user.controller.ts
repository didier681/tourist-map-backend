import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  SerializeOptions,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateGestorDto } from './dto/create-gestor.dto';
import { AssignGestorZonasDto } from './dto/assign-gestor-zonas.dto';
import { GestorZona } from '../gestor-zona/entities/gestor-zona.entity';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateAccountStateDto } from './dto/update-account-state.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';

// Los guards y el rol aplican a todas las rutas del controlador
@Controller('users')
@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
// El grupo administrativo permite datos de contacto solo a personal autorizado.
@SerializeOptions({ groups: ['admin'] })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Post('gestores')
  createGestor(
    @Body() dto: CreateGestorDto,
    @GetUser() admin: User,
    @Req() request: Request,
  ): Promise<User> {
    return this.userService.createGestor(dto, admin, request.ip);
  }

  @Post(':id/zonas')
  assignZonas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignGestorZonasDto,
    @GetUser() admin: User,
    @Req() request: Request,
  ): Promise<GestorZona[]> {
    return this.userService.assignZonas(id, dto, admin, request.ip);
  }

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/activar')
  activate(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.userService.activate(id);
  }

  @Patch(':id/estado')
  updateAccountState(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAccountStateDto,
    @GetUser() admin: User,
    @Req() request: Request,
  ): Promise<User> {
    return this.userService.updateAccountState(
      id,
      dto.isActive,
      dto.motivo,
      admin.id,
      request.ip,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() admin: User,
    @Req() request: Request,
  ): Promise<void> {
    return this.userService.remove(id, admin, request.ip);
  }
}