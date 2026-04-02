import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import envConfig from './shared/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: envConfig.FE_URL, credentials: true })

  // ─── Swagger Configuration ────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('LearnProof – E-learning Platform')
    .setDescription('Tài liệu API đầy đủ cho hệ thống LearnProof (Blockchain & AI)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập Access Token vào đây (lấy từ response của /auth/login)',
        in: 'header',
      },
      'access-token', // key dùng trong @ApiBearerAuth()
    )
    .build()

  const document = SwaggerModule.createDocument(app, config)

  // Truy cập tại: http://localhost:3000/api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Giữ token sau khi F5 trang
    },
  })
  // ─────────────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()
