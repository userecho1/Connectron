import 'reflect-metadata'; // 为后续接入 tsyringe 依赖注入做准备
import { logger } from './utils/logger';
import { env } from './config/env';
import { createServer } from './bootstrap/createServer';

function setupProcessHandlers(): void {
  process.on('SIGINT', () => {
    logger.info('Shutting down NexusFlow MCP Server gracefully...');
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', reason, { promise });
  });
}

async function bootstrap() {
  logger.info(`Initializing NexusFlow (枢流中枢) MCP Server [Mode: ${env.NODE_ENV}]...`);
  
  // 1. 通过工厂创建并注入服务器依赖
  const server = createServer();
  
  // 2. 按照环境 Transport 配置启动服务
  await server.start();
}

async function main(): Promise<void> {
  // 1. 先装好安全气囊
  setupProcessHandlers();

  // 2. 再启动业务
  try {
    await bootstrap();
  } catch (error) {
    logger.error('Bootstrap critical error:', error);
    process.exit(1);
  }
}

void main();
