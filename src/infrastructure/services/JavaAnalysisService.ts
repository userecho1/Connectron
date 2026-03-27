import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  IJavaAnalysisProvider,
  JavaAnalysisRequest,
  JavaApiEndpoint,
  JavaServiceMethod,
  ProjectArchitectureReport,
} from '../../application/interfaces/IJavaAnalysisProvider.js';

const DEFAULT_SCAN_DEPTH = 8;

interface ParsedControllerMethod {
  httpMethod: string;
  routePath: string;
  methodName: string;
  inputType?: string;
  returnType?: string;
  serviceCalls: string[];
}

export class JavaAnalysisService implements IJavaAnalysisProvider {
  async analyzeProject(input: JavaAnalysisRequest): Promise<ProjectArchitectureReport> {
    const warnings: string[] = [];
    const javaFiles = await this.collectJavaFiles(input.projectRoot, input.scanDepth ?? DEFAULT_SCAN_DEPTH);

    if (javaFiles.length === 0) {
      warnings.push('No Java files were found under the provided projectRoot.');
    }

    const apiList: JavaApiEndpoint[] = [];
    const services: JavaServiceMethod[] = [];
    const entities = new Set<string>();
    const databaseTables = new Set<string>();
    const dependencies = new Set<string>();
    const modules = new Set<string>();

    for (const filePath of javaFiles) {
      const content = await fs.readFile(filePath, 'utf8');
      const packageName = this.extractPackage(content);

      if (!this.matchPackageFilters(packageName, input.includePackages, input.excludePackages)) {
        continue;
      }

      const importMatches = content.matchAll(/^import\s+([\w.]+);/gm);
      for (const match of importMatches) {
        dependencies.add(match[1]);
      }

      if (packageName) {
        modules.add(this.toModuleName(packageName));
      }

      for (const entityName of this.extractEntities(content)) {
        entities.add(entityName);
      }

      for (const tableName of this.extractTables(content)) {
        databaseTables.add(tableName);
      }

      if (this.isController(content)) {
        const controllerClass = this.extractClassName(content);
        const basePath = this.extractBaseRequestPath(content);
        const methods = this.extractControllerMethods(content);

        for (const method of methods) {
          apiList.push({
            controllerClass,
            httpMethod: method.httpMethod,
            path: this.joinRoute(basePath, method.routePath),
            methodName: method.methodName,
            inputType: method.inputType,
            returnType: method.returnType,
            serviceCalls: method.serviceCalls,
          });
        }
      }

      if (this.isService(content)) {
        const serviceClass = this.extractClassName(content);
        const serviceMethods = this.extractServiceMethods(content, serviceClass);
        for (const method of serviceMethods) {
          services.push(method);
        }
      }
    }

    return {
      modules: Array.from(modules).sort(),
      api_list: apiList,
      services,
      entities: Array.from(entities).sort(),
      database_tables: Array.from(databaseTables).sort(),
      dependencies: Array.from(dependencies).sort(),
      bounded_context_hints: this.deriveBoundedContextHints(modules),
      scanned_files: javaFiles.length,
      warnings,
    };
  }

  private async collectJavaFiles(root: string, scanDepth: number): Promise<string[]> {
    const result: string[] = [];

    const walk = async (currentPath: string, depth: number): Promise<void> => {
      if (depth > scanDepth) {
        return;
      }

      let entries;
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === 'target' || entry.name === 'build' || entry.name === '.git' || entry.name === 'node_modules') {
            continue;
          }
          await walk(fullPath, depth + 1);
          continue;
        }

