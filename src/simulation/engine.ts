import {validateScenario} from '../graph/validate.ts'
import type {GraphEdge,GraphNode,ScenarioData,ValidationIssue} from '../graph/types.ts'
import type {EdgeDirectionUtilisation,EdgeUtilisation,EngineError,FeasibleRoute,RoutingArc,SimulationAgent,SimulationEvent,SimulationResult,SimulationState,SimulationTickState,SimulationValidationResult} from './types.ts'

/**
 * FRACTURE deterministic tick contract
 * 1. tick 0 is the initial population and fixed shortest-time routes.
 * 2. Each tick advances transit first; a travelTicks=1 link entered at t arrives at t+1.
 *    Completed arrivals are admitted in agent-ID order, subject to destination holding capacity.
 *    A blocked arrival remains on its link at remainingTravelTicks=0 and retries next tick.
 * 3. Active exit queues are served by exit ID, then numeric agent ID, before departures.
 * 4. Per-direction link-entry capacities reset; B-to-A and A-to-B have independent counters.
 * 5. Non-exit nodes are processed by node ID; agents at each node are processed by numeric ID.
 * 6. A node arrival with zero processing delay may depart later in that same tick. A delay d
 *    makes it eligible at arrivalTick+d. Tick-0 origins are first eligible at tick 1+d.
 * 7. Routes remain fixed unless a caller explicitly disables a link between steps. In-flight
 *    agents complete their current link, then deterministically replan at the next node.
 *    This is an opt-in extension to the spec's static v1 disruption assumption.
 * 8. Agents without a route at tick 0 are unreachable and remain represented at their origin;
 *    agents that lose all routes after a live edit become stranded. Neither is silently dropped.
 */

type Path={nodeIds:string[];edgeIds:string[];travelTicks:number}
const compareText=(a:string,b:string)=>a<b?-1:a>b?1:0
function compareSequences(a:string[],b:string[]):number{for(let i=0;i<Math.min(a.length,b.length);i++){const c=compareText(a[i],b[i]);if(c!==0)return c}return a.length-b.length}
function comparePath(a:Path,b:Path):number{return a.travelTicks-b.travelTicks||compareSequences(a.nodeIds,b.nodeIds)||compareSequences(a.edgeIds,b.edgeIds)}
function arcKey(edgeId:string,from:string,to:string):string{return`${edgeId}:${from}>${to}`}
function buildArcs(scenario:ScenarioData):RoutingArc[]{const nodes=new Map(scenario.nodes.map(node=>[node.id,node]));const arcs:RoutingArc[]=[];for(const edge of scenario.edges){if(!edge.enabled)continue;const a=nodes.get(edge.endpointA),b=nodes.get(edge.endpointB);if(!a?.enabled||!b?.enabled)continue;const add=(fromNodeId:string,toNodeId:string)=>arcs.push({edge,fromNodeId,toNodeId,capacityKey:arcKey(edge.id,fromNodeId,toNodeId)});if(edge.direction==='BIDIRECTIONAL'||edge.direction==='A_TO_B')add(edge.endpointA,edge.endpointB);if(edge.direction==='BIDIRECTIONAL'||edge.direction==='B_TO_A')add(edge.endpointB,edge.endpointA)}return arcs.sort((a,b)=>compareText(a.fromNodeId,b.fromNodeId)||compareText(a.toNodeId,b.toNodeId)||compareText(a.edge.id,b.edge.id))}
function routeCandidateCompare(a:FeasibleRoute,b:FeasibleRoute):number{return a.travelTicks-b.travelTicks||compareText(a.exitNodeId,b.exitNodeId)||compareSequences(a.nodeIds,b.nodeIds)||compareSequences(a.edgeIds,b.edgeIds)}

