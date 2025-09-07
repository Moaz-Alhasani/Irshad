import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from './decorators/roles.decorators';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles-guard';
import { CurrentUser } from './decorators/current_user.decorators';
import { AuthService } from './user.service';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserInfo } from './dto/update-user.dto';
import { jwtStrategy } from './strategies/jwt.strategy';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';



@Controller('auth')
export class AuthController {
  constructor(private authservice: AuthService) {}


  @Post('register')
  @UseInterceptors(FileInterceptor('profileImage', {
    storage: diskStorage({
      destination: './uploads/profile', 
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
  }))
  register(
    @Body() registerDto: RegisterDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    const imagePath = file ? `uploads/profile/${file.filename}` : null;
    return this.authservice.register(registerDto, imagePath);
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
  getFullProfile(@CurrentUser() user: any) {
    return this.authservice.getUserWithResume(user.id);
  }

  @Post('createAdmin')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createAdmin(@Body() registerDto: RegisterDto) {
    return this.authservice.createAdmin(registerDto);
  }

  @Post('createSuperAdmin')
  @Roles(UserRole.SUPER_ADMIN) // 
  @UseGuards(JwtAuthGuard, RolesGuard)
  createSuperAdmin(@Body() registerDto: RegisterDto) {
    return this.authservice.createSuperAdmin(registerDto);
  }


  @Put('update/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profileImage', {
    storage: diskStorage({
      destination: './uploads/profile',
      filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
      },
    }),
  }))
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserInfo: UpdateUserInfo,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: any,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const imagePath = file ? `uploads/profile/${file.filename}` : undefined;
    return this.authservice.updateUser(id, updateUserInfo, imagePath);
  }


  @Delete('delete/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  deleteUser(@Param('id') id: number) {
    return this.authservice.deleteUser(id);
  }

  @Post('accept/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard,RolesGuard)
  acceptTheCompany(@Param('id',ParseIntPipe)compid:number){

    return this.authservice.AdminAcceptTheCompany(compid)
  }

  @Post('refuse/:id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard,RolesGuard)
  NonacceptTheCompany(@Param('id',ParseIntPipe)compid:number){
    return this.authservice.AdminNonAcceptTheCompany(compid)
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommended-jobs')
  async JobsRecommendtion(@CurrentUser() currentUser: any){
      return this.authservice.getRecommendedJobs(currentUser.id);
  }

  @Post('verify-email')
  @UseGuards(JwtAuthGuard)
  async verifyOtpforemail (
    @CurrentUser() currentUser: any,
    @Body('otp') otp: string,
  ) {
    return this.authservice.verifyOtpForEmail(currentUser.email, otp);
  }

  @Post('forget-password')
  async forgetPassword(@Body('email') email: string) {
    return this.authservice.forgetPassword(email);
  }

  @Post('verify-otp-password')
  async verifyOtpForPassword(
    @Body('otp') otp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authservice.verifyOtpForPassword(otp);
    if (!result.success) {
      return result; 
    }
    res.cookie('resetToken', result.resetToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
    return { success: true, message: 'OTP verified. You can now submit new password.' };
  }

   @Post('update-password')
  async updatePassword(
    @Body('newPassword') newPassword: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resetToken = req.cookies?.resetToken;
    if (!resetToken) {
      throw new ForbiddenException('Reset token missing. Verify OTP first.');
    }
    const result = await this.authservice.updatePassword(newPassword, resetToken);
    res.clearCookie('resetToken');
    return result;
  }

  @Post('resend-otp')
  @UseGuards(JwtAuthGuard)
  async resendOtp(@CurrentUser()currentUser:any){
    return this.authservice.resendOtp(currentUser.email)
  }
}
