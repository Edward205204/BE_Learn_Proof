import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import envConfig from './shared/config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: envConfig.FE_URL, credentials: true })
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