/** Deterministic Dijkstra with the specification's exit, node-path, then link-ID tie-breaks. */
export function findFeasibleRoute(scenario:ScenarioData,startNodeId:string):FeasibleRoute|null{
 const nodeMap=new Map(scenario.nodes.map(node=>[node.id,node]));const start=nodeMap.get(startNodeId);if(!start?.enabled)return null
 const outgoing=new Map<string,RoutingArc[]>();for(const arc of buildArcs(scenario)){const list=outgoing.get(arc.fromNodeId)??[];list.push(arc);outgoing.set(arc.fromNodeId,list)}
 const best=new Map<string,Path>();const initial:Path={nodeIds:[startNodeId],edgeIds:[],travelTicks:0};best.set(startNodeId,initial);const open:[string,Path][]=[[startNodeId,initial]]
 while(open.length){open.sort((a,b)=>comparePath(a[1],b[1])||compareText(a[0],b[0]));const[currentId,path]=open.shift()!;if(best.get(currentId)!==path)continue;const current=nodeMap.get(currentId);if(!current||current.type==='EXIT')continue
  for(const arc of outgoing.get(currentId)??[]){const target=nodeMap.get(arc.toNodeId);if(!target?.enabled||path.nodeIds.includes(target.id))continue;const candidate:Path={nodeIds:[...path.nodeIds,target.id],edgeIds:[...path.edgeIds,arc.edge.id],travelTicks:path.travelTicks+arc.edge.travelTicks};const prior=best.get(target.id);if(!prior||comparePath(candidate,prior)<0){best.set(target.id,candidate);open.push([target.id,candidate])}}
 }
 let selected:FeasibleRoute|null=null
 for(const node of scenario.nodes){if(node.type!=='EXIT'||!node.enabled||node.serviceCapacityPerTick<=0)continue;const path=best.get(node.id);if(!path)continue;const candidate:FeasibleRoute={originNodeId:startNodeId,exitNodeId:node.id,nodeIds:[...path.nodeIds],edgeIds:[...path.edgeIds],travelTicks:path.travelTicks};if(!selected||routeCandidateCompare(candidate,selected)<0)selected=candidate}
 return selected
}
export function computeFeasibleRoutes(scenario:ScenarioData):Record<string,FeasibleRoute|null>{const result:Record<string,FeasibleRoute|null>={};for(const group of [...scenario.originGroups].sort((a,b)=>compareText(a.nodeId,b.nodeId)))result[group.nodeId]=findFeasibleRoute(scenario,group.nodeId);return result}

export function validateSimulationInput(scenario:ScenarioData):SimulationValidationResult{
 const issues:ValidationIssue[]=[...validateScenario(scenario)]
 if(Number.isInteger(scenario?.deadlineTicks)&&scenario.deadlineTicks>100)issues.push({severity:'error',code:'simulation_deadline',message:'Simulation deadline must be between 1 and 100 ticks.'})
 const nodeMap=new Map((scenario?.nodes??[]).map(node=>[node.id,node]));for(const group of scenario?.originGroups??[]){const node=nodeMap.get(group.nodeId);if(node?.type==='START'&&node.holdingCapacity!==null&&group.initialAgents>node.holdingCapacity)issues.push({severity:'error',code:'initial_holding_capacity',message:`Origin ${group.id} population exceeds node ${node.id} holding capacity.`,entityId:node.id})}
 return{valid:issues.every(issue=>issue.severity!=='error'),issues}
}
export class SimulationInputError extends Error{readonly issues:ValidationIssue[];constructor(issues:ValidationIssue[]){super(issues.filter(issue=>issue.severity==='error').map(issue=>issue.message).join(' '));this.issues=issues;this.name='SimulationInputError'}}
function assertInput(scenario:ScenarioData){const result=validateSimulationInput(scenario);if(!result.valid)throw new SimulationInputError(result.issues)}
function formatAgentId(sequence:number):string{return`AG-${String(sequence).padStart(4,'0')}`}
function emit(state:SimulationState,event:Omit<SimulationEvent,'order'>){state.events.push({...event,order:state.events.length})}

