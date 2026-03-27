import { DeveloperPrompts } from './DeveloperPrompts.js';
import { PromptModule } from './PromptModule.js';
import { TaskPrompts } from './TaskPrompts.js';
import { logger } from '../../utils/logger.js';

export function registerPromptModules(): PromptModule[] {
  const modules: PromptModule[] = [];

  modules.push(new DeveloperPrompts());
  logger.info('Developer prompts module enabled.');

  modules.push(new TaskPrompts());
  logger.info('Task prompts module enabled.');

  return modules;
}
