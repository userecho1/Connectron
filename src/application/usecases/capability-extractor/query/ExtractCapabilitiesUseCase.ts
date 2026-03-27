import {
  ExtractCapabilitiesRequest,
  ExtractCapabilitiesResult,
  ICapabilityExtractionProvider,
} from '../../../interfaces';

export class ExtractCapabilitiesUseCase {
  constructor(private readonly capabilityExtractionProvider: ICapabilityExtractionProvider) {}

  async execute(input: ExtractCapabilitiesRequest): Promise<ExtractCapabilitiesResult> {
    if (!input.report) {
      throw new Error('report is required.');
    }

    if (!Array.isArray(input.report.api_list)) {
      throw new Error('report.api_list must be an array.');
    }

    if (!Array.isArray(input.report.services)) {
      throw new Error('report.services must be an array.');
    }

    return this.capabilityExtractionProvider.extractCapabilities(input);
  }
}
