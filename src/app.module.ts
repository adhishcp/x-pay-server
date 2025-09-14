import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './v1/auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10,  // 10 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
