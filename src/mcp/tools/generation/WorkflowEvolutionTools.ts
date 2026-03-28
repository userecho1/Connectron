import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule.js';
import { WorkflowExecuteMonolithEvolutionUseCase } from '../../../application/usecases/workflow/index.js';
import { executionPlanStore, WorkflowExecutionPlan } from './ExecutionPlanStore.js';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

export const WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME = 'workflow_execute_monolith_evolution';
export const WORKFLOW_PREPARE_EXECUTION_PLAN_TOOL_NAME = 'workflow_prepare_execution_plan';
export const WORKFLOW_REVIEW_EXECUTION_PLAN_TOOL_NAME = 'workflow_review_execution_plan';
export const WORKFLOW_CONFIRM_EXECUTION_PLAN_TOOL_NAME = 'workflow_confirm_execution_plan';
export const WORKFLOW_APPLY_EXECUTION_PLAN_TOOL_NAME = 'workflow_apply_execution_plan';
export const WORKFLOW_EXECUTE_APPROVED_COMMANDS_TOOL_NAME = 'workflow_execute_approved_commands';

const exec = promisify(execCallback);

const workflowInputSchema = z
  .object({
    projectRoot: z.string().min(1).describe('Root path of Java monolith project to analyze.'),
    scanDepth: z.number().int().min(1).max(20).optional(),
    includePackages: z.array(z.string().min(1)).optional(),
    excludePackages: z.array(z.string().min(1)).optional(),
    capabilityLimit: z.number().int().min(1).max(50).optional(),
    issueKey: z.string().optional().describe('Optional Jira issue key for commit and Jira plan templates.'),
    branchName: z.string().optional().describe('Optional branch name override.'),
    runDomainGenerator: z.boolean().optional().describe('Set true to include domain_mcp_generator dry-run output.'),
  })
  .strict();

const reviewExecutionPlanInputSchema = z
  .object({
    planId: z.string().min(1).describe('Execution plan id returned by workflow_prepare_execution_plan.'),
  })
  .strict();

const confirmExecutionPlanInputSchema = z
  .object({
    planId: z.string().min(1).describe('Execution plan id returned by workflow_prepare_execution_plan.'),
    keptFilePaths: z.array(z.string().min(1)).default([]).describe('Selected files to keep for code generation.'),
    approveCommands: z.boolean().default(false).describe('Set true to approve the generated command list.'),
    confirm: z.literal(true).describe('Must be true to confirm this staged plan.'),
  })
  .strict();

const applyExecutionPlanInputSchema = z
  .object({
    planId: z.string().min(1).describe('Execution plan id returned by workflow_prepare_execution_plan.'),
    confirm: z.literal(true).describe('Must be true to apply file changes to the workspace.'),
  })
  .strict();

const executeApprovedCommandsInputSchema = z
  .object({
    planId: z.string().min(1).describe('Execution plan id returned by workflow_prepare_execution_plan.'),
    confirm: z.literal(true).describe('Must be true to execute approved commands.'),
  })
  .strict();

function extractPlannedFilePaths(plan: WorkflowExecutionPlan): string[] {
  const generatedToolPlans = plan.workflowResult.generatedToolPlans as Array<Record<string, unknown>>;
  const filePaths: string[] = [];

  for (const toolPlan of generatedToolPlans) {
    const files = Array.isArray(toolPlan.files) ? (toolPlan.files as Array<Record<string, unknown>>) : [];
    for (const file of files) {
      const path = typeof file.path === 'string' ? file.path : null;
      if (path) {
        filePaths.push(path);
      }
    }
  }

  return [...new Set(filePaths)];
}

function buildSuggestedCommands(plan: WorkflowExecutionPlan): string[] {
  const gitPlan = plan.workflowResult.gitPlan;
  const commands: string[] = [
    `git checkout -b ${gitPlan.branch}`,
    'git add .',
    `git commit -m "${gitPlan.commitMessageTemplate.replace(/"/g, '\\"')}"`,
    `git push origin ${gitPlan.branch}`,
  ];

  return commands;
}

