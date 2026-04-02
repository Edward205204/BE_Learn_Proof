import { DocumentBuilder } from '@nestjs/swagger'

export const configSwagger = new DocumentBuilder()
  .setTitle('Learn Proof API')
  .setDescription('API for Learn Proof')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      in: 'header',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'access-token',
  )
  .build()