function makeTickSnapshot(state:SimulationState,tick:number,arcUse:Map<string,number>,exitArrivals:Record<string,string[]>):SimulationTickState{
 const nodeCounts:Record<string,number>={},nodeQueues:Record<string,string[]>={},edgeOccupancy:Record<string,string[]>={}
 for(const node of state.scenario.nodes)nodeCounts[node.id]=0
 for(const agent of state.agents){if(agent.currentNodeId!==null&&agent.location==='node'&&['waiting','unreachable','stranded'].includes(agent.status)){nodeCounts[agent.currentNodeId]=(nodeCounts[agent.currentNodeId]??0)+1;if(agent.status==='waiting'){const queue=nodeQueues[agent.currentNodeId]??[];queue.push(agent.id);nodeQueues[agent.currentNodeId]=queue}}
  if(agent.location==='edge'&&agent.edgeId){const queue=edgeOccupancy[agent.edgeId]??[];queue.push(agent.id);edgeOccupancy[agent.edgeId]=queue}}
 for(const ids of Object.values(nodeQueues))ids.sort((a,b)=>Number(a.slice(3))-Number(b.slice(3)));for(const ids of Object.values(edgeOccupancy))ids.sort((a,b)=>Number(a.slice(3))-Number(b.slice(3)))
 const arcs=buildArcs(state.scenario);const edgeUtilisation:Record<string,EdgeUtilisation>={}
 for(const edge of state.scenario.edges){const directions=arcs.filter(arc=>arc.edge.id===edge.id).map(arc=>{const used=arcUse.get(arc.capacityKey)??0;let inTransit=0;for(const agent of state.agents)if(agent.status==='in_transit'&&agent.edgeId===edge.id&&agent.fromNodeId===arc.fromNodeId&&agent.toNodeId===arc.toNodeId)inTransit++;return{edgeId:edge.id,fromNodeId:arc.fromNodeId,toNodeId:arc.toNodeId,usedThisTick:used,capacity:edge.capacityPerTick,maximumUsed:state.maximumArcUse[arc.capacityKey]??0,inTransit}});edgeUtilisation[edge.id]={edgeId:edge.id,enabled:edge.enabled,directions}}
 return{tick,agents:structuredClone(state.agents),nodeCounts,nodeQueues,edgeOccupancy,edgeUtilisation,exitArrivalsThisTick:structuredClone(exitArrivals),evacuatedCount:state.agents.filter(agent=>agent.status==='evacuated').length,remainingCount:state.agents.filter(agent=>agent.status!=='evacuated').length}
}
function activeAgents(state:SimulationState):SimulationAgent[]{return state.agents.filter(agent=>agent.status==='waiting'||agent.status==='in_transit')}

export function resetSimulation(scenario:ScenarioData):SimulationState{
 assertInput(scenario);const model=structuredClone(scenario) as ScenarioData;const routes=computeFeasibleRoutes(model);const sortedGroups=[...model.originGroups].sort((a,b)=>compareText(a.nodeId,b.nodeId));const agents:SimulationAgent[]=[];const events:SimulationEvent[]=[];let sequence=0
 for(const group of sortedGroups){const route=routes[group.nodeId]??null;for(let i=0;i<group.initialAgents;i++){sequence++;const id=formatAgentId(sequence);const agent:SimulationAgent={sequence,id,originNodeId:group.nodeId,currentNodeId:group.nodeId,location:'node',route:route?structuredClone(route):null,routeNodeIndex:0,readyAtTick:1+(model.nodes.find(node=>node.id===group.nodeId)?.processingDelayTicks??0),status:route?'waiting':'unreachable'};agents.push(agent);if(route)events.push({tick:0,order:events.length,type:'route_assigned',agentId:id,nodeId:group.nodeId,exitNodeId:route.exitNodeId,routeEdgeIds:[...route.edgeIds]});else events.push({tick:0,order:events.length,type:'agent_unreachable',agentId:id,nodeId:group.nodeId,reason:'No enabled route to an enabled exit with positive service capacity.'})}}
 const state:SimulationState={scenario:model,tick:0,agents,events,timeline:[],initialUnreachableAgentIds:agents.filter(agent=>agent.status==='unreachable').map(agent=>agent.id),exitArrivalRecords:[],exitAdmissionRecords:[],linkWaitCount:0,exitWaitCount:0,nodeCapacityWaitCount:0,nodeProcessingWaitCount:0,maxLinkQueue:0,maximumArcUse:{},pendingEdgeChanges:[],terminal:false,terminalReason:null,engineErrors:[]}
 state.terminal=activeAgents(state).length===0;if(state.terminal){state.terminalReason='all_resolved';emit(state,{tick:0,type:'simulation_stopped',reason:'No reachable agents require timed simulation.'})}
 state.timeline.push(makeTickSnapshot(state,0,new Map(),{}));return state
}

