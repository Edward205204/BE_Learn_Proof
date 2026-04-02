import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import envConfig from './shared/config'
import { configSwagger } from './shared/utils/swagger.config'
import { SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const document = SwaggerModule.createDocument(app, configSwagger)

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
  app.enableCors({ origin: envConfig.FE_URL, credentials: true })
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
