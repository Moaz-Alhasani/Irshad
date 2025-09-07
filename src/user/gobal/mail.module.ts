import { Module } from '@nestjs/common';
import { MailService } from './MailService';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}