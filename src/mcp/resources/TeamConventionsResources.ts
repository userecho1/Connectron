import { Resource, TextResourceContents } from '@modelcontextprotocol/sdk/types.js';
import { ResourceModule } from './ResourceModule';

const TEAM_CONVENTIONS_URI = 'conventions://engineering/git-jira-java';

const TEAM_CONVENTIONS_TEXT = `Engineering Team Conventions

1) Jira story key prefix
- Every code commit message must include the Jira story key prefix.
- Example: dqw-3878 feat: implement jira transition workflow

2) Branch naming
- For each new story, create a branch with prefix feature_.
- Branch pattern: feature_<story-info>
- Example: feature_dqw-3878_jira-workflow

3) Java code style
- Java code must follow Google Java Style Guide.
- Keep formatting and naming consistent with the guide when generating or editing Java code.
`;

export class TeamConventionsResources implements ResourceModule {
  listResources(): readonly Resource[] {
    return [
      {
        uri: TEAM_CONVENTIONS_URI,
        name: 'engineering-team-conventions',
        title: 'Engineering Team Conventions',
        description: 'Team rules for Jira key usage, branch naming, and Java style.',
        mimeType: 'text/plain',
      },
    ];
  }

  async readResource(uri: string): Promise<readonly TextResourceContents[] | null> {
    if (uri !== TEAM_CONVENTIONS_URI) {
      return null;
    }

    return [
      {
        uri: TEAM_CONVENTIONS_URI,
        mimeType: 'text/plain',
        text: TEAM_CONVENTIONS_TEXT,
      },
    ];
  }
}
