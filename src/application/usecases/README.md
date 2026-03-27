# UseCases 目录规范（简版）

## 目标

统一 UseCase 的放置规则，降低后续扩展和维护成本。

## 当前分组

- database
- git
- github
- jira
- workflow
- java-analysis
- capability-extractor
- tool-generator
- domain-mcp-generator

## 命名规则

1. 目录统一使用小写与连字符风格（kebab-case）。
2. 单词域名可直接使用单词（如 git、jira、workflow）。
3. 复合域名使用连字符（如 java-analysis、tool-generator）。

## 结构规则

1. 每个域必须有 index.ts。
2. 有读写区分时，使用 query/command 子目录。
3. 只有只读能力的域可仅保留 query（如 database 当前仅 query）。
4. workflow 统一放 command（编排本质是动作执行）。

## 文件规则

1. 文件名采用 UseCase 后缀，例如 CreateTicketUseCase.ts。
2. 一个文件只放一个 UseCase 类。
3. 输入输出类型优先放在接口层（application/interfaces）。

## 新增能力放置指引

1. Java 项目分析：java-analysis/query。
2. 能力抽取：capability-extractor/query。
3. 工具生成：tool-generator/command。
4. Domain MCP 生成：domain-mcp-generator/command。
5. 跨域编排：workflow/command。

## 引用建议

1. 外部调用优先从域 index.ts 导入。
2. 避免跨域直接引用深层实现文件。
3. 保持依赖方向：UseCase -> Interface，不反向依赖基础设施实现。
