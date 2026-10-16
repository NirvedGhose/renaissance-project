import assert from 'node:assert/strict'
import test from 'node:test'
import {BASELINE_SCENARIO} from '../src/graph/baseline.ts'
import {runSimulation,resetSimulation,setSimulationEdgeEnabled,stepSimulation,validateSimulationInput} from '../src/simulation/engine.ts'
import type {ScenarioData} from '../src/graph/types.ts'

const copyBaseline=():ScenarioData=>structuredClone(BASELINE_SCENARIO)
function smallScenario({population=3,edgeCapacity=3,exitCapacity=3,deadline=6,travelTicks=1}:{population?:number;edgeCapacity?:number;exitCapacity?:number;deadline?:number;travelTicks?:number}={}):ScenarioData{return{
 schemaVersion:1,id:'small-test',name:'Small deterministic fixture',nodes:[
  {id:'S-A',label:'Origin',type:'START',x:0,y:0,enabled:true,holdingCapacity:null,processingDelayTicks:0},
  {id:'E-A',label:'Exit',type:'EXIT',x:100,y:0,enabled:true,holdingCapacity:null,processingDelayTicks:0,serviceCapacityPerTick:exitCapacity},
 ],edges:[{id:'L01',endpointA:'S-A',endpointB:'E-A',direction:'BIDIRECTIONAL',lengthMeters:null,capacityPerTick:edgeCapacity,travelTicks,enabled:true,disruption:{active:false,kind:null,description:null}}],originGroups:[{id:'O-A',nodeId:'S-A',initialAgents:population}],deadlineTicks:deadline,constraints:{minimumEvacuationFraction:.95,maximumUnreachableAgents:0},
}}

test('Appendix A baseline passes its documented acceptance gate by tick 20',()=>{
 const result=runSimulation(BASELINE_SCENARIO)
 assert.equal(result.totalAgents,80);assert.equal(result.unreachableAgents,0)
 assert.equal(result.evacuatedByDeadline,80);assert.ok(result.tick<=20)
 assert.deepEqual(result.failedConstraints,[]);assert.equal(result.completionTick,result.tick)
})
test('same scenario produces identical event and state timelines',()=>{
 const scenario=smallScenario();assert.deepEqual(runSimulation(scenario),runSimulation(scenario))
})
test('an origin with both access links closed is unreachable before tick one',()=>{
 const scenario=copyBaseline();for(const id of ['L09','L10']){const edge=scenario.edges.find(item=>item.id===id)!;edge.enabled=false;edge.disruption={active:true,kind:'closure',description:'Test closure'}}
 const result=runSimulation(scenario);assert.equal(result.unreachableAgents,24);assert.ok(result.tick<20);assert.equal(result.eventLog.find(event=>event.type==='agent_unreachable')?.tick,0)
})
test('a blocked link is excluded from routing and the alternate route is used',()=>{
 const scenario=copyBaseline();scenario.edges.find(edge=>edge.id==='L09')!.enabled=false
 const result=runSimulation(scenario);assert.equal(result.unreachableAgents,0);assert.ok(!result.eventLog.some(event=>event.type==='edge_entered'&&event.edgeId==='L09'))
})
test('per-direction link capacity limits entries and resets on each tick',()=>{
 const result=runSimulation(smallScenario({edgeCapacity:1,exitCapacity:3}))
 assert.equal(result.evacuatedByDeadline,3);assert.equal(result.linkWaitCount,3);assert.equal(result.saturatedEdges.length,1)
 assert.equal(result.tickStates[1].edgeUtilisation['L01'].directions.find(direction=>direction.fromNodeId==='S-A')?.usedThisTick,1)
 assert.equal(result.tickStates[2].edgeUtilisation['L01'].directions.find(direction=>direction.fromNodeId==='S-A')?.usedThisTick,1)
})
test('exit service queues are ordered by stable numeric agent ID',()=>{
 const result=runSimulation(smallScenario({edgeCapacity:3,exitCapacity:1}))
 assert.equal(result.exitWaitCount,3);assert.deepEqual(result.exitAdmissions['E-A'],['AG-0001','AG-0002','AG-0003'])
 assert.deepEqual(result.tickStates[2].nodeQueues['E-A'],['AG-0002','AG-0003'])
})
test('finite node holding capacity keeps excess arrivals on their current link',()=>{
 const scenario=smallScenario({edgeCapacity:3,exitCapacity:3});scenario.nodes.push({id:'J-A',label:'Holding junction',type:'JUNCTION',x:50,y:0,enabled:true,holdingCapacity:1,processingDelayTicks:0});scenario.edges[0].endpointB='J-A';scenario.edges.push({id:'L02',endpointA:'J-A',endpointB:'E-A',direction:'BIDIRECTIONAL',lengthMeters:null,capacityPerTick:3,travelTicks:1,enabled:true,disruption:{active:false,kind:null,description:null}})
 const result=runSimulation(scenario);assert.equal(result.nodeCapacityWaitCount,3);assert.equal(result.evacuatedByDeadline,3)
})
test('node processing delay holds an arrival until its eligible tick',()=>{
 const scenario=smallScenario({population:1});scenario.nodes.find(node=>node.id==='E-A')!.processingDelayTicks=1
 const result=runSimulation(scenario);assert.equal(result.completionTick,3);assert.ok(!result.tickStates[2].agents.some(agent=>agent.status==='evacuated'))
})
test('runtime link loss replans waiting agents deterministically',()=>{
 const initial=resetSimulation(BASELINE_SCENARIO);const blocked=setSimulationEdgeEnabled(initial,'L09',false);const next=stepSimulation(blocked)
 assert.ok(next.events.some(event=>event.type==='agent_rerouted'&&event.agentId==='AG-0021'&&event.routeEdgeIds?.[0]==='L10'))
 assert.equal(initial.scenario.edges.find(edge=>edge.id==='L09')?.enabled,true)
})
test('deadline expiry reports unserved agents and the configured evacuation target violation',()=>{
 const result=runSimulation(smallScenario({edgeCapacity:1,exitCapacity:1,deadline:1}))
 assert.equal(result.tick,1);assert.equal(result.evacuatedByDeadline,0);assert.equal(result.remainingAgents,3);assert.equal(result.completionTick,null)
 assert.equal(result.deadlineViolations[0]?.code,'EVACUATION_TARGET_NOT_MET_BY_DEADLINE')
})
test('input rejects an origin population above its finite holding capacity',()=>{
 const scenario=smallScenario();scenario.nodes[0].holdingCapacity=2
 const validation=validateSimulationInput(scenario);assert.equal(validation.valid,false);assert.ok(validation.issues.some(issue=>issue.code==='initial_holding_capacity'))
})
