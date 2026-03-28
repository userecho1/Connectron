# Connectron 启动指南

本文档包含了在 Windows PowerShell 中启动 Connectron 服务器的命令。根据您需要使用的传输模式，选择对应的命令执行。

---

## 🚀 SSE 模式启动命令

使用 SSE (Server-Sent Events) 模式启动时的命令：

```powershell
$env:TRANSPORT_MODE="sse"
$env:NODE_ENV="development"
$env:API_KEY="your_dev_api_key"
$env:DB_HOST="localhost"
$env:DB_PORT="1433"
$env:DB_USER="your_db_user"
$env:DB_PASS="your_db_password"
$env:DB_NAME="your_db_name"
$env:GITHUB_TOKEN="your_github_token"
$env:GIT_REPO_ROOT="D:/file/nodeproject/test-connectron"
$env:JIRA_HOST="your_domain.atlassian.net"
$env:JIRA_EMAIL="your_email@example.com"
$env:JIRA_API_TOKEN="your_jira_api_token"

node D:/file/nodeproject/Connectron/dist/index.js
```

## 🌐 HTTP 模式启动命令

使用常规 HTTP 模式启动时的命令：

```powershell
$env:TRANSPORT_MODE="http"
$env:NODE_ENV="development"
$env:API_KEY="your_dev_api_key"
$env:DB_HOST="localhost"
$env:DB_PORT="1433"
$env:DB_USER="your_db_user"
$env:DB_PASS="your_db_password"
$env:DB_NAME="your_db_name"
$env:GITHUB_TOKEN="your_github_token"
$env:GIT_REPO_ROOT="D:/file/nodeproject/test-connectron"
$env:JIRA_HOST="your_domain.atlassian.net"
$env:JIRA_EMAIL="your_email@example.com"
$env:JIRA_API_TOKEN="your_jira_api_token"

node D:/file/nodeproject/Connectron/dist/index.js
```

> **💡 提示**: 在执行命令前，请确保将其中的占位符（如 `your_dev_api_key`、`your_db_password` 等）替换为您本地真实的配置。