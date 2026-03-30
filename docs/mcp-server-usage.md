# Connectron MCP Server 使用说明

本文档包含：
- 启动与构建命令
- MCP 客户端 JSON 配置示例
- 全量环境变量说明

## 1. 快速启动

在项目根目录执行：

~~~powershell
npm install
npm run build
npm run start
~~~

开发模式（不先编译，直接运行 TypeScript）：

~~~powershell
npm run dev
~~~

说明：
- npm build 不是本项目命令
- 请使用 npm run build

## 2. 推荐运行模式

### 模式 A：stdio（本地集成推荐）

.env 示例：

~~~dotenv
NODE_ENV=development
TRANSPORT_MODE=stdio
PORT=3000
API_KEY=your_dev_api_key
~~~

说明：
- stdio 模式下，MCP Host 通过子进程与服务通信
- stdio 模式会跳过 HTTP 鉴权中间件
- PORT 在 stdio 模式下不会对外监听端口

### 模式 B：sse（远程或跨进程调试）

.env 示例：

~~~dotenv
NODE_ENV=development
TRANSPORT_MODE=sse
PORT=3000
API_KEY=replace_with_real_secret
~~~

服务端路由：
- GET /sse
- POST /message

鉴权：
- 当配置了 API_KEY 时，需要在请求中携带 x-api-key 或 apiKey

### 模式 C：http（Streamable HTTP）

.env 示例：

~~~dotenv
NODE_ENV=development
TRANSPORT_MODE=http
PORT=3000
API_KEY=replace_with_real_secret
~~~

服务端路由：
- ALL /mcp

鉴权：
- 当配置了 API_KEY 时，需要在请求中携带 x-api-key 或 apiKey

## 3. MCP JSON 配置示例

不同 MCP Host 的字段名可能不同。下面给出常见写法，你可以按使用的客户端微调。

### 3.1 本地 stdio（常见 mcpServers 写法）

~~~json
{
  "mcpServers": {
    "connectron": {
      "command": "node",
      "args": ["D:/file/nodeproject/Connectron/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "TRANSPORT_MODE": "stdio",
        "API_KEY": "your_dev_api_key",
        "DB_HOST": "localhost",
        "DB_PORT": "1433",
        "DB_USER": "your_db_user",
        "DB_PASS": "your_db_password",
        "DB_NAME": "your_db_name",
        "GITHUB_TOKEN": "your_github_token",
        "GIT_REPO_ROOT": "D:/file/nodeproject/Connectron",
        "JIRA_HOST": "your_domain.atlassian.net",
        "JIRA_EMAIL": "your_email@example.com",
        "JIRA_API_TOKEN": "your_jira_api_token"
      }
    }
  }
}
~~~

注意：
- 如果你在运行前没有 npm run build，请把 args 改为 ts-node 方式
- 例如 command 用 npx，args 用 ["ts-node", "src/index.ts"]

### 3.2 SSE 客户端配置示例

~~~json
{
  "server": {
    "type": "sse",
    "url": "http://127.0.0.1:3000/sse",
    "messageUrl": "http://127.0.0.1:3000/message",
    "headers": {
      "x-api-key": "replace_with_real_secret"
    }
  }
}
~~~

### 3.3 HTTP 客户端配置示例

~~~json
{
  "server": {
    "type": "http",
    "url": "http://127.0.0.1:3000/mcp",
    "headers": {
      "x-api-key": "replace_with_real_secret"
    }
  }
}
~~~

## 4. 环境变量清单

必填程度说明：
- 必填：建议始终设置
- 可选：按你是否使用对应能力来设置

### 基础运行
- NODE_ENV（必填）
  - 可选值：development, production, test
  - 默认值：development
- TRANSPORT_MODE（必填）
  - 可选值：stdio, sse, http
  - 默认值：stdio
- PORT（sse/http 建议必填）
  - 默认值：3000

### 安全
- API_KEY（可选，sse/http 强烈建议填写）
  - 未配置时，sse/http 会跳过鉴权
  - 已配置时，请求必须提供 x-api-key 或 apiKey

### Database（使用数据库工具时填写）
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASS
- DB_NAME

数据库工具说明：
- `query_database`：执行只读 SQL 查询（SELECT 类）。
- `format_sqlserver_sql`：仅调整 SQL 的空格、缩进、换行，并可选写入文件（`outputPath`）。
- `format_sqlserver_sql` 可选参数：`formatSqlInStringLiterals=true`，会尝试格式化字符串字面量中的 SQL（例如 `DECLARE @s='SELECT ...'`）。
- 当 `formatSqlInStringLiterals=true` 时，可用 `stringLiteralSqlIndentSize` 控制字符串内 SQL 的额外缩进（默认 `2`）。

### GitHub（使用 GitHub 工具时填写）
- GITHUB_TOKEN

### Git（使用本地仓库工具时推荐填写）
- GIT_REPO_ROOT
  - 示例：D:/file/nodeproject/Connectron

### Jira（使用 Jira 工具时填写）
- JIRA_HOST
- JIRA_EMAIL
- JIRA_API_TOKEN

## 5. 常见问题

### 5.1 Missing script: build
原因：package.json 没有 scripts.build 或命令写成 npm build。

解决：
- 使用 npm run build

### 5.2 启动后无法通过 HTTP/SSE 访问
排查顺序：
1. 检查 TRANSPORT_MODE 是否为 sse 或 http
2. 检查 PORT 是否被占用
3. 检查 API_KEY 是否一致
4. 检查路由是否正确（sse 用 /sse + /message，http 用 /mcp）
