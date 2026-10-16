import assert from 'node:assert/strict'
import test from 'node:test'
import {BASELINE_SCENARIO} from '../src/graph/baseline.ts'
import {addEdge,createScenario,deserializeScenario,highlightEntities,restoreSnapshot,saveSnapshot,selectEntity,serializeScenario,toggleEdge,updateEdge,updateNode,updateOriginPopulation} from '../src/graph/scenario.ts'
import {validateScenario} from '../src/graph/validate.ts'
import type {ScenarioData} from '../src/graph/types.ts'

const copyBaseline=():ScenarioData=>structuredClone(BASELINE_SCENARIO)
const errors=(scenario:ScenarioData)=>validateScenario(scenario).filter(issue=>issue.severity==='error')

test('loads the canonical 15-node, 22-link, 80-agent Appendix A baseline',()=>{
 assert.equal(BASELINE_SCENARIO.nodes.length,15);assert.equal(BASELINE_SCENARIO.edges.length,22)
 assert.equal(BASELINE_SCENARIO.originGroups.reduce((sum,group)=>sum+group.initialAgents,0),80)
 assert.equal(BASELINE_SCENARIO.deadlineTicks,20);assert.deepEqual(errors(copyBaseline()),[])
})
test('rejects duplicate IDs and missing endpoints',()=>{
 const duplicate=copyBaseline();duplicate.nodes[1].id=duplicate.nodes[0].id
 assert.ok(errors(duplicate).some(issue=>issue.code==='duplicate_id'))
 const invalidId=copyBaseline();invalidId.nodes[0].id=' '
 assert.ok(errors(invalidId).some(issue=>issue.code==='invalid_id'))
 const missing=copyBaseline();missing.edges[0].endpointB='NO-SUCH-NODE'
 assert.ok(errors(missing).some(issue=>issue.code==='missing_endpoint'))
})
test('rejects invalid capacities and lengths while allowing unspecified canonical lengths',()=>{
 const scenario=copyBaseline();scenario.edges[0].capacityPerTick=0;scenario.edges[1].lengthMeters=-1
 assert.ok(errors(scenario).some(issue=>issue.code==='edge_capacity'))
 assert.ok(errors(scenario).some(issue=>issue.code==='edge_length'))
 assert.ok(validateScenario(copyBaseline()).some(issue=>issue.code==='length_unspecified'&&issue.severity==='warning'))
})
test('disabled edges remain explicit valid records and carry closure metadata',()=>{
 const state=toggleEdge(createScenario(),'L09');const edge=state.scenario.edges.find(item=>item.id==='L09')!
 assert.equal(edge.enabled,false);assert.equal(edge.disruption.active,true);assert.equal(edge.disruption.kind,'closure');assert.deepEqual(errors(state.scenario),[])
})
test('directed edges preserve exactly the configured permitted direction',()=>{
 const scenario=copyBaseline();scenario.edges[0].direction='A_TO_B'
 assert.deepEqual(errors(scenario),[]);assert.equal(scenario.edges[0].endpointA,'J-NORTH');assert.equal(scenario.edges[0].endpointB,'J-NE');assert.equal(scenario.edges[0].direction,'A_TO_B')
 const invalid=copyBaseline();(invalid.edges[0] as {direction:string}).direction='SIDEWAYS';assert.ok(errors(invalid).some(issue=>issue.code==='edge_direction'))
})
test('snapshot restoration restores scenario and selection without mutating baseline',()=>{
 let state=createScenario();state=saveSnapshot(state);state=updateEdge(state,'L09',{enabled:false,capacityPerTick:3});state=updateOriginPopulation(state,'ORIGIN-S-DORM',20)
 const restored=restoreSnapshot(state)
 assert.equal(restored.scenario.edges.find(edge=>edge.id==='L09')?.enabled,true)
 assert.equal(restored.scenario.originGroups.find(group=>group.nodeId==='S-DORM')?.initialAgents,24)
 assert.equal(restored.selectedEntity?.id,'J-NORTH');assert.equal(BASELINE_SCENARIO.edges.find(edge=>edge.id==='L09')?.enabled,true)
})
test('scenario JSON round-trips; edge toggles and edits stay isolated from baseline',()=>{
 let state=createScenario();state=updateEdge(state,'L10',{direction:'B_TO_A',travelTicks:3})
 const decoded=deserializeScenario(serializeScenario(state.scenario));assert.equal(decoded.edges.find(edge=>edge.id==='L10')?.direction,'B_TO_A');assert.equal(decoded.edges.find(edge=>edge.id==='L10')?.travelTicks,3)
 assert.equal(BASELINE_SCENARIO.edges.find(edge=>edge.id==='L10')?.travelTicks,2)
})
test('selection and highlights accept graph node and link IDs only',()=>{
 let state=createScenario();state=selectEntity(state,{kind:'edge',id:'L02'});state=highlightEntities(state,['L02','J-NORTH','not-a-graph-entity','L02'])
 assert.deepEqual(state.selectedEntity,{kind:'edge',id:'L02'});assert.deepEqual(state.highlightedEntityIds,['L02','J-NORTH'])
})
test('disabling a junction disables its incident links in the same scenario edit',()=>{
 const state=updateNode(createScenario(),'J-NORTH',{enabled:false});assert.equal(state.scenario.nodes.find(node=>node.id==='J-NORTH')?.enabled,false)
 assert.ok(state.scenario.edges.filter(edge=>edge.endpointA==='J-NORTH'||edge.endpointB==='J-NORTH').every(edge=>!edge.enabled&&edge.disruption.kind==='closure'))
 assert.deepEqual(errors(state.scenario),[])
})
test('adds explicit links without deriving length from layout coordinates',()=>{
 const edge={id:'L23',endpointA:'S-DORM',endpointB:'J-NW',direction:'BIDIRECTIONAL' as const,lengthMeters:null,capacityPerTick:4,travelTicks:2,enabled:true,disruption:{active:false,kind:null,description:null}}
 const state=addEdge(createScenario(),edge);assert.equal(state.scenario.edges.at(-1)?.id,'L23');assert.equal(state.scenario.edges.at(-1)?.lengthMeters,null);assert.deepEqual(errors(state.scenario),[])
})
