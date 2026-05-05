import { CoverageMap } from 'istanbul-lib-coverage';
import { ProxifiedModule } from 'magicast';
import { Profiler } from 'node:inspector';
import { BaseCoverageProvider, CoverageProvider, Vitest, ReportContext } from 'vitest/node';

interface ScriptCoverageWithOffset extends Profiler.ScriptCoverage {
	startOffset: number;
}
declare class V8CoverageProvider extends BaseCoverageProvider implements CoverageProvider {
	name: "v8";
	version: string;
	initialize(ctx: Vitest): void;
	createCoverageMap(): CoverageMap;
	generateCoverage({ allTestsRun }: ReportContext): Promise<CoverageMap>;
	generateReports(coverageMap: CoverageMap, allTestsRun?: boolean): Promise<void>;
	parseConfigModule(configFilePath: string): Promise<ProxifiedModule<any>>;
	private getCoverageMapForUncoveredFiles;
	private remapCoverage;
	private getSources;
	private convertCoverage;
}

export { V8CoverageProvider };
export type { ScriptCoverageWithOffset };
