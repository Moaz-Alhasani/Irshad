import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);
  
  // شو وضع الامان
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: { policy: "unsafe-none" },
  }));
  app.use(cookieParser());

  // ✅ تفعيل CORS للسماح للواجهة الأمامية بالوصول
  app.enableCors({
    origin: "*", // أو استخدم مصفوفة للسماح بعدة مصادر
    credentials: true, // للسماح بإرسال الكوكيز
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization','Accept'],
  });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true,
      forbidNonWhitelisted:true,
      transform:true,
      disableErrorMessages:false
    })
  )

    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  
  // await app.listen(process.env.PORT ?? 3000 , host); 
  // await app.listen(process.env.PORT ?? 3000 );
    await app.listen(process.env.PORT ?? 3000, '0.0.0.0');


}
bootstrap(); 
