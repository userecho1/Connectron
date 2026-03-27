import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { apiKeyAuthMiddleware } from '../auth/middleware';

export class NexusFlowServer {
  private server: Server;
  public app: express.Express; // 为 SSE/HTTP Transport 提供 express 承载实例

  // 保留一个 SSE transport 的引用，SSE 是有状态流
  private sseTransport: SSEServerTransport | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'NexusFlow',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      }
    );

    this.app = express();
    this.setupRoutes();
    this.registerHandlers();
  }

  private setupRoutes() {
    this.app.use(express.json());

    // Transport: SSE 
    // AI 客户端连接端点 (需鉴权)
    this.app.get('/sse', apiKeyAuthMiddleware, async (req, res) => {
      logger.info('New SSE connection established');
      this.sseTransport = new SSEServerTransport('/message', res);
      
      this.server.connect(this.sseTransport).catch(err => {
        logger.error('Failed to connect SSE transport', err);
      });

      req.on('close', () => {
        logger.info('SSE connection closed');
        this.sseTransport = null;
      });
    });

    // 接收客户端通过 HTTP POST 过来的 JSON-RPC 消息 (需鉴权)
    this.app.post('/message', apiKeyAuthMiddleware, async (req, res) => {
      if (!this.sseTransport) {
        res.status(400).send('No active SSE connection found. Please connect to /sse first.');
        return;
      }
      await this.sseTransport.handlePostMessage(req, res);
    });
  }

  private registerHandlers() {
    // ==== 工具与 Prompts 注册点 ====
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // TODO: 下一步将在这里由 DI 容器注入各类 Tools
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Tool executed: ${name}`, args);

      // TODO: 路由到对应的 UseCase
      throw new Error(`Unknown tool: ${name}`);
    });
  }

  /**
   * 启动服务器并挂载对应的 Transport 模式
   */
  public async start() {
    try {
      if (env.TRANSPORT_MODE === 'stdio') {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        logger.info('NexusFlow MCP Server running dynamically over STDIO.');
      } 
      else if (env.TRANSPORT_MODE === 'sse' || env.TRANSPORT_MODE === 'http') {
        const port = env.PORT;
        this.app.listen(port, () => {
          logger.info(`NexusFlow MCP Server HTTP/SSE listener started on port ${port}.`);
          logger.info(`-> Wait for SSE clients to connect via GET /sse`);
        });
      }
    } catch (error) {
      logger.error('Failed to start NexusFlow server', error);
      process.exit(1);
    }
  }
}
