import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { logger } from '../../utils/logger';

const gitWriteToolNames = new Set<string>([
  'git_add',
  'git_commit',
  'git_push',
  'git_pull',
  'git_checkout',
]);

const mutatingToolNames = new Set<string>([
  // Git write operations
  ...gitWriteToolNames,
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
  // Workflow staged confirmation
  'workflow_confirm_execution_plan',
  // Workflow staged apply
  'workflow_apply_execution_plan',
  // Workflow staged command execution
  'workflow_execute_approved_commands',
]);

export class ApprovalContext {
  // Session approval context
  public gitAutoApprove: boolean = false;
}

export function isMutatingTool(toolName: string): boolean {
  return mutatingToolNames.has(toolName);
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        if ('text' in item && typeof (item as { text?: unknown }).text === 'string') {
          return (item as { text: string }).text;
        }
        return '';
      })
      .filter((text) => text.length > 0)
      .join('\n');
  }
  return JSON.stringify(content);
}

export async function enforceApprovalPolicy(server: Server, toolName: string, rawArgs: unknown, context: ApprovalContext): Promise<CallToolResult | null> {
  if (!mutatingToolNames.has(toolName)) {
    return null; // Not a protected tool, proceed
  }

  if (context.gitAutoApprove && gitWriteToolNames.has(toolName)) {
    logger.info(`[SECURITY] Bypassing Sampling for ${toolName} because gitAutoApprove is currently ON.`);
    return null;
  }

  logger.info(`[SECURITY] Initiating Sampling approval for tool: ${toolName}`);

  try {
    const messageResult = await server.createMessage({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `SECURITY ALERT: The agent wants to execute a mutating operation: '${toolName}' with arguments: ${JSON.stringify(rawArgs)}.\n\n` + 
                  `Before proceeding, ask the human user for explicit approval in the chat. Tell them EXACTLY what operation is being performed and ask them to reply with 'APPROVE' or 'DENY'.\n\n` +
                  `If the user grants approval, reply to this message strictly with the word "APPROVED". If they deny or say anything else, reply with "DENIED".`
          },
        },
      ],
      maxTokens: 50,
    });

    const responseText = extractTextFromContent(messageResult.content).trim().toUpperCase();
    
    if (responseText.includes('APPROVED')) {
      logger.info(`[SECURITY] Sampling approval was granted for ${toolName}.`);
      return null; // Let the execution proceed
    } else {
      logger.warn(`[SECURITY] Sampling approval DENIED for ${toolName}. LLM response: ${responseText}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Operation was DENIED by user approval via sampling.` }]
      };
    }
  } catch (error) {
    logger.error(`[SECURITY] Sampling approval request failed for ${toolName}`, error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Failed to request approval via sampling: ${error}` }]
    };
  }
}

export function listMutatingTools(): string[] {
  return Array.from(mutatingToolNames).sort();
}
