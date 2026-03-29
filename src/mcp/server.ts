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
import crypto from 'crypto';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { apiKeyAuthMiddleware } from '../auth/middleware';
import { ToolModule } from './tools/shared/ToolModule';
import { PromptModule } from './prompts/PromptModule';
import { ResourceModule } from './resources/ResourceModule';
import { enforceApprovalPolicy, ApprovalContext, isMutatingTool } from './security/approvalPolicy';

export class NexusFlowServer {
  public app: express.Express;

  // 保存 SSE session transport 的引用, Key 为 SessionId
  private sseSessions = new Map<string, SSEServerTransport>();
  private httpTransport: StreamableHTTPServerTransport | null = null;

  constructor(
    private readonly toolModulesFactory: (context: ApprovalContext) => ToolModule[],
    private readonly promptModulesFactory: () => PromptModule[],
    private readonly resourceModulesFactory: () => ResourceModule[],
  ) {
    this.app = express();
  }

  /**
   * 为每个新的连接/客户端动态创建一个隔离的 Server 和对应的模块
   */
  private createSessionServer(): Server {
    const serverHandler = new Server(
      { name: 'NexusFlow', version: '1.0.0' },
      { capabilities: { tools: {}, prompts: {}, resources: {} } }
    );

    // 对于每个会话，都提供一个独属于它自己的 ApprovalContext 配置
    const approvalContext = new ApprovalContext();
    const tools = this.toolModulesFactory(approvalContext);
    const prompts = this.promptModulesFactory();
    const resources = this.resourceModulesFactory();

    // 绑定上下文
    for (const module of tools) {
      if (module.setServer) {
        module.setServer(serverHandler);
      }
    }

    serverHandler.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: tools.flatMap(module => [...module.listTools()]) };
    });

    serverHandler.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Tool executed: ${name}`, args);

      try {
        const argsForTool = args ? { ...args } : {};
        // If the approval policy returns a result, it means it intercepted the call
        const policyResult = await enforceApprovalPolicy(serverHandler, name, argsForTool, approvalContext);
        if (policyResult) return policyResult;

        for (const module of tools) {
          const toolResult = await module.callTool(name, argsForTool);
          if (toolResult) return toolResult;
        }

        return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
      } catch (error) {
        logger.error('Tool execution failed', error, { toolName: name });
        return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Tool execution failed' }] };
      }
    });

    serverHandler.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: prompts.flatMap((module) => [...module.listPrompts()]) };
    });

    serverHandler.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      for (const module of prompts) {
        const result = await module.getPrompt(name, args);
        if (result) return result;
      }
      throw new Error(`Prompt not found: ${name}`);
    });

    serverHandler.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: resources.flatMap((module) => [...module.listResources()]) };
    });

    serverHandler.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      for (const module of resources) {
        const contents = await module.readResource(uri);
        if (contents) return { contents };
      }
      throw new Error(`Resource not found: ${uri}`);
    });

    return serverHandler;
  }

  private async mountStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();
    const sessionServer = this.createSessionServer();
    await sessionServer.connect(transport);
    logger.info('Mounted [STDIO] transport.');
  }

  private mountSseRoutes(): void {
    this.app.get('/sse', apiKeyAuthMiddleware, async (req, res) => {
      try {
        logger.info('New SSE connection establishing...');
        const transport = new SSEServerTransport('/message', res);
        const sessionServer = this.createSessionServer();
        
        await sessionServer.connect(transport);
        
        this.sseSessions.set(transport.sessionId, transport);

        req.on('close', () => {
          logger.info(`SSE connection closed for session: ${transport.sessionId}`);
          this.sseSessions.delete(transport.sessionId);
        });
      } catch (error) {
        logger.error('Failed to establish SSE transport', error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Failed to establish SSE transport' }, id: null });
        }
      }
    });

    this.app.post('/message', apiKeyAuthMiddleware, async (req, res) => {
      // 从 query 参数中获取 sessionId，SSEServerTransport 创建的客户端会自动携带这个参数
      const sessionId = req.query.sessionId as string;
      const transport = this.sseSessions.get(sessionId);

      if (!transport) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'No active SSE connection for this sessionId. Connect to /sse first.' }, id: null });
        return;
      }

      await transport.handlePostMessage(req, res, req.body);
    });

    logger.info('Mounted [SSE] transport routes: GET /sse, POST /message.');
  }

  private async mountHttpTransportRoutes(): Promise<void> {
    const sessionServer = this.createSessionServer();
    this.httpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    
    await sessionServer.connect(this.httpTransport);

    this.app.all('/mcp', apiKeyAuthMiddleware, async (req, res) => {
      try {
        if (!this.httpTransport) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'HTTP transport not initialized' }, id: null });
          return;
        }
        await this.httpTransport.handleRequest(req, res, req.body);
      } catch (error) {
        logger.error('Failed to handle HTTP transport request', error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
        }
      }
    });

    logger.info('Mounted [HTTP] streamable transport route: ALL /mcp.');
  }

  public async start(): Promise<void> {
    const mode = env.TRANSPORT_MODE;

    if (mode === 'stdio') {
      await this.mountStdioTransport();
      return;
    }

    this.app.use(express.json({ limit: '10mb' }));

    if (mode === 'sse') {
      this.mountSseRoutes();
    } else if (mode === 'http') {
      await this.mountHttpTransportRoutes();
    } else {
      logger.error(`Unknown transport mode: ${mode}`);
      process.exit(1);
    }

    const port = env.PORT;
    this.app.listen(port, () => {
      logger.info(`NexusFlow HTTP Server listening on port ${port} [Mode: ${mode}]`);
    });
  }
}

