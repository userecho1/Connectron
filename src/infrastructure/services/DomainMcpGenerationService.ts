import {
  DomainServerPlan,
  GenerateDomainMcpServersRequest,
  GenerateDomainMcpServersResult,
  IDomainMcpGenerationProvider,
} from '../../application/interfaces/IDomainMcpGenerationProvider.js';

export class DomainMcpGenerationService implements IDomainMcpGenerationProvider {
  async generateDomainServerPlans(
    input: GenerateDomainMcpServersRequest,
  ): Promise<GenerateDomainMcpServersResult> {
    const warnings: string[] = [];
    const skippedCapabilities: string[] = [];

    const selectedDomains = new Set<string>((input.domains || []).map((domain) => this.normalizeDomain(domain)));
    const grouped = new Map<string, string[]>();

    for (const capability of input.capabilities) {
      const domain = this.normalizeDomain(capability.bounded_context || this.pickDomainFromName(capability.name));
      if (selectedDomains.size > 0 && !selectedDomains.has(domain)) {
        skippedCapabilities.push(capability.name);
        continue;
      }

      const list = grouped.get(domain) || [];
      list.push(capability.name);
      grouped.set(domain, list);
    }

    if (grouped.size === 0) {
      warnings.push('No capabilities matched the selected domains.');
    }

    const generatedServers: DomainServerPlan[] = Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([domain, capabilities]) => this.buildDomainPlan(domain, capabilities));

    return {
      dry_run: true,
      generated_servers: generatedServers,
      skipped_capabilities: skippedCapabilities.sort(),
      warnings,
    };
  }

  private buildDomainPlan(domain: string, capabilities: string[]): DomainServerPlan {
    const serverName = `${domain}-mcp`;
    const safeDomain = domain.replace(/-+/g, '-');

    return {
      domain,
      server_name: serverName,
      capabilities: capabilities.sort(),
      files: [
        {
          path: `${serverName}/tools/index.ts`,
          action: 'create',
          content_preview: this.previewToolsIndex(capabilities),
        },
        {
          path: `${serverName}/resources/index.ts`,
          action: 'create',
          content_preview: this.previewResourcesIndex(safeDomain),
        },
        {
          path: `${serverName}/prompts/index.ts`,
          action: 'create',
          content_preview: this.previewPromptsIndex(safeDomain),
        },
        {
          path: `${serverName}/usecases/index.ts`,
          action: 'create',
          content_preview: this.previewUseCasesIndex(capabilities),
        },
      ],
    };
  }

  private previewToolsIndex(capabilities: string[]): string {
    const exports = capabilities.map((name) => `export const ${this.toConstName(name)} = '${name}';`).join('\n');
    return `${exports}\n`;
  }

  private previewResourcesIndex(domain: string): string {
    return [
      `export const ${this.toConstName(`${domain}_conventions`)} = {`,
      "  uri: 'conventions://engineering/git-jira-java',",
      `  description: 'Domain conventions for ${domain}',`,
      '};',
    ].join('\n');
  }

  private previewPromptsIndex(domain: string): string {
    return [
      `export const ${this.toConstName(`${domain}_analysis_prompt`)} = 'Analyze ${domain} tasks with bounded context constraints.';`,
    ].join('\n');
  }

  private previewUseCasesIndex(capabilities: string[]): string {
    return capabilities
      .map((name) => `export * from './${this.toPascalCase(name)}UseCase';`)
      .join('\n');
  }

  private normalizeDomain(value: string): string {
    const normalized = value
      .replace(/_domain$/i, '')
      .replace(/domain$/i, '')
      .replace(/_/g, '-')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return normalized || 'core';
  }

  private pickDomainFromName(capabilityName: string): string {
    const parts = capabilityName.split('_').filter(Boolean);
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    return 'core';
  }

  private toConstName(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private toPascalCase(value: string): string {
    return value
      .split(/[_-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