function arcFor(scenario:ScenarioData,edge:GraphEdge,from:string,to:string):RoutingArc|null{return buildArcs(scenario).find(arc=>arc.edge.id===edge.id&&arc.fromNodeId===from&&arc.toNodeId===to)??null}
function remainingRouteAvailable(state:SimulationState,agent:SimulationAgent):boolean{if(!agent.route||agent.currentNodeId===null)return false;if(agent.route.nodeIds[agent.routeNodeIndex]!==agent.currentNodeId)return false;for(let i=agent.routeNodeIndex;i<agent.route.edgeIds.length;i++){const edge=state.scenario.edges.find(item=>item.id===agent.route!.edgeIds[i]);const from=agent.route.nodeIds[i],to=agent.route.nodeIds[i+1];if(!edge||!arcFor(state.scenario,edge,from,to))return false}return true}
function occupancyAt(state:SimulationState,nodeId:string):number{return state.agents.filter(agent=>agent.location==='node'&&agent.currentNodeId===nodeId&&['waiting','unreachable','stranded'].includes(agent.status)).length}
function finishIfNeeded(state:SimulationState):void{if(state.terminal)return;if(state.tick>=state.scenario.deadlineTicks){state.terminal=true;state.terminalReason='deadline';emit(state,{tick:state.tick,type:'simulation_stopped',reason:'Configured deadline reached.'})}else if(activeAgents(state).length===0){state.terminal=true;state.terminalReason='all_resolved';emit(state,{tick:state.tick,type:'simulation_stopped',reason:'All reachable agents are evacuated or stranded.'})}}

