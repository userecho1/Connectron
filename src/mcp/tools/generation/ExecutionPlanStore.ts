import { randomUUID } from 'crypto';
import { WorkflowExecuteMonolithEvolutionResult } from '../../../application/usecases/workflow/command/WorkflowExecuteMonolithEvolutionUseCase.js';

export type ExecutionPlanStatus = 'draft' | 'confirmed' | 'applied';

export interface WorkflowExecutionPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ExecutionPlanStatus;
  workflowInput: Record<string, unknown>;
  workflowResult: WorkflowExecuteMonolithEvolutionResult;
  keptFilePaths: string[];
  commandApproval: boolean;
  appliedFilePaths: string[];
  appliedAt?: string;
  executedCommands: string[];
  executedAt?: string;
}

class ExecutionPlanStore {
  private readonly plans = new Map<string, WorkflowExecutionPlan>();

  create(input: {
    workflowInput: Record<string, unknown>;
    workflowResult: WorkflowExecuteMonolithEvolutionResult;
  }): WorkflowExecutionPlan {
    const now = new Date().toISOString();
    const plan: WorkflowExecutionPlan = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      status: 'draft',
      workflowInput: input.workflowInput,
      workflowResult: input.workflowResult,
      keptFilePaths: [],
      commandApproval: false,
      appliedFilePaths: [],
      executedCommands: [],
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  get(planId: string): WorkflowExecutionPlan | null {
    return this.plans.get(planId) ?? null;
  }

  confirm(input: {
    planId: string;
    keptFilePaths: string[];
    commandApproval: boolean;
  }): WorkflowExecutionPlan | null {
    const plan = this.plans.get(input.planId);
    if (!plan) {
      return null;
    }

    const updated: WorkflowExecutionPlan = {
      ...plan,
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
      keptFilePaths: [...new Set(input.keptFilePaths)],
      commandApproval: input.commandApproval,
    };

    this.plans.set(updated.id, updated);
    return updated;
  }

  apply(input: { planId: string; appliedFilePaths: string[] }): WorkflowExecutionPlan | null {
    const plan = this.plans.get(input.planId);
    if (!plan) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: WorkflowExecutionPlan = {
      ...plan,
      status: 'applied',
      updatedAt: now,
      appliedAt: now,
      appliedFilePaths: [...new Set(input.appliedFilePaths)],
    };

    this.plans.set(updated.id, updated);
    return updated;
  }

  markCommandsExecuted(input: { planId: string; executedCommands: string[] }): WorkflowExecutionPlan | null {
    const plan = this.plans.get(input.planId);
    if (!plan) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: WorkflowExecutionPlan = {
      ...plan,
      updatedAt: now,
      executedAt: now,
      executedCommands: [...input.executedCommands],
    };

    this.plans.set(updated.id, updated);
    return updated;
  }
}

export const executionPlanStore = new ExecutionPlanStore();