        if (entry.isFile() && entry.name.endsWith('.java')) {
          result.push(fullPath);
        }
      }
    };

    await walk(root, 0);
    return result;
  }

  private matchPackageFilters(
    packageName: string,
    includePackages?: string[],
    excludePackages?: string[],
  ): boolean {
    if (includePackages && includePackages.length > 0) {
      const included = includePackages.some((value) => packageName.startsWith(value));
      if (!included) {
        return false;
      }
    }

    if (excludePackages && excludePackages.length > 0) {
      const excluded = excludePackages.some((value) => packageName.startsWith(value));
      if (excluded) {
        return false;
      }
    }

    return true;
  }

  private extractPackage(content: string): string {
    const match = content.match(/^package\s+([\w.]+);/m);
    return match?.[1] ?? '';
  }

  private extractClassName(content: string): string {
    const match = content.match(/class\s+(\w+)/);
    return match?.[1] ?? 'UnknownClass';
  }

  private isController(content: string): boolean {
    return content.includes('@RestController') || content.includes('@Controller');
  }

  private isService(content: string): boolean {
    return content.includes('@Service') || /class\s+\w*Service\b/.test(content);
  }

  private extractEntities(content: string): string[] {
    const className = this.extractClassName(content);
    if (content.includes('@Entity')) {
      return [className];
    }
    return [];
  }

  private extractTables(content: string): string[] {
    const tableNameMatches = content.matchAll(/@Table\s*\(\s*name\s*=\s*"([^"]+)"\s*\)/g);
    return Array.from(tableNameMatches, (match) => match[1]);
  }

  private extractBaseRequestPath(content: string): string {
    const match = content.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?"([^"]*)"/);
    return match?.[1] ?? '';
  }

  private extractControllerMethods(content: string): ParsedControllerMethod[] {
    const lines = content.split(/\r?\n/);
    const methods: ParsedControllerMethod[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      const mappingInfo = this.parseMappingAnnotation(line);
      if (!mappingInfo) {
        continue;
      }

      const signatureIndex = this.findNextSignatureLine(lines, index + 1);
      if (signatureIndex === -1) {
        continue;
      }

      const signature = lines[signatureIndex].trim();
      const signatureMatch = signature.match(/(?:public|protected)\s+([\w<>,\[\] ?]+)\s+(\w+)\s*\(([^)]*)\)/);
      if (!signatureMatch) {
        continue;
      }

      const returnType = signatureMatch[1].trim();
      const methodName = signatureMatch[2].trim();
      const rawParameters = signatureMatch[3].trim();
      const inputType = this.extractInputType(rawParameters);
      const body = this.extractMethodBody(lines, signatureIndex);
      const serviceCalls = this.extractServiceCalls(body);

      methods.push({
        httpMethod: mappingInfo.httpMethod,
        routePath: mappingInfo.path,
        methodName,
        inputType,
        returnType,
        serviceCalls,
      });
    }

    return methods;
  }

  private parseMappingAnnotation(line: string): { httpMethod: string; path: string } | null {
    const patterns = [
      { regex: /@GetMapping\s*\(([^)]*)\)/, httpMethod: 'GET' },
      { regex: /@PostMapping\s*\(([^)]*)\)/, httpMethod: 'POST' },
      { regex: /@PutMapping\s*\(([^)]*)\)/, httpMethod: 'PUT' },
      { regex: /@DeleteMapping\s*\(([^)]*)\)/, httpMethod: 'DELETE' },
      { regex: /@PatchMapping\s*\(([^)]*)\)/, httpMethod: 'PATCH' },
      { regex: /@RequestMapping\s*\(([^)]*)\)/, httpMethod: 'ANY' },
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (!match) {
        continue;
      }

      const pathMatch = match[1].match(/(?:value\s*=\s*)?"([^"]*)"/);
      return { httpMethod: pattern.httpMethod, path: pathMatch?.[1] ?? '' };
    }

    return null;
  }

  private findNextSignatureLine(lines: string[], start: number): number {
    for (let index = start; index < lines.length; index += 1) {
      const line = lines[index].trim();
      if (!line || line.startsWith('@')) {
        continue;
      }
      if (line.includes('(') && line.includes(')') && line.endsWith('{')) {
        return index;
      }
      if (line.includes('(') && line.includes(')')) {
        return index;
      }
    }

    return -1;
  }

  private extractInputType(rawParameters: string): string | undefined {
    if (!rawParameters) {
      return undefined;
    }

    const firstParameter = rawParameters.split(',')[0]?.trim();
    if (!firstParameter) {
      return undefined;
    }

    const clean = firstParameter.replace(/@\w+(\([^)]*\))?\s*/g, '').trim();
    const parts = clean.split(/\s+/);
    return parts.length >= 2 ? parts[0] : undefined;
  }

  private extractMethodBody(lines: string[], signatureIndex: number): string {
    let openBraces = 0;
    const body: string[] = [];

    for (let index = signatureIndex; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.includes('{')) {
        openBraces += (line.match(/\{/g) || []).length;
      }
      if (openBraces > 0) {
        body.push(line);
      }
      if (line.includes('}')) {
        openBraces -= (line.match(/\}/g) || []).length;
        if (openBraces <= 0) {
          break;
        }
      }
    }

    return body.join('\n');
  }

  private extractServiceCalls(body: string): string[] {
    const matches = body.matchAll(/(\w+Service)\s*\.\s*(\w+)\s*\(/g);
    return Array.from(matches, (match) => `${match[1]}.${match[2]}`);
  }

  private extractServiceMethods(content: string, serviceClass: string): JavaServiceMethod[] {
    const methods: JavaServiceMethod[] = [];
    const signatureMatches = content.matchAll(/public\s+([\w<>,\[\] ?]+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g);

    for (const match of signatureMatches) {
      const returnType = match[1].trim();
      const methodName = match[2].trim();
      const parameters = this.parseParameterTypes(match[3]);
      const bodyStart = match.index ?? 0;
      const body = content.slice(bodyStart, bodyStart + 1200);
      const repositoryCalls = Array.from(body.matchAll(/(\w+Repository)\s*\.\s*(\w+)\s*\(/g), (item) => `${item[1]}.${item[2]}`);

      methods.push({
        serviceClass,
        methodName,
        parameters,
        returnType,
        repositoryCalls,
      });
    }

    return methods;
  }

  private parseParameterTypes(rawParameters: string): string[] {
    if (!rawParameters.trim()) {
      return [];
    }

    return rawParameters
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const clean = part.replace(/@\w+(\([^)]*\))?\s*/g, '').trim();
        return clean.split(/\s+/)[0] ?? clean;
      });
  }

  private joinRoute(basePath: string, methodPath: string): string {
    const base = basePath || '';
    const method = methodPath || '';
    const joined = `${base}/${method}`.replace(/\/+/g, '/');
    return joined.startsWith('/') ? joined : `/${joined}`;
  }

  private toModuleName(packageName: string): string {
    const parts = packageName.split('.').filter(Boolean);
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('.');
    }
    return packageName;
  }

  private deriveBoundedContextHints(modules: Set<string>): string[] {
    const contexts = new Set<string>();

    for (const moduleName of modules) {
      const parts = moduleName.split('.');
      const hint = parts[parts.length - 1];
      if (hint) {
        contexts.add(`${hint}-domain`);
      }
    }

    return Array.from(contexts).sort();
  }
}
