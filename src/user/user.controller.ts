import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from './decorators/roles.decorators';
import { UserEntity, UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles-guard';
import { CurrentUser } from './decorators/current_user.decorators';
import { AuthService } from './user.service';
import { RegisterDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserInfo } from './dto/update-user.dto';
import { jwtStrategy } from './strategies/jwt.strategy';
import path, { extname } from 'path';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import {generateFingerprint} from '../utils/fingerprint'


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
    fileFilter: (req, file, callback) => {
      console.log('File filter - Processing:', {
        name: file.originalname,
        type: file.mimetype,
        size: file.size
      });
      
      // قائمة بأنواع الصور المسموح بها
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      // التحقق من نوع MIME
      if (allowedMimeTypes.includes(file.mimetype)) {
        console.log('File accepted');
        callback(null, true);
      } else {
        console.log('File rejected - Invalid mime type:', file.mimetype);
        callback(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB كحد أقصى
    }
  }))
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
      const imagePath = file ? `uploads/profile/${file.filename}` : null;
      console.log(imagePath);
      
      const fingerprint = generateFingerprint(req); 
      const { user, accessToken, refreshToken } =  await this.authservice.register(registerDto, imagePath,fingerprint);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 3,
    });

    return {
      user,
      tempToken:accessToken,
      message: 'Registration successful',
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto,@Req() req : Request ,@Res({ passthrough: true }) res: Response) {
    const fingerprint = generateFingerprint(req);
    const { user, accessToken, refreshToken } = await this.authservice.login(loginDto,fingerprint);
    res.cookie('accessToken', accessToken, {
    httpOnly: true,  
    secure: true,   
    sameSite: 'none',
    maxAge: 1000 * 60 * 60, 
  }); 
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
  });
    return {
      user,
      accessToken, 
      message: 'Login successful',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: any,
  ) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return { message: `Logout successful for user ${user.email}` };
  }

  // @Post('refresh')
  // refresh(@Body('refreshToken') refreshToken: string) {
  //   return this.authservice.refreshToken(refreshToken);
  // }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refreshToken'];
    const fingerprint = generateFingerprint(req);
    const accessToken = await this.authservice.refreshToken(refreshToken,fingerprint);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true, 
      sameSite: 'none', 
      maxAge: 15 * 60 * 1000,
    });
    return { message: 'Access token refreshed' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getFullProfile(@CurrentUser() user: any) {
    console.log(user.age)
    return this.authservice.getUserWithResume(user.id);
  }

  @Post('createAdmin')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createAdmin(@Body() registerDto: RegisterDto , @Req() req : Request) {
    const fingerprint = generateFingerprint(req);
    return this.authservice.createAdmin(registerDto,fingerprint);
  }

  @Post('createSuperAdmin')
  @Roles(UserRole.SUPER_ADMIN) // 
  @UseGuards(JwtAuthGuard, RolesGuard)
  createSuperAdmin(@Body() registerDto: RegisterDto , @Req() req :Request) {
    const fingerprint = generateFingerprint(req)
    return this.authservice.createSuperAdmin(registerDto,fingerprint);
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
    @Param('id', ParseIntPipe) id: number,
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

  @Get('recommended-jobs')
  @UseGuards(JwtAuthGuard)
  async JobsRecommendtion(@CurrentUser() currentUser: any){
      return this.authservice.getRecommendedJobs(currentUser.id);
  }
  

  @Post('verify-email')
  @UseGuards(JwtAuthGuard) 
  async verifyOtpForEmail(
    @CurrentUser() currentUser: any,
    @Body('otp') otp: string, 
    @Req() req : Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fingerprint = generateFingerprint(req)
    const result = await this.authservice.verifyOtpForEmail(currentUser.email, otp,fingerprint);

    if (result.success && result.tokens) {
      res.clearCookie('accessToken');

      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 60 * 24,
      });
    }
      return  result.tokens
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
    if ('resetToken' in result){
      res.cookie('resetToken', result.resetToken , {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 5 * 60 * 1000
      });
    }
    return { success: true, message: 'OTP verified. You can now submit new password.' };
  }

  @Post('update-password')
  async updatePassword(
    @Body('newPassword') newPassword: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resetToken = req.cookies?.resetToken;
    console.log(req.cookies);
    
    if (!resetToken) {
      throw new ForbiddenException('Reset token missing. Verify OTP first.');
    }
    const result = await this.authservice.updatePassword(newPassword, resetToken);
    res.clearCookie('resetToken');
    return result;
  }

  @Post('resend-email-otp')
  async resendEmailOtp(
    @Body('email') email: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fingerprint = generateFingerprint(req);

    return this.authservice.resendOtp(email, fingerprint).then(result => {
      res.cookie('accessToken', result.tempToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000 * 60 * 3,
      });

      return {
        message: result.message,
      };
    });
  }

@Post('resend-password-otp')
  async resendPasswordOtp(@Body('email') email: string) {
    const message = await this.authservice.resendPasswordOtp(email);
    return { message };
  }


@Post('searchuser')
async searchofuser(@Body('username') username: string) {
  return this.authservice.searchUserByName(username);
}

  @Put('disable/:id')
  @UseGuards(JwtAuthGuard) 
  async disableAccount(
    @Param('id') id: number,
    @CurrentUser() currentUser: any,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own status');
    }

    return this.authservice.disable(id);
  }
  
  @Put('undisable/:id')
  @UseGuards(JwtAuthGuard)
  async unDisableAccount(
    @Param('id') id: number,
    @CurrentUser() currentUser: any,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own status');
    }

    return this.authservice.undisable(id);
  }

  @Get('count_jobseekers')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getNumberOfUsers() {
    return await this.authservice.numberOfUsers();
  }
  @Get('admins_count')
  @Roles(UserRole.SUPER_ADMIN,UserRole.ADMIN) 
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getNumberOfAdmins() {
    return await this.authservice.numberOfAdmins();
  }

  @Get('verified-users')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUserVerifyTrue() {
    const count = await this.authservice.getUserWhoVerifyTrue();
    return { verifiedUsers: count };
  }

  @Get('not-verified-users')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUserVerifyFalse() {
    const count = await this.authservice.getUserWhoVerifyFalse();
    return { notVerifiedUsers: count };
  }


  @Get("getuserUsingrole")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getUsers(@Query('role') role?: UserRole) {
    if (role) {
      return this.authservice.getUsersByRole(role);
    }
    return this.authservice.getAllUsers();
  }


  @Get('my-applications/accepted')
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getAccepted(@CurrentUser()currentUser:any) {
    return await this.authservice.getAcceptedApplications(currentUser.id);
  }

  @Get('my-applications/rejected')
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getRejected(@CurrentUser()currentUser:any) {
    return await this.authservice.getRejectedApplications(currentUser.id);
  }

  @Get('my-applications/pending')
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getPending(@CurrentUser()currentUser:any) {
    return await this.authservice.getPendingApplications(currentUser.id);
  }

}
