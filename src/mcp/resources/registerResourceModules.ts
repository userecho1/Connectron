import { logger } from '../../utils/logger';
import { ResourceModule } from './ResourceModule';
import { TeamConventionsResources } from './TeamConventionsResources';

export function registerResourceModules(): ResourceModule[] {
  const modules: ResourceModule[] = [];

  modules.push(new TeamConventionsResources());
  logger.info('Resource module enabled: team conventions.');

  return modules;
}
