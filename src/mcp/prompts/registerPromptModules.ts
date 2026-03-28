import { DeveloperPrompts } from './DeveloperPrompts';
import { PromptModule } from './PromptModule';
import { TaskPrompts } from './TaskPrompts';
import { logger } from '../../utils/logger';

export function registerPromptModules(): PromptModule[] {
  const modules: PromptModule[] = [];

  modules.push(new DeveloperPrompts());
  logger.info('Developer prompts module enabled.');

  modules.push(new TaskPrompts());
  logger.info('Task prompts module enabled.');

  return modules;
}
