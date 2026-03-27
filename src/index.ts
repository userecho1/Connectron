import 'reflect-metadata'; // 为后续接入 tsyringe 依赖注入做准备
import { NexusFlowServer } from './mcp/server';
import { logger } from './utils/logger';
import { env } from './config/env';

async function bootstrap() {
  logger.info(`Initializing NexusFlow (枢流中枢) MCP Server [Mode: ${env.NODE_ENV}]...`);

  // 1. 初始化依赖注入容器，将底层 Services 注入到 Application UseCases 中
  // TODO: setupDI()
  
  // 2. 初始化 MCP 服务层
  const server = new NexusFlowServer();
  
  // 3. 按照环境 Transport 配置启动服务
  await server.start();
  
  // 处理优雅退出
  process.on('SIGINT', async () => {
    logger.info('Shutting down NexusFlow MCP Server gracefully...');
    process.exit(0);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', reason, { promise });
  });
}

bootstrap().catch((error) => {
  logger.error('Bootstrap critical error:', error);
  process.exit(1);
});
