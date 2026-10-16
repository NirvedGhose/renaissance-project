import type {ScenarioData} from '../graph/types.ts'
import type {SimulationResult} from '../simulation/types.ts'

export type DisruptionCandidate =
 | {id:string;type:'close_edge';edgeId:string}
 | {id:string;type:'close_exit';exitNodeId:string}
 | {id:string;type:'reduce_edge_capacity';edgeId:string;fraction:number}
 | {id:string;type:'reduce_exit_throughput';exitNodeId:string;fraction:number}
 | {id:string;type:'increase_demand';originNodeId:string;addAgents:number}
 | {id:string;type:'increase_edge_travel_time';edgeId:string;addTicks:number}
export type FailureCriterion =
 | {id:string;type:'any_unserved'}
 | {id:string;type:'completion_after_deadline'}
 | {id:string;type:'unserved_proportion';minimum:number}
 | {id:string;type:'maximum_unreachable';maximum:number}
export type SearchProgress = {phase:'baseline'|'search'|'minimality'|'complete'|'cancelled'|'budget_exhausted';evaluations:number;candidateSetsEvaluated:number;depth:number;maximumDepth:number;totalCandidates:number}
export type SearchOptions = {baseline:ScenarioData;candidates:DisruptionCandidate[];maximumDisruptions:number;criteria:FailureCriterion[];deadlineTicks:number;maximumEvaluations:number;signal?:AbortSignal;onProgress?:(progress:SearchProgress)=>void}
export type InvalidCandidate = {candidateId:string;reason:string}
export type SearchMetrics = Pick<SimulationResult,'totalAgents'|'evacuatedByDeadline'|'remainingAgents'|'unreachableAgents'|'strandedAgents'|'evacuationFraction'|'completionTick'|'tick'|'deadlineViolations'|'failedConstraints'>
export type MinimalityVerification = {verified:boolean;checkedSubsetIds:string[][];failingSubsetIds:string[][];reason:'all_proper_subsets_pass'|'proper_subset_also_fails'|'budget_exhausted'|'cancelled'}
export type MinimalFailure = {disruptions:DisruptionCandidate[];violatedCriteria:FailureCriterion[];baselineMetrics:SearchMetrics;disruptedMetrics:SearchMetrics;minimality:MinimalityVerification;scenario:ScenarioData;severity:number}
export type MinimalFailureSearchResult = {baselineMetrics:SearchMetrics;failures:MinimalFailure[];invalidCandidates:InvalidCandidate[];eligibleCandidateCount:number;candidateSetsEvaluated:number;scenariosEvaluated:number;searchDepthReached:number;maximumDisruptions:number;exhaustive:boolean;cancelled:boolean;budgetExhausted:boolean;searchBudget:number;criteria:FailureCriterion[];evaluatedScenarioIds:string[]}
