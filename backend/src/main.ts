import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SanitizeLogsInterceptor } from './common/interceptors/sanitize-logs.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  
  // Apply DPDP log and payload sanitization interceptor globally
  app.useGlobalInterceptors(new SanitizeLogsInterceptor());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[QueueLess India] Backend core initialized on port ${port}`);
}

bootstrap();
