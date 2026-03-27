import { logger } from '../../utils/logger.js';
import { ResourceModule } from './ResourceModule.js';
import { TeamConventionsResources } from './TeamConventionsResources.js';

export function registerResourceModules(): ResourceModule[] {
  const modules: ResourceModule[] = [];

  modules.push(new TeamConventionsResources());
  logger.info('Resource module enabled: team conventions.');

  return modules;
}
