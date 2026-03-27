import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

/**
 * 核心 API Key 鉴权中间件
 * 支持未来替换为 OAuth 2.0 / JWT 校验
 */
export function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // stdio 模式本地直接通信，属于子进程调用，跳过 HTTP 鉴权
  if (env.TRANSPORT_MODE === 'stdio') {
    return next();
  }

  const apiKey = env.API_KEY;
  if (!apiKey) {
    logger.warn('Authentication skipped: API_KEY is not configured in environment.');
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!providedKey || providedKey !== apiKey) {
    logger.error('Authentication failed: Invalid API Key');
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Unauthorized: Invalid API Key',
      },
      id: null,
    });
    return;
  }

  // 鉴权通过，可以将用户信息挂载到 req 对象以供后续追踪
  next();
}