/** Advance exactly one tick. The input state is not mutated. */
export function stepSimulation(input:SimulationState):SimulationState{
 if(input.terminal)return input;const state=structuredClone(input) as SimulationState;const tick=state.tick+1;state.tick=tick;const arcUse=new Map<string,number>();const exitArrivalsThisTick:Record<string,string[]>={}
 for(const change of state.pendingEdgeChanges)emit(state,{tick,type:'network_edge_changed',edgeId:change.edgeId,reason:change.enabled?'enabled':'disabled'})
 state.pendingEdgeChanges=[]
 const nodeMap=new Map(state.scenario.nodes.map(node=>[node.id,node]))
 // Phase 1: advance existing transit and attempt node-capacity admission.
 for(const agent of state.agents.filter(item=>item.status==='in_transit').sort((a,b)=>a.sequence-b.sequence)){
  if(agent.remainingTravelTicks===undefined||!agent.toNodeId){const error:EngineError={id:'SIM-TRANSIT-STATE',message:'An in-transit agent has no destination or travel countdown.',tick,agentId:agent.id};state.engineErrors.push(error);emit(state,{tick,type:'engine_error',agentId:agent.id,engineErrorId:error.id,reason:error.message});state.terminal=true;state.terminalReason='engine_error';break}
  if(agent.remainingTravelTicks>1){agent.remainingTravelTicks--;continue}
  agent.remainingTravelTicks=0;const target=nodeMap.get(agent.toNodeId);if(!target){const error:EngineError={id:'SIM-ARRIVAL-ENDPOINT',message:`Transit destination ${agent.toNodeId} no longer exists.`,tick,agentId:agent.id};state.engineErrors.push(error);emit(state,{tick,type:'engine_error',agentId:agent.id,engineErrorId:error.id,reason:error.message});state.terminal=true;state.terminalReason='engine_error';break}
  if(target.holdingCapacity!==null&&occupancyAt(state,target.id)>=target.holdingCapacity){state.nodeCapacityWaitCount++;emit(state,{tick,type:'node_capacity_wait',agentId:agent.id,nodeId:target.id,edgeId:agent.edgeId,capacity:target.holdingCapacity});continue}
  const fromNodeId=agent.fromNodeId!,edgeId=agent.edgeId!;agent.status='waiting';agent.location='node';agent.currentNodeId=target.id;agent.routeNodeIndex++;agent.fromNodeId=undefined;agent.toNodeId=undefined;agent.edgeId=undefined;agent.remainingTravelTicks=undefined;agent.readyAtTick=tick+target.processingDelayTicks;emit(state,{tick,type:'node_arrived',agentId:agent.id,nodeId:target.id,fromNodeId,edgeId});
  if(target.type==='EXIT'){state.exitArrivalRecords.push({tick,exitNodeId:target.id,agentId:agent.id});const list=exitArrivalsThisTick[target.id]??[];list.push(agent.id);exitArrivalsThisTick[target.id]=list}
 }
 if(state.terminalReason==='engine_error'){state.terminal=true;state.timeline.push(makeTickSnapshot(state,tick,arcUse,exitArrivalsThisTick));return state}
 // Phase 2: exit throughput. Arrival-phase exit queues are eligible in this same tick.
 const exits=state.scenario.nodes.filter((node):node is Extract<GraphNode,{type:'EXIT'}>=>node.type==='EXIT'&&node.enabled&&node.serviceCapacityPerTick>0).sort((a,b)=>compareText(a.id,b.id))
 for(const exit of exits){const eligible=state.agents.filter(agent=>agent.status==='waiting'&&agent.currentNodeId===exit.id&&agent.readyAtTick<=tick).sort((a,b)=>a.sequence-b.sequence);const admitted=eligible.slice(0,exit.serviceCapacityPerTick);for(const agent of admitted){agent.status='evacuated';agent.location='evacuated';agent.currentNodeId=null;state.exitAdmissionRecords.push({tick,exitNodeId:exit.id,agentId:agent.id});emit(state,{tick,type:'agent_evacuated',agentId:agent.id,nodeId:exit.id,exitNodeId:exit.id})}for(const agent of eligible.slice(exit.serviceCapacityPerTick)){state.exitWaitCount++;emit(state,{tick,type:'exit_capacity_wait',agentId:agent.id,exitNodeId:exit.id,capacity:exit.serviceCapacityPerTick})}}
 // Phase 3 is the fresh arcUse map above: capacities reset independently by direction each tick.
 // Phase 4: non-exit node queues, in node-ID then agent-ID order.
 const nodeQueues=state.scenario.nodes.filter(node=>node.enabled&&node.type!=='EXIT').sort((a,b)=>compareText(a.id,b.id))
 for(const node of nodeQueues){const queued=state.agents.filter(agent=>agent.status==='waiting'&&agent.currentNodeId===node.id).sort((a,b)=>a.sequence-b.sequence);for(const agent of queued){if(agent.readyAtTick>tick){state.nodeProcessingWaitCount++;emit(state,{tick,type:'node_processing_wait',agentId:agent.id,nodeId:node.id});continue}
   if(!remainingRouteAvailable(state,agent)){const oldRoute=agent.route;const nextRoute=findFeasibleRoute(state.scenario,node.id);if(!nextRoute){agent.status='stranded';emit(state,{tick,type:'agent_stranded',agentId:agent.id,nodeId:node.id,reason:'No enabled route remains after a live network edit.'});continue}agent.route=nextRoute;agent.routeNodeIndex=0;if(oldRoute)emit(state,{tick,type:'agent_rerouted',agentId:agent.id,nodeId:node.id,exitNodeId:nextRoute.exitNodeId,routeEdgeIds:[...nextRoute.edgeIds],reason:'The previously assigned route contains an unavailable link.'})}
   const route=agent.route;const edgeId=route?.edgeIds[agent.routeNodeIndex];const toNodeId=route?.nodeIds[agent.routeNodeIndex+1];if(!route||!edgeId||!toNodeId){const error:EngineError={id:'SIM-ROUTE-NEXT-STEP',message:`Agent ${agent.id} has no valid next step at non-exit node ${node.id}.`,tick,agentId:agent.id};state.engineErrors.push(error);emit(state,{tick,type:'engine_error',agentId:agent.id,nodeId:node.id,engineErrorId:error.id,reason:error.message});state.terminal=true;state.terminalReason='engine_error';break}
   const edge=state.scenario.edges.find(item=>item.id===edgeId);const arc=edge?arcFor(state.scenario,edge,node.id,toNodeId):null;if(!edge||!arc){const error:EngineError={id:'SIM-ROUTE-ARC',message:`Assigned route for ${agent.id} references unavailable link ${edgeId}.`,tick,agentId:agent.id};state.engineErrors.push(error);emit(state,{tick,type:'engine_error',agentId:agent.id,nodeId:node.id,edgeId,engineErrorId:error.id,reason:error.message});state.terminal=true;state.terminalReason='engine_error';break}
   const used=arcUse.get(arc.capacityKey)??0;if(used>=edge.capacityPerTick){state.linkWaitCount++;emit(state,{tick,type:'link_capacity_wait',agentId:agent.id,nodeId:node.id,edgeId,capacity:edge.capacityPerTick,used});continue}
   arcUse.set(arc.capacityKey,used+1);state.maximumArcUse[arc.capacityKey]=Math.max(state.maximumArcUse[arc.capacityKey]??0,used+1);agent.status='in_transit';agent.location='edge';agent.currentNodeId=null;agent.edgeId=edge.id;agent.fromNodeId=node.id;agent.toNodeId=toNodeId;agent.remainingTravelTicks=edge.travelTicks;emit(state,{tick,type:'edge_entered',agentId:agent.id,fromNodeId:node.id,toNodeId,edgeId:edge.id})
  }if(state.terminalReason==='engine_error')break}
 // Queue metric is the largest number at one node waiting for one next directed arc.
 const groupedQueues=new Map<string,number>();for(const agent of state.agents){if(agent.status!=='waiting'||!agent.currentNodeId||!agent.route)continue;const edgeId=agent.route.edgeIds[agent.routeNodeIndex],to=agent.route.nodeIds[agent.routeNodeIndex+1];if(!edgeId||!to)continue;const edge=state.scenario.edges.find(item=>item.id===edgeId);if(!edge)continue;const key=`${agent.currentNodeId}|${arcKey(edgeId,agent.currentNodeId,to)}`;groupedQueues.set(key,(groupedQueues.get(key)??0)+1)}for(const size of groupedQueues.values())state.maxLinkQueue=Math.max(state.maxLinkQueue,size)
 finishIfNeeded(state);state.timeline.push(makeTickSnapshot(state,tick,arcUse,exitArrivalsThisTick));return state
}

