import {BASELINE_SCENARIO} from './baseline.ts'
import {isValidScenario,validateScenario} from './validate.ts'
import type {EdgeId,GraphEdge,GraphNode,NodeId,ScenarioData,ScenarioSnapshot,SelectedGraphEntity} from './types.ts'

export type ScenarioWorkspace={scenario:ScenarioData;selectedEntity:SelectedGraphEntity;highlightedEntityIds:string[];savedSnapshot:ScenarioSnapshot|null}
export type EditableNodeFields=Partial<Pick<GraphNode,'label'|'x'|'y'|'enabled'|'holdingCapacity'|'processingDelayTicks'>>&{serviceCapacityPerTick?:number}
const copy=<T,>(value:T):T=>structuredClone(value)
export class ScenarioValidationError extends Error{readonly issues:ReturnType<typeof validateScenario>;constructor(issues:ReturnType<typeof validateScenario>){super(issues.filter(i=>i.severity==='error').map(i=>i.message).join(' '));this.issues=issues;this.name='ScenarioValidationError'}}
function assertValid(scenario:ScenarioData){const issues=validateScenario(scenario);if(issues.some(i=>i.severity==='error'))throw new ScenarioValidationError(issues)}
export function createScenario():ScenarioWorkspace{return{scenario:copy(BASELINE_SCENARIO) as ScenarioData,selectedEntity:{kind:'node',id:'J-NORTH'},highlightedEntityIds:[],savedSnapshot:null}}
export function selectEntity(state:ScenarioWorkspace,entity:SelectedGraphEntity):ScenarioWorkspace{return{...state,selectedEntity:entity?{...entity}:null}}
export function highlightEntities(state:ScenarioWorkspace,ids:string[]):ScenarioWorkspace{const known=new Set([...state.scenario.nodes.map(n=>n.id),...state.scenario.edges.map(e=>e.id)]);return{...state,highlightedEntityIds:[...new Set(ids)].filter(id=>known.has(id))}}
export function updateNode(state:ScenarioWorkspace,id:NodeId,patch:EditableNodeFields):ScenarioWorkspace{
 const scenario=copy(state.scenario);const index=scenario.nodes.findIndex(node=>node.id===id);if(index<0)throw new Error(`Unknown node ${id}`);scenario.nodes[index]={...scenario.nodes[index],...patch} as GraphNode
 if(patch.enabled===false)scenario.edges=scenario.edges.map(edge=>edge.endpointA===id||edge.endpointB===id?{...edge,enabled:false,disruption:{active:true,kind:'closure',description:`Endpoint ${id} disabled`}}:edge)
 assertValid(scenario);return{...state,scenario}
}
export function updateEdge(state:ScenarioWorkspace,id:EdgeId,patch:Partial<Pick<GraphEdge,'direction'|'lengthMeters'|'capacityPerTick'|'travelTicks'|'enabled'|'disruption'>>):ScenarioWorkspace{const scenario=copy(state.scenario);const index=scenario.edges.findIndex(edge=>edge.id===id);if(index<0)throw new Error(`Unknown edge ${id}`);scenario.edges[index]={...scenario.edges[index],...patch};assertValid(scenario);return{...state,scenario}}
export function toggleEdge(state:ScenarioWorkspace,id:EdgeId):ScenarioWorkspace{const edge=state.scenario.edges.find(item=>item.id===id);if(!edge)throw new Error(`Unknown edge ${id}`);const enabled=!edge.enabled;return updateEdge(state,id,{enabled,disruption:enabled?{active:false,kind:null,description:null}:{active:true,kind:'closure',description:'Disabled in editable scenario'}})}
export function updateOriginPopulation(state:ScenarioWorkspace,originId:string,initialAgents:number):ScenarioWorkspace{const scenario=copy(state.scenario);const index=scenario.originGroups.findIndex(group=>group.id===originId);if(index<0)throw new Error(`Unknown origin group ${originId}`);scenario.originGroups[index]={...scenario.originGroups[index],initialAgents};assertValid(scenario);return{...state,scenario}}
export function addEdge(state:ScenarioWorkspace,edge:GraphEdge):ScenarioWorkspace{const scenario=copy(state.scenario);scenario.edges.push(copy(edge));assertValid(scenario);return{...state,scenario,selectedEntity:{kind:'edge',id:edge.id}}}
export function saveSnapshot(state:ScenarioWorkspace):ScenarioWorkspace{const snapshot:ScenarioSnapshot={scenario:copy(state.scenario),selectedEntity:state.selectedEntity?{...state.selectedEntity}:null,highlightedEntityIds:[...state.highlightedEntityIds]};return{...state,savedSnapshot:snapshot}}
export function restoreSnapshot(state:ScenarioWorkspace,snapshot:ScenarioSnapshot|null=state.savedSnapshot):ScenarioWorkspace{if(!snapshot)throw new Error('No saved scenario snapshot exists.');assertValid(snapshot.scenario);return{...state,scenario:copy(snapshot.scenario),selectedEntity:snapshot.selectedEntity?{...snapshot.selectedEntity}:null,highlightedEntityIds:[...snapshot.highlightedEntityIds],savedSnapshot:copy(snapshot)}}
export function resetToBaseline(state:ScenarioWorkspace):ScenarioWorkspace{return{...createScenario(),savedSnapshot:state.savedSnapshot}}
export function serializeScenario(scenario:ScenarioData,pretty=false):string{assertValid(scenario);return JSON.stringify(scenario,null,pretty?2:undefined)}
export function deserializeScenario(serialized:string):ScenarioData{let value:unknown;try{value=JSON.parse(serialized)}catch{throw new Error('Scenario JSON is not valid JSON.')}if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Scenario JSON must contain an object.');const scenario=value as ScenarioData;assertValid(scenario);return copy(scenario)}

/** Explicitly expose immutable source separately from the editable workspace. */
export {BASELINE_SCENARIO}
export function isUnmodifiedBaseline(state:ScenarioWorkspace):boolean{return JSON.stringify(state.scenario)===JSON.stringify(BASELINE_SCENARIO)&&isValidScenario(state.scenario)}
