import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  // Log message strictly masking secrets/credentials
  console.log(`[QueueLess India] Backend core initialized on port ${port}`);
}

bootstrap();
