import type {GraphNode,ScenarioData,ValidationIssue} from './types.ts'

function uniqueIds(ids:string[],kind:string,issues:ValidationIssue[]){const seen=new Set<string>();for(const id of ids){if(typeof id!=='string'||!id.trim())issues.push({severity:'error',code:'invalid_id',message:`${kind} ID must be a non-empty string.`});else if(seen.has(id))issues.push({severity:'error',code:'duplicate_id',message:`Duplicate ${kind} ID: ${id}.`,entityId:id});else seen.add(id)}}
const integerIn=(value:number,min:number,max:number)=>Number.isInteger(value)&&value>=min&&value<=max
const nonNegativeInteger=(value:number)=>Number.isSafeInteger(value)&&value>=0
export function validateScenario(scenario:ScenarioData):ValidationIssue[]{
 const issues:ValidationIssue[]=[]
 if(!scenario||typeof scenario!=='object'||scenario.schemaVersion!==1) return [{severity:'error',code:'schema_version',message:'Scenario schemaVersion must be 1.'}]
 if(!Array.isArray(scenario.nodes)||!Array.isArray(scenario.edges)||!Array.isArray(scenario.originGroups)||!scenario.constraints||typeof scenario.constraints!=='object'||!scenario.nodes.every(n=>n&&typeof n==='object')||!scenario.edges.every(e=>e&&typeof e==='object')||!scenario.originGroups.every(g=>g&&typeof g==='object'))return [{severity:'error',code:'scenario_shape',message:'Scenario nodes, edges, origin groups and constraints must be present and well formed.'}]
 uniqueIds(scenario.nodes.map(n=>n.id),'node',issues);uniqueIds(scenario.edges.map(e=>e.id),'edge',issues);uniqueIds(scenario.originGroups.map(g=>g.id),'origin group',issues)
 uniqueIds([...scenario.nodes.map(n=>n.id),...scenario.edges.map(e=>e.id)],'graph entity',issues)
 const nodeIds=new Set(scenario.nodes.map(n=>n.id));const nodes=new Map(scenario.nodes.map(n=>[n.id,n]));const originIds=new Set<string>();let totalAgents=0;let activeExits=0
 for(const node of scenario.nodes){
  if(!['START','JUNCTION','EXIT'].includes(node.type))issues.push({severity:'error',code:'node_type',message:`Node ${node.id} has an unsupported type.`,entityId:node.id})
  if(typeof node.label!=='string'||!node.label.trim())issues.push({severity:'error',code:'node_label',message:`Node ${node.id} label must be a non-empty string.`,entityId:node.id})
  if(typeof node.enabled!=='boolean')issues.push({severity:'error',code:'node_enabled',message:`Node ${node.id} enabled state must be boolean.`,entityId:node.id})
  if(!Number.isFinite(node.x)||node.x<0||node.x>1000||!Number.isFinite(node.y)||node.y<0||node.y>1000)issues.push({severity:'error',code:'node_coordinates',message:`Node ${node.id} coordinates must be finite and between 0 and 1000.`,entityId:node.id})
  if(node.holdingCapacity!==null&&(!nonNegativeInteger(node.holdingCapacity)))issues.push({severity:'error',code:'holding_capacity',message:`Node ${node.id} holding capacity must be null or a non-negative safe integer.`,entityId:node.id})
  if(!nonNegativeInteger(node.processingDelayTicks))issues.push({severity:'error',code:'processing_delay',message:`Node ${node.id} processing delay must be a non-negative safe integer.`,entityId:node.id})
  if(node.type==='EXIT'){if(!integerIn(node.serviceCapacityPerTick,0,200))issues.push({severity:'error',code:'exit_capacity',message:`Exit ${node.id} capacity must be an integer from 0 to 200 agents per tick.`,entityId:node.id});if(node.enabled&&node.serviceCapacityPerTick>0)activeExits++}
 }
 for(const group of scenario.originGroups){const node=nodes.get(group.nodeId);if(!nodeIds.has(group.nodeId))issues.push({severity:'error',code:'origin_endpoint',message:`Origin group ${group.id} references missing node ${group.nodeId}.`,entityId:group.id});else if(node?.type!=='START')issues.push({severity:'error',code:'origin_node_type',message:`Origin group ${group.id} must reference a START node.`,entityId:group.id});else if(!node.enabled&&group.initialAgents>0)issues.push({severity:'error',code:'disabled_origin',message:`Origin ${group.id} cannot hold a positive population while its node is disabled.`,entityId:group.id});if(originIds.has(group.nodeId))issues.push({severity:'error',code:'duplicate_origin',message:`More than one origin group references ${group.nodeId}.`,entityId:group.id});originIds.add(group.nodeId);if(!integerIn(group.initialAgents,0,200))issues.push({severity:'error',code:'origin_population',message:`Origin group ${group.id} population must be an integer from 0 to 200.`,entityId:group.id});else totalAgents+=group.initialAgents}
 for(const node of scenario.nodes)if(node.type==='START'&&!originIds.has(node.id))issues.push({severity:'error',code:'missing_origin_group',message:`START node ${node.id} has no origin group.`,entityId:node.id})
 for(const edge of scenario.edges){
  const a=nodes.get(edge.endpointA),b=nodes.get(edge.endpointB)
  if(!a)issues.push({severity:'error',code:'missing_endpoint',message:`Edge ${edge.id} references missing node ${edge.endpointA}.`,entityId:edge.id})
  if(!b)issues.push({severity:'error',code:'missing_endpoint',message:`Edge ${edge.id} references missing node ${edge.endpointB}.`,entityId:edge.id})
  if(edge.endpointA===edge.endpointB)issues.push({severity:'error',code:'self_link',message:`Edge ${edge.id} cannot connect a node to itself.`,entityId:edge.id})
  if(edge.enabled&&((a&&!a.enabled)||(b&&!b.enabled)))issues.push({severity:'error',code:'disabled_endpoint',message:`Enabled edge ${edge.id} has a disabled endpoint.`,entityId:edge.id})
  if(!['BIDIRECTIONAL','A_TO_B','B_TO_A'].includes(edge.direction))issues.push({severity:'error',code:'edge_direction',message:`Edge ${edge.id} has invalid directionality.`,entityId:edge.id})
  if(typeof edge.enabled!=='boolean')issues.push({severity:'error',code:'edge_enabled',message:`Edge ${edge.id} enabled state must be boolean.`,entityId:edge.id})
  if(!integerIn(edge.capacityPerTick,1,200))issues.push({severity:'error',code:'edge_capacity',message:`Edge ${edge.id} capacity must be an integer from 1 to 200 per tick.`,entityId:edge.id})
  if(!integerIn(edge.travelTicks,1,100))issues.push({severity:'error',code:'travel_ticks',message:`Edge ${edge.id} travel time must be an integer from 1 to 100 ticks.`,entityId:edge.id})
  if(edge.lengthMeters===null)issues.push({severity:'warning',code:'length_unspecified',message:`Edge ${edge.id} physical length is not specified in Appendix A.`,entityId:edge.id});else if(!Number.isFinite(edge.lengthMeters)||edge.lengthMeters<=0)issues.push({severity:'error',code:'edge_length',message:`Edge ${edge.id} length must be a positive finite number or null when unknown.`,entityId:edge.id})
  if(!edge.disruption||typeof edge.disruption.active!=='boolean'||(edge.disruption.kind!==null&&!['closure','capacity_reduction','travel_delay','other'].includes(edge.disruption.kind))||(edge.disruption.description!==null&&typeof edge.disruption.description!=='string')||(edge.disruption.active&&(!edge.disruption.kind||!edge.disruption.description?.trim())))issues.push({severity:'error',code:'disruption_metadata',message:`Edge ${edge.id} disruption metadata is incomplete.`,entityId:edge.id})
 }
 if(activeExits===0)issues.push({severity:'error',code:'active_exit',message:'At least one enabled EXIT with positive service capacity is required.'})
 if(!integerIn(scenario.deadlineTicks,1,1000))issues.push({severity:'error',code:'deadline',message:'Deadline must be an integer from 1 to 1000 ticks.'})
 if(!Number.isFinite(scenario.constraints.minimumEvacuationFraction)||scenario.constraints.minimumEvacuationFraction<0||scenario.constraints.minimumEvacuationFraction>1)issues.push({severity:'error',code:'evacuation_threshold',message:'Minimum evacuation fraction must be between 0 and 1.'})
 if(!integerIn(scenario.constraints.maximumUnreachableAgents,0,200))issues.push({severity:'error',code:'unreachable_threshold',message:'Maximum unreachable agents must be an integer from 0 to 200.'})
 if(totalAgents<1||totalAgents>200)issues.push({severity:'error',code:'total_population',message:'Total origin population must be from 1 to 200 agents.'})
 return issues
}
export function isValidScenario(scenario:ScenarioData):boolean{return validateScenario(scenario).every(issue=>issue.severity!=='error')}
export function isExit(node:GraphNode):node is Extract<GraphNode,{type:'EXIT'}>{return node.type==='EXIT'}
