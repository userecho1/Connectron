# Monolith Evolution Validation Checklist

This document defines validation checks for Connectron monolith-evolution tools.

## Scope

- analyze_java_project
- extract_capabilities
- generate_mcp_tool (dry-run)
- domain_mcp_generator (manual trigger, dry-run)
- workflow_execute_monolith_evolution (orchestration)

## Approval Policy

All mutating operations require explicit user approval by passing confirm=true.

- Git write operations: git_add, git_commit, git_push, git_pull, git_checkout
- GitHub write operations: create_or_update_file, create_pull_request, merge_pull_request
- Jira write operations: create_ticket, add_jira_comment, transition_jira_issue, update_jira_issue_fields, workflow_execute_jira_story

Read-only operations do not require confirm.

## A. analyze_java_project

1. Response contains structuredContent.report.
2. structuredContent.generated_tools includes analyze_java_project.
3. report contains required fields:
   - modules (array)
   - api_list (array)
   - services (array)
   - entities (array)
   - database_tables (array)
   - dependencies (array)
   - bounded_context_hints (array)
   - scanned_files (number)
   - warnings (array)
4. scanned_files is >= 0.
5. content[0].type is text.

## B. extract_capabilities

1. Response contains structuredContent.result.
2. structuredContent.generated_tools includes extract_capabilities.
3. result.capabilities is an array.
4. Every capability includes:
   - name (snake_case suggested regex: ^[a-z]+(_[a-z0-9]+)+$)
   - description
   - source object
   - input_schema.type equals object
   - bounded_context is not empty
5. result.conflicts and result.bounded_contexts are arrays.

## C. generate_mcp_tool (dry-run)

1. structuredContent.dry_run_plan.dry_run is true.
2. structuredContent.generated_tools includes generate_mcp_tool.
3. dry_run_plan.tool_name is not empty.
4. dry_run_plan.files is array and each item has:
   - path
   - action (create or update)
   - content_preview
5. dry_run_plan.registration_patch is string.
6. dry_run_plan.warnings is array.
7. No real file generation should happen from this tool.

## D. domain_mcp_generator

1. confirm != true should return error.
2. confirm == true should return:
   - structuredContent.dry_run_plan.dry_run is true
   - structuredContent.generated_tools includes domain_mcp_generator
   - dry_run_plan.generated_servers is array
3. Every generated server includes:
   - domain
   - server_name
   - capabilities array
   - files array (each action is create)
4. skipped_capabilities and warnings are arrays.

## E. workflow_execute_monolith_evolution

1. structuredContent.generated_tools includes workflow_execute_monolith_evolution.
2. structuredContent.workflow_result exists.
3. workflow_result includes:
   - architecture
   - capabilities
   - generatedToolPlans (array)
   - gitPlan with branch, commitMessageTemplate, prTitle, prDescriptionTemplate
4. If runDomainGenerator=true, workflow_result.domainPlan exists.
5. If issueKey provided, workflow_result.jiraPlan.issueKey equals input issueKey.

## F. Unified Audit Fields

All new tools must include these structuredContent fields:

- analysis (string)
- plan (array)
- generated_code (array)
- generated_tools (array)
- next_step (string)

## G. Regression Checks

1. Existing tools remain discoverable:
   - git_status
   - query_database
   - search_jira_issues
   - list_pull_requests
2. TypeScript compile passes: npx tsc --noEmit
3. registerToolModules remains graceful-degradation safe.

## Quick Test Input Templates

### 1) analyze_java_project

```json
{
  "projectRoot": "D:/repos/sample-spring-monolith",
  "scanDepth": 8,
  "includePackages": ["com.company.order"]
}
```

### 2) extract_capabilities

```json
{
  "report": {
    "modules": ["com.company.order"],
    "api_list": [],
    "services": [],
    "entities": [],
    "database_tables": [],
    "dependencies": [],
    "bounded_context_hints": ["order-domain"],
    "scanned_files": 0,
    "warnings": []
  }
}
```

### 3) generate_mcp_tool

```json
{
  "service_method": "OrderService.createOrder",
  "api_endpoint": "POST /orders",
  "description": "Create a new order",
  "tool_name": "create_order"
}
```

### 4) domain_mcp_generator

```json
{
  "report": {
    "modules": ["com.company.order"],
    "api_list": [],
    "services": [],
    "entities": [],
    "database_tables": [],
    "dependencies": [],
    "bounded_context_hints": ["order-domain"],
    "scanned_files": 0,
    "warnings": []
  },
  "capabilities": [
    {
      "name": "create_order",
      "description": "Create Order",
      "source": {"serviceMethod": "OrderService.createOrder"},
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      },
      "bounded_context": "order_domain"
    }
  ],
  "confirm": true
}
```

### 5) workflow_execute_monolith_evolution

```json
{
  "projectRoot": "D:/repos/sample-spring-monolith",
  "scanDepth": 8,
  "includePackages": ["com.company.order"],
  "capabilityLimit": 5,
  "issueKey": "ABC-123",
  "branchName": "feature_abc-123_order-evolution",
  "runDomainGenerator": true
}
```
