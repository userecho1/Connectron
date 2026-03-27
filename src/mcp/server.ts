import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { apiKeyAuthMiddleware } from '../auth/middleware';
import { ToolModule } from './tools/shared/ToolModule';
import { PromptModule } from './prompts/PromptModule';
import { ResourceModule } from './resources/ResourceModule';
import { enforceApprovalPolicy } from './security/approvalPolicy';

export class NexusFlowServer {
  private server: Server;
  public app: express.Express;

  // 保存 SSE transport 的引用
  private sseTransport: SSEServerTransport | null = null;
  private httpTransport: StreamableHTTPServerTransport | null = null;
  private readonly toolModules: readonly ToolModule[];
  private readonly promptModules: readonly PromptModule[];
  private readonly resourceModules: readonly ResourceModule[];

  constructor(
    toolModules: readonly ToolModule[] = [],
    promptModules: readonly PromptModule[] = [],
    resourceModules: readonly ResourceModule[] = [],
  ) {
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
    this.toolModules = toolModules;
    this.promptModules = promptModules;
    this.resourceModules = resourceModules;
    this.registerHandlers();
  }

  private registerHandlers() {
    // ==== 工具与 Prompts 注册点 ====
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolModules.flatMap((module) => [...module.listTools()]);

      return {
        tools,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Tool executed: ${name}`, args);

      try {
        enforceApprovalPolicy(name, args);

        for (const module of this.toolModules) {
          const toolResult = await module.callTool(name, args);
          if (toolResult) {
            return toolResult;
          }
        }

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
      } catch (error) {
        logger.error('Tool execution failed', error, { toolName: name });
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Tool execution failed',
            },
          ],
        };
      }
    });

    // ==== Prompts 注册点 ====
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = this.promptModules.flatMap((module) => [...module.listPrompts()]);
      return { prompts };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      for (const module of this.promptModules) {
        const result = await module.getPrompt(name, args);
        if (result) {
          return result;
        }
      }
      throw new Error(`Prompt not found: ${name}`);
    });

    // ==== Resources 注册点 ====
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = this.resourceModules.flatMap((module) => [...module.listResources()]);
      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      for (const module of this.resourceModules) {
        const contents = await module.readResource(uri);
        if (contents) {
          return { contents };
        }
      }

      throw new Error(`Resource not found: ${uri}`);
    });
  }

  private async mountStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Mounted [STDIO] transport.');
  }

  private mountSseRoutes(): void {
    this.app.get('/sse', apiKeyAuthMiddleware, async (req, res) => {
      try {
        logger.info('New SSE connection establishing...');
        this.sseTransport = new SSEServerTransport('/message', res);
        await this.server.connect(this.sseTransport);

        req.on('close', () => {
          logger.info('SSE connection closed');
          this.sseTransport = null;
        });
      } catch (error) {
        logger.error('Failed to establish SSE transport', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Failed to establish SSE transport' },
            id: null,
          });
        }
      }
    });

    this.app.post('/message', apiKeyAuthMiddleware, async (req, res) => {
      if (!this.sseTransport) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'No active SSE connection. Connect to /sse first.' },
          id: null,
        });
        return;
      }

      await this.sseTransport.handlePostMessage(req, res, req.body);
    });

    logger.info('Mounted [SSE] transport routes: GET /sse, POST /message.');
  }

  private async mountHttpTransportRoutes(): Promise<void> {
    this.httpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await this.server.connect(this.httpTransport);

    this.app.all('/mcp', apiKeyAuthMiddleware, async (req, res) => {
      try {
        if (!this.httpTransport) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'HTTP transport is not initialized' },
            id: null,
          });
          return;
        }

        await this.httpTransport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error('Failed to handle HTTP transport request', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    });

    logger.info('Mounted [HTTP] streamable transport route: ALL /mcp.');
  }

  /**
   * 统一封装 Transport 初始化与挂载
   * 根据 TRANSPORT_MODE 动态选择，避免 transport 逻辑散落
   */
  private async setupTransport(): Promise<void> {
    const mode = env.TRANSPORT_MODE;

    if (mode === 'stdio') {
      await this.mountStdioTransport();
      return;
    }

    this.app.use(express.json());

    if (mode === 'sse') {
      this.mountSseRoutes();
      return;
    }

    if (mode === 'http') {
      await this.mountHttpTransportRoutes();
      return;
    }

    throw new Error(`Unsupported TRANSPORT_MODE: ${mode}`);
  }

  /**
   * 启动服务器
   */
  public async start() {
    try {
      // 1. 初始化对应 Transport
      await this.setupTransport();

      // 2. 对于 Web 协议，启动 Express 监听
      if (env.TRANSPORT_MODE === 'sse' || env.TRANSPORT_MODE === 'http') {
        const port = env.PORT;
        this.app.listen(port, () => {
          logger.info(`NexusFlow MCP Server listening on port ${port} via [${env.TRANSPORT_MODE.toUpperCase()}] mode.`);
          if (env.TRANSPORT_MODE === 'sse') {
            logger.info('-> Wait for clients to connect via GET /sse');
          }
        });
      }
    } catch (error) {
      logger.error('Failed to start NexusFlow server', error);
      process.exit(1);
    }
  }
}
