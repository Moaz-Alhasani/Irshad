import { Module } from '@nestjs/common';
import Redis from 'ioredis';

@Module({
        providers: [
        {
        provide: 'REDIS_CLIENT',
        useFactory: () => {
            return new Redis({
            host: '127.0.0.1', 
            port: 6379,
            });
        },
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
