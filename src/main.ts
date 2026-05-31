import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean)

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))

  const config = new DocumentBuilder()
    .setTitle('BizSpot API')
    .setDescription('Business location viability analysis for the Ukrainian market')
    .setVersion('1.0')
    .build()
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config))

  await app.listen(process.env.PORT ?? 3030)
}
bootstrap()
