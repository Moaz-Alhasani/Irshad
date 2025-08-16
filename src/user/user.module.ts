import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule} from '@nestjs/jwt';
import { RolesGuard } from './guards/roles-guard';
import { UserEntity } from './entities/user.entity';
import { AuthController } from './user.controller';
import { AuthService } from './user.service';
import { jwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports:[TypeOrmModule.forFeature([UserEntity]),
  PassportModule,
  JwtModule.register({})],
  exports:[AuthModule,RolesGuard],
  controllers: [AuthController],
  providers: [AuthService,jwtStrategy,RolesGuard],
})
export class AuthModule {}