/** Explicit live network edit hook; in-flight travelers keep traversing their current edge. */
export function setSimulationEdgeEnabled(input:SimulationState,edgeId:string,enabled:boolean):SimulationState{if(input.terminal)throw new Error('Cannot edit a terminal simulation state.');const state=structuredClone(input) as SimulationState;const edge=state.scenario.edges.find(item=>item.id===edgeId);if(!edge)throw new Error(`Unknown edge ${edgeId}.`);if(edge.enabled===enabled)return input;edge.enabled=enabled;edge.disruption=enabled?{active:false,kind:null,description:null}:{active:true,kind:'closure',description:'Disabled during simulation'};const validation=validateSimulationInput(state.scenario);if(!validation.valid)throw new SimulationInputError(validation.issues);state.pendingEdgeChanges.push({edgeId,enabled});return state}

export function buildSimulationResult(state:SimulationState):SimulationResult{
 const totalAgents=state.agents.length;const evacuatedByDeadline=state.agents.filter(agent=>agent.status==='evacuated').length;const unreachableAgents=state.initialUnreachableAgentIds.length;const strandedAgents=state.agents.filter(agent=>agent.status==='stranded').length;const fraction=totalAgents?evacuatedByDeadline/totalAgents:0;const requiredEvacuated=Math.ceil(totalAgents*state.scenario.constraints.minimumEvacuationFraction);const deadlineViolations:SimulationResult['deadlineViolations']=fraction<state.scenario.constraints.minimumEvacuationFraction?[{code:'EVACUATION_TARGET_NOT_MET_BY_DEADLINE',actualEvacuated:evacuatedByDeadline,requiredEvacuated,deadlineTicks:state.scenario.deadlineTicks}]:[];const failedConstraints:SimulationResult['failedConstraints']=[];if(fraction<state.scenario.constraints.minimumEvacuationFraction)failedConstraints.push({code:'MINIMUM_EVACUATION_FRACTION',actual:fraction,required:state.scenario.constraints.minimumEvacuationFraction});if(unreachableAgents>state.scenario.constraints.maximumUnreachableAgents)failedConstraints.push({code:'MAXIMUM_UNREACHABLE_AGENTS',actual:unreachableAgents,required:state.scenario.constraints.maximumUnreachableAgents})
 const allEdgeUtilisation=state.timeline.at(-1)?.edgeUtilisation??{};const saturatedEdges:EdgeDirectionUtilisation[]=[];for(const edge of Object.values(allEdgeUtilisation))for(const direction of edge.directions)if(direction.maximumUsed>=direction.capacity)saturatedEdges.push(direction)
 const exitArrivals:Record<string,string[]>={},exitAdmissions:Record<string,string[]>={};for(const record of state.exitArrivalRecords)(exitArrivals[record.exitNodeId]??=[]).push(record.agentId);for(const record of state.exitAdmissionRecords)(exitAdmissions[record.exitNodeId]??=[]).push(record.agentId)
 const remaining=state.agents.filter(agent=>agent.status!=='evacuated').sort((a,b)=>a.sequence-b.sequence);return{scenarioId:state.scenario.id,tick:state.tick,deadlineTicks:state.scenario.deadlineTicks,stoppedEarly:state.terminalReason==='all_resolved'&&state.tick<state.scenario.deadlineTicks,completionTick:evacuatedByDeadline===totalAgents?state.tick:null,totalAgents,initiallyReachableAgents:totalAgents-unreachableAgents,unreachableAgents,strandedAgents,evacuatedByDeadline,evacuationFraction:fraction,notEvacuatedByDeadline:totalAgents-evacuatedByDeadline,remainingAgents:remaining.length,remainingAgentIds:remaining.map(agent=>agent.id),inTransitAgents:state.agents.filter(agent=>agent.status==='in_transit').length,linkWaitCount:state.linkWaitCount,exitWaitCount:state.exitWaitCount,nodeCapacityWaitCount:state.nodeCapacityWaitCount,nodeProcessingWaitCount:state.nodeProcessingWaitCount,maxLinkQueue:state.maxLinkQueue,saturatedEdges,edgeUtilisation:structuredClone(allEdgeUtilisation),nodeQueues:structuredClone(state.timeline.at(-1)?.nodeQueues??{}),exitArrivals,exitAdmissions,deadlineViolations,failedConstraints,engineErrors:structuredClone(state.engineErrors),tickStates:structuredClone(state.timeline),eventLog:structuredClone(state.events)}
}
export function runSimulation(scenario:ScenarioData):SimulationResult{let state=resetSimulation(scenario);while(!state.terminal)state=stepSimulation(state);return buildSimulationResult(state)}

export function getArcDirectionKey(edgeId:string,fromNodeId:string,toNodeId:string):string{return arcKey(edgeId,fromNodeId,toNodeId)}
