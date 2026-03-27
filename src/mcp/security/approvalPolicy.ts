const mutatingToolNames = new Set<string>([
  // Git write operations
  'git_add',
  'git_commit',
  'git_push',
  'git_pull',
  'git_checkout',
  // GitHub write operations
  'create_or_update_file',
  'create_pull_request',
  'merge_pull_request',
  // Jira write operations
  'create_ticket',
  'add_jira_comment',
  'transition_jira_issue',
  'update_jira_issue_fields',
  'workflow_execute_jira_story',
  // Domain generation manual trigger
  'domain_mcp_generator',
]);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function enforceApprovalPolicy(toolName: string, rawArgs: unknown): void {
  if (!mutatingToolNames.has(toolName)) {
    return;
  }

  if (!isObjectRecord(rawArgs) || rawArgs.confirm !== true) {
    throw new Error(
      `Tool ${toolName} requires explicit approval. Pass confirm=true to execute mutating operations.`,
    );
  }
}

export function listMutatingTools(): string[] {
  return Array.from(mutatingToolNames).sort();
}
