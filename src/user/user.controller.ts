import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, UseGuards } from '@nestjs/common';

import { Roles } from './decorators/roles.decorators';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles-guard';
import { CurrentUser } from './decorators/current_user.decorators';
import { AuthService } from './user.service';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserInfo } from './dto/update-user.dto';


@Controller('auth')
export class AuthController {
  constructor(private authservice: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authservice.register(registerDto);
  }
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authservice.login(loginDto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authservice.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Post('createAdmin')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createAdmin(@Body() registerDto: RegisterDto) {
    return this.authservice.createAdmin(registerDto);
  }


  @Put('update/:id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserInfo: UpdateUserInfo,
    @CurrentUser() currentUser: any,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.authservice.updateUser(id, updateUserInfo);
  }

  @Delete('delete/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  deleteUser(@Param('id') id: number) {
    return this.authservice.deleteUser(id);
  }
}
