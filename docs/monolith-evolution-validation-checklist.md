# Connectron 演进验证清单（简版）

## 1. 目标

这份文档用于快速验证 Java Monolith -> MCP 演进链路是否可用。

使用与接入配置请参考：
- docs/mcp-server-usage.md

覆盖工具：
- analyze_java_project
- extract_capabilities
- generate_mcp_tool（仅预览）
- domain_mcp_generator（人工触发，仅预览）
- workflow_execute_monolith_evolution

## 2. 审批规则（必须）

所有写操作都要显式传入 confirm=true。

写操作包括：
- Git：git_add, git_commit, git_push, git_pull, git_checkout
- GitHub：create_or_update_file, create_pull_request, merge_pull_request
- Jira：create_ticket, add_jira_comment, transition_jira_issue, update_jira_issue_fields, workflow_execute_jira_story

说明：
- 工具层会校验 confirm=true
- 服务端总入口也会二次校验
- 只读操作不需要 confirm

## 3. 建议执行顺序

1. analyze_java_project
2. extract_capabilities
3. generate_mcp_tool（先看预览）
4. domain_mcp_generator（confirm=true，仍是预览）
5. workflow_execute_monolith_evolution（端到端预演）

## 4. 最小验收点

### analyze_java_project
- 返回 report
- report 包含 modules / api_list / services / entities / scanned_files

### extract_capabilities
- 返回 capabilities 数组
- 每项有 name、description、source、input_schema、bounded_context

### generate_mcp_tool
- dry_run=true
- 返回 files、registration_patch、warnings
- 不应实际改文件

### domain_mcp_generator
- 未传 confirm=true 时应拒绝
- 传 confirm=true 后返回 generated_servers
- 仍应是 dry_run=true

### workflow_execute_monolith_evolution
- 返回 architecture、capabilities、generatedToolPlans、gitPlan
- runDomainGenerator=true 时应返回 domainPlan

## 5. 回归检查

- 旧能力仍可用：git_status、query_database、search_jira_issues、list_pull_requests
- 编译通过：npx tsc --noEmit
