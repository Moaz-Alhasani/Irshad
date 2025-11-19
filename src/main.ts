import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);
  app.use(helmet());
  app.use(cookieParser());

  // ✅ تفعيل CORS للسماح للواجهة الأمامية بالوصول
  app.enableCors({
    origin: ['http://localhost:3001',"http://localhost:3000",'http://192.168.1.9:3001',"http://192.168.1.9:3000","http://192.168.1.5:3000","http://192.168.1.5:3000"], // أو استخدم مصفوفة للسماح بعدة مصادر
    credentials: true, // للسماح بإرسال الكوكيز
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true,
      forbidNonWhitelisted:true,
      transform:true,
      disableErrorMessages:false
    })
  )
  // await app.listen(process.env.PORT ?? 3000 , host); 
  // await app.listen(process.env.PORT ?? 3000 );
    await app.listen(process.env.PORT ?? 3000, '0.0.0.0');


}
bootstrap(); 