function formatPlanSummary(plan: WorkflowExecutionPlan): string {
  const generatedToolPlans = plan.workflowResult.generatedToolPlans;
  const filePaths = extractPlannedFilePaths(plan);
  const commands = buildSuggestedCommands(plan);

  const lines = [
    '# Workflow Execution Plan',
    '',
    `- Plan ID: ${plan.id}`,
    `- Status: ${plan.status}`,
    `- Created At: ${plan.createdAt}`,
    `- Updated At: ${plan.updatedAt}`,
    `- Tool Plans: ${generatedToolPlans.length}`,
    `- Candidate Files: ${filePaths.length}`,
    `- Suggested Commands: ${commands.length}`,
    `- Commands Approved: ${plan.commandApproval}`,
    '',
    '## Candidate Files',
    ...(filePaths.length > 0 ? filePaths.map((path) => `- ${path}`) : ['- (none)']),
    '',
    '## Suggested Commands',
    ...commands.map((command, index) => `${index + 1}. ${command}`),
  ];

  return lines.join('\n');
}

type PlannedFile = {
  path: string;
  action: 'create' | 'update';
  content_preview: string;
};

function collectPlannedFiles(plan: WorkflowExecutionPlan): PlannedFile[] {
  const generatedToolPlans = plan.workflowResult.generatedToolPlans as Array<Record<string, unknown>>;
  const files: PlannedFile[] = [];

  for (const toolPlan of generatedToolPlans) {
    const plannedFiles = Array.isArray(toolPlan.files) ? (toolPlan.files as Array<Record<string, unknown>>) : [];
    for (const file of plannedFiles) {
      const pathValue = typeof file.path === 'string' ? file.path : null;
      const actionValue = file.action === 'update' ? 'update' : 'create';
      const contentValue = typeof file.content_preview === 'string' ? file.content_preview : null;
      if (pathValue && contentValue !== null) {
        files.push({ path: pathValue, action: actionValue, content_preview: contentValue });
      }
    }
  }

  return files;
}

function isAllowedCommand(command: string): boolean {
  const allowedPrefixes = ['git checkout', 'git add', 'git commit', 'git push'];
  return allowedPrefixes.some((prefix) => command.startsWith(prefix));
}

