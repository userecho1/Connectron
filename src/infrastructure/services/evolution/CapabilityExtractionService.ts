import {
  CapabilityCandidate,
  ExtractCapabilitiesRequest,
  ExtractCapabilitiesResult,
  ICapabilityExtractionProvider,
} from '../../../application/interfaces';

const verbPriority = ['create', 'get', 'list', 'update', 'delete', 'cancel'] as const;

type CapabilityVerb = (typeof verbPriority)[number];

export class CapabilityExtractionService implements ICapabilityExtractionProvider {
  async extractCapabilities(input: ExtractCapabilitiesRequest): Promise<ExtractCapabilitiesResult> {
    const byName = new Map<string, CapabilityCandidate>();
    const conflicts = new Set<string>();

    for (const endpoint of input.report.api_list) {
      const verb = this.deriveVerb(endpoint.httpMethod, endpoint.methodName);
      const resource = this.deriveResource(endpoint.path, endpoint.methodName);
      const name = `${verb}_${resource}`;
      const serviceMethod = endpoint.serviceCalls[0] ?? undefined;
      const boundedContext = this.deriveBoundedContext(serviceMethod, endpoint.controllerClass);

      const candidate: CapabilityCandidate = {
        name,
        description: this.describeCapability(verb, resource),
        source: {
          controllerClass: endpoint.controllerClass,
          serviceMethod,
          httpMethod: endpoint.httpMethod,
          path: endpoint.path,
        },
        input_schema: this.buildInputSchema(endpoint.inputType),
        bounded_context: boundedContext,
      };

      this.insertCandidate(byName, candidate, conflicts);
    }

    for (const service of input.report.services) {
      const verb = this.deriveVerb('ANY', service.methodName);
      const resource = this.deriveResource('', service.methodName, service.serviceClass);
      const name = `${verb}_${resource}`;
      const boundedContext = this.deriveBoundedContext(`${service.serviceClass}.${service.methodName}`, service.serviceClass);

      const candidate: CapabilityCandidate = {
        name,
        description: this.describeCapability(verb, resource),
        source: {
          serviceMethod: `${service.serviceClass}.${service.methodName}`,
        },
        input_schema: this.buildInputSchema(service.parameters[0]),
        bounded_context: boundedContext,
      };

      this.insertCandidate(byName, candidate, conflicts);
    }

    const capabilities = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    const boundedContexts = Array.from(new Set(capabilities.map((item) => item.bounded_context))).sort();

    return {
      capabilities,
      conflicts: Array.from(conflicts).sort(),
      bounded_contexts: boundedContexts,
    };
  }

  private insertCandidate(
    store: Map<string, CapabilityCandidate>,
    candidate: CapabilityCandidate,
    conflicts: Set<string>,
  ): void {
    const existing = store.get(candidate.name);
    if (!existing) {
      store.set(candidate.name, candidate);
      return;
    }

    const sourceA = JSON.stringify(existing.source);
    const sourceB = JSON.stringify(candidate.source);
    if (sourceA !== sourceB) {
      conflicts.add(candidate.name);
      const scopedName = `${candidate.bounded_context}_${candidate.name}`;
      store.set(scopedName, {
        ...candidate,
        name: scopedName,
      });
    }
  }

  private deriveVerb(httpMethod: string, methodName: string): CapabilityVerb {
    const normalizedMethod = (httpMethod || '').toUpperCase();

    if (normalizedMethod === 'POST') return 'create';
    if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') return 'update';
    if (normalizedMethod === 'DELETE') return 'delete';
    if (normalizedMethod === 'GET') {
      return this.looksPlural(methodName) ? 'list' : 'get';
    }

    const lower = methodName.toLowerCase();
    if (lower.startsWith('create') || lower.startsWith('add')) return 'create';
    if (lower.startsWith('get') || lower.startsWith('find') || lower.startsWith('fetch')) return 'get';
    if (lower.startsWith('list') || lower.startsWith('search')) return 'list';
    if (lower.startsWith('update') || lower.startsWith('edit')) return 'update';
    if (lower.startsWith('delete') || lower.startsWith('remove')) return 'delete';
    if (lower.startsWith('cancel')) return 'cancel';

    return 'get';
  }

  private deriveResource(pathValue: string, methodName: string, serviceClass?: string): string {
    const firstPathSegment = pathValue
      .split('/')
      .map((value) => value.trim())
      .filter(Boolean)
      .find((value) => !value.startsWith('{'));

    if (firstPathSegment) {
      return this.toSnakeCase(this.singularize(firstPathSegment));
    }

    const strippedName = methodName
      .replace(/^(create|get|list|update|delete|remove|cancel|find|fetch|search)/i, '')
      .replace(/^(By|For)/i, '');

    if (strippedName) {
      return this.toSnakeCase(this.singularize(strippedName));
    }

    if (serviceClass) {
      return this.toSnakeCase(serviceClass.replace(/Service$/i, ''));
    }

    return 'resource';
  }

  private deriveBoundedContext(serviceMethod?: string, className?: string): string {
    const source = serviceMethod || className || 'core';
    const token = source
      .replace(/\./g, '_')
      .replace(/Service$/i, '')
      .replace(/Controller$/i, '')
      .split('_')
      .find((value) => !!value && value.toLowerCase() !== 'com' && value.toLowerCase() !== 'company');

    const normalized = this.toSnakeCase(token || 'core');
    return normalized.endsWith('_domain') ? normalized : `${normalized}_domain`;
  }

  private buildInputSchema(inputType?: string): CapabilityCandidate['input_schema'] {
    if (!inputType) {
      return {
        type: 'object',
        properties: {},
        additionalProperties: false,
      };
    }

    return {
      type: 'object',
      properties: {
        payload: {
          type: 'object',
          description: `Request payload derived from ${inputType}.`,
        },
      },
      required: ['payload'],
      additionalProperties: false,
    };
  }

  private describeCapability(verb: CapabilityVerb, resource: string): string {
    const readableResource = resource.replace(/_/g, ' ');
    const capitalized = readableResource.charAt(0).toUpperCase() + readableResource.slice(1);

    if (verb === 'list') {
      return `List ${capitalized}`;
    }
    if (verb === 'get') {
      return `Get ${capitalized}`;
    }
    if (verb === 'create') {
      return `Create ${capitalized}`;
    }
    if (verb === 'update') {
      return `Update ${capitalized}`;
    }
    if (verb === 'delete') {
      return `Delete ${capitalized}`;
    }
    return `Cancel ${capitalized}`;
  }

  private looksPlural(methodName: string): boolean {
    const lower = methodName.toLowerCase();
    return lower.startsWith('list') || lower.startsWith('search') || lower.endsWith('all');
  }

  private singularize(value: string): string {
    const normalized = value.replace(/[^a-zA-Z0-9]+/g, '_');
    if (normalized.endsWith('ies')) {
      return `${normalized.slice(0, -3)}y`;
    }
    if (normalized.endsWith('s') && normalized.length > 1) {
      return normalized.slice(0, -1);
    }
    return normalized;
  }

  private toSnakeCase(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }
}