function trimCommandOutput(value: string, limit = 4000): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}...`;
}

export class WorkflowEvolutionTools implements ToolModule {
  constructor(private readonly workflowExecuteMonolithEvolutionUseCase: WorkflowExecuteMonolithEvolutionUseCase) {}

  listTools(): readonly Tool[] {
    return [
      {
        name: WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME,
        description:
          'Execute end-to-end dry-run workflow for monolith evolution: analyze, extract, generate tool plans, and optional domain plans.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: { type: 'string', description: 'Root path of Java monolith project to analyze.' },
            scanDepth: { type: 'number', minimum: 1, maximum: 20 },
            includePackages: { type: 'array', items: { type: 'string' } },
            excludePackages: { type: 'array', items: { type: 'string' } },
            capabilityLimit: { type: 'number', minimum: 1, maximum: 50 },
            issueKey: { type: 'string' },
            branchName: { type: 'string' },
            runDomainGenerator: { type: 'boolean' },
          },
          required: ['projectRoot'],
          additionalProperties: false,
        },
      },
      {
        name: WORKFLOW_PREPARE_EXECUTION_PLAN_TOOL_NAME,
        description:
          'Generate a staged execution plan (dry-run) with candidate files and suggested commands for manual keep/confirm flow.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: { type: 'string', description: 'Root path of Java monolith project to analyze.' },
            scanDepth: { type: 'number', minimum: 1, maximum: 20 },
            includePackages: { type: 'array', items: { type: 'string' } },
            excludePackages: { type: 'array', items: { type: 'string' } },
            capabilityLimit: { type: 'number', minimum: 1, maximum: 50 },
            issueKey: { type: 'string' },
            branchName: { type: 'string' },
            runDomainGenerator: { type: 'boolean' },
          },
          required: ['projectRoot'],
          additionalProperties: false,
        },
      },
      {
        name: WORKFLOW_REVIEW_EXECUTION_PLAN_TOOL_NAME,
        description: 'Review a staged execution plan in a human-friendly format.',
        inputSchema: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Execution plan id.' },
          },
          required: ['planId'],
          additionalProperties: false,
        },
      },
      {
        name: WORKFLOW_CONFIRM_EXECUTION_PLAN_TOOL_NAME,
        description: 'Confirm staged selections (kept files and command approval) before apply/execute steps.',
        inputSchema: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Execution plan id.' },
            keptFilePaths: { type: 'array', items: { type: 'string' }, description: 'Selected files to keep.' },
            approveCommands: { type: 'boolean', description: 'Whether command list is approved.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm plan selections.' },
          },
          required: ['planId', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: WORKFLOW_APPLY_EXECUTION_PLAN_TOOL_NAME,
        description: 'Apply kept file changes from a confirmed execution plan into the workspace.',
        inputSchema: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Execution plan id.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to write files.' },
          },
          required: ['planId', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: WORKFLOW_EXECUTE_APPROVED_COMMANDS_TOOL_NAME,
        description: 'Execute approved command list from a confirmed execution plan (git commands only).',
        inputSchema: {
          type: 'object',
          properties: {
            planId: { type: 'string', description: 'Execution plan id.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to execute commands.' },
          },
          required: ['planId', 'confirm'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    try {
      if (name === WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME) {
        const args = workflowInputSchema.parse(rawArgs ?? {});
        const result = await this.workflowExecuteMonolithEvolutionUseCase.execute(args);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: {
            analysis: 'Executed dry-run monolith evolution workflow successfully.',
            plan: [
              'Review architecture and capabilities outputs',
              'Approve generatedToolPlans for implementation',
              'Use gitPlan and jiraPlan templates for operational rollout',
            ],
            generated_code: [],
            generated_tools: [WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME],
            next_step: 'Approve selected plans and execute controlled implementation + PR flow.',
            workflow_result: result,
          },
        };
      }

      if (name === WORKFLOW_PREPARE_EXECUTION_PLAN_TOOL_NAME) {
        const args = workflowInputSchema.parse(rawArgs ?? {});
        const result = await this.workflowExecuteMonolithEvolutionUseCase.execute(args);
        const executionPlan = executionPlanStore.create({
          workflowInput: args as unknown as Record<string, unknown>,
          workflowResult: result,
        });

        return {
          content: [{ type: 'text', text: formatPlanSummary(executionPlan) }],
          structuredContent: {
            planId: executionPlan.id,
            status: executionPlan.status,
            summary: {
              toolPlanCount: executionPlan.workflowResult.generatedToolPlans.length,
              candidateFiles: extractPlannedFilePaths(executionPlan),
              suggestedCommands: buildSuggestedCommands(executionPlan),
            },
            next_step: 'Call workflow_review_execution_plan, then workflow_confirm_execution_plan with confirm=true.',
          },
        };
      }

      if (name === WORKFLOW_REVIEW_EXECUTION_PLAN_TOOL_NAME) {
        const args = reviewExecutionPlanInputSchema.parse(rawArgs ?? {});
        const executionPlan = executionPlanStore.get(args.planId);

        if (!executionPlan) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Execution plan not found: ${args.planId}` }],
          };
        }

        return {
          content: [{ type: 'text', text: formatPlanSummary(executionPlan) }],
          structuredContent: {
            planId: executionPlan.id,
            status: executionPlan.status,
            keptFilePaths: executionPlan.keptFilePaths,
            commandApproval: executionPlan.commandApproval,
            candidateFiles: extractPlannedFilePaths(executionPlan),
            suggestedCommands: buildSuggestedCommands(executionPlan),
          },
        };
      }

      if (name === WORKFLOW_CONFIRM_EXECUTION_PLAN_TOOL_NAME) {
        const args = confirmExecutionPlanInputSchema.parse(rawArgs ?? {});
        const executionPlan = executionPlanStore.confirm({
          planId: args.planId,
          keptFilePaths: args.keptFilePaths,
          commandApproval: args.approveCommands,
        });

        if (!executionPlan) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Execution plan not found: ${args.planId}` }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: [
                'Execution plan confirmed.',
                `Plan ID: ${executionPlan.id}`,
                `Kept files: ${executionPlan.keptFilePaths.length}`,
                `Command approval: ${executionPlan.commandApproval}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            planId: executionPlan.id,
            status: executionPlan.status,
            keptFilePaths: executionPlan.keptFilePaths,
            commandApproval: executionPlan.commandApproval,
            approvedCommands: executionPlan.commandApproval ? buildSuggestedCommands(executionPlan) : [],
            next_step: executionPlan.commandApproval
              ? 'Commands are approved. Execute them via your preferred git/jira/github tools.'
              : 'Commands are not approved yet. Re-run confirm with approveCommands=true when ready.',
          },
        };
      }

      if (name === WORKFLOW_APPLY_EXECUTION_PLAN_TOOL_NAME) {
        const args = applyExecutionPlanInputSchema.parse(rawArgs ?? {});
        const executionPlan = executionPlanStore.get(args.planId);

        if (!executionPlan) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Execution plan not found: ${args.planId}` }],
          };
        }

        if (executionPlan.status !== 'confirmed') {
          return {
            isError: true,
            content: [{ type: 'text', text: `Execution plan must be confirmed before apply. Current status: ${executionPlan.status}` }],
          };
        }

        if (executionPlan.keptFilePaths.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'No kept files found. Confirm keptFilePaths before apply.' }],
          };
        }

        const plannedFiles = collectPlannedFiles(executionPlan);
        const keptSet = new Set(executionPlan.keptFilePaths);
        const filesToApply = plannedFiles.filter((file) => keptSet.has(file.path));

        if (filesToApply.length === 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'None of the keptFilePaths match planned files.' }],
          };
        }

        for (const file of filesToApply) {
          await mkdir(dirname(file.path), { recursive: true });
          await writeFile(file.path, file.content_preview, 'utf8');
        }

        const updatedPlan = executionPlanStore.apply({
          planId: executionPlan.id,
          appliedFilePaths: filesToApply.map((file) => file.path),
        });

        return {
          content: [
            {
              type: 'text',
              text: [
                'Applied kept files to workspace.',
                `Plan ID: ${executionPlan.id}`,
                `Applied files: ${filesToApply.length}`,
                'Check Source Control for red/green diffs and keep/discard as needed.',
              ].join('\n'),
            },
          ],
          structuredContent: {
            planId: executionPlan.id,
            status: updatedPlan?.status ?? executionPlan.status,
            appliedFilePaths: filesToApply.map((file) => file.path),
            next_step: executionPlan.commandApproval
              ? 'Commands already approved. You can execute approved commands now.'
              : 'Review applied diffs, then approve commands when ready.',
          },
        };
      }

      if (name === WORKFLOW_EXECUTE_APPROVED_COMMANDS_TOOL_NAME) {
        const args = executeApprovedCommandsInputSchema.parse(rawArgs ?? {});
        const executionPlan = executionPlanStore.get(args.planId);

        if (!executionPlan) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Execution plan not found: ${args.planId}` }],
          };
        }

        if (!executionPlan.commandApproval) {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Commands are not approved yet. Confirm with approveCommands=true first.' }],
          };
        }

        const commands = buildSuggestedCommands(executionPlan).filter((command) => !command.startsWith('#'));
        const blocked = commands.filter((command) => !isAllowedCommand(command));
        if (blocked.length > 0) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Blocked non-git commands: ${blocked.join(', ')}` }],
          };
        }

        const outputs: Array<{ command: string; stdout: string; stderr: string }> = [];
        for (const command of commands) {
          const { stdout, stderr } = await exec(command, { cwd: process.cwd() });
          outputs.push({ command, stdout: trimCommandOutput(stdout), stderr: trimCommandOutput(stderr) });
        }

        const updatedPlan = executionPlanStore.markCommandsExecuted({
          planId: executionPlan.id,
          executedCommands: commands,
        });

        return {
          content: [
            {
              type: 'text',
              text: [
                'Approved commands executed.',
                `Plan ID: ${executionPlan.id}`,
                `Commands executed: ${commands.length}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            planId: executionPlan.id,
            status: updatedPlan?.status ?? executionPlan.status,
            executedCommands: commands,
            outputs,
            next_step: 'Review git status and push results as needed.',
          },
        };
      }

      return null;
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${error?.message || String(error)}` }],
      };
    }
  }
}
