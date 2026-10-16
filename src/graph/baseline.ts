import type {DeepReadonly,GraphEdge,GraphNode,OriginGroup,ScenarioData} from './types.ts'

const nodeBase={enabled:true,holdingCapacity:null,processingDelayTicks:0} as const
const nodes:GraphNode[]=[
 {id:'S-DORM',label:'North Dormitory',type:'START',x:250,y:90,...nodeBase},
 {id:'S-LIBRARY',label:'Library',type:'START',x:520,y:250,...nodeBase},
 {id:'S-LABS',label:'Science Laboratories',type:'START',x:520,y:520,...nodeBase},
 {id:'S-AUDITORIUM',label:'Auditorium',type:'START',x:250,y:650,...nodeBase},
 {id:'J-NORTH',label:'North Junction',type:'JUNCTION',x:390,y:130,...nodeBase},
 {id:'J-NE',label:'Northeast Junction',type:'JUNCTION',x:560,y:170,...nodeBase},
 {id:'J-EAST',label:'East Junction',type:'JUNCTION',x:650,y:300,...nodeBase},
 {id:'J-SE',label:'Southeast Junction',type:'JUNCTION',x:600,y:455,...nodeBase},
 {id:'J-SOUTH',label:'South Junction',type:'JUNCTION',x:450,y:565,...nodeBase},
 {id:'J-SW',label:'Southwest Junction',type:'JUNCTION',x:300,y:535,...nodeBase},
 {id:'J-WEST',label:'West Junction',type:'JUNCTION',x:210,y:390,...nodeBase},
 {id:'J-NW',label:'Northwest Junction',type:'JUNCTION',x:250,y:220,...nodeBase},
 {id:'E-NORTH',label:'North Gate',type:'EXIT',x:720,y:90,serviceCapacityPerTick:6,...nodeBase},
 {id:'E-SOUTH',label:'South Gate',type:'EXIT',x:720,y:570,serviceCapacityPerTick:6,...nodeBase},
 {id:'E-WEST',label:'West Gate',type:'EXIT',x:80,y:400,serviceCapacityPerTick:6,...nodeBase},
]
const edgeRows:[string,string,string,number,number][]=[
 ['L01','J-NORTH','J-NE',1,6],['L02','J-NE','J-EAST',1,6],['L03','J-EAST','J-SE',1,6],['L04','J-SE','J-SOUTH',1,6],
 ['L05','J-SOUTH','J-SW',1,6],['L06','J-SW','J-WEST',1,6],['L07','J-WEST','J-NW',1,6],['L08','J-NW','J-NORTH',1,6],
 ['L09','S-DORM','J-NORTH',1,4],['L10','S-DORM','J-NE',2,4],['L11','S-LIBRARY','J-EAST',1,4],['L12','S-LIBRARY','J-SE',2,4],
 ['L13','S-LABS','J-SOUTH',1,4],['L14','S-LABS','J-SW',2,4],['L15','S-AUDITORIUM','J-WEST',1,4],['L16','S-AUDITORIUM','J-NW',2,4],
 ['L17','E-NORTH','J-NORTH',1,5],['L18','E-NORTH','J-NE',1,5],['L19','E-SOUTH','J-SOUTH',1,5],['L20','E-SOUTH','J-SW',1,5],
 ['L21','E-WEST','J-WEST',1,5],['L22','E-WEST','J-NW',1,5],
]
const edges:GraphEdge[]=edgeRows.map(([id,endpointA,endpointB,travelTicks,capacityPerTick])=>({id,endpointA,endpointB,direction:'BIDIRECTIONAL',lengthMeters:null,capacityPerTick,travelTicks,enabled:true,disruption:{active:false,kind:null,description:null}}))
const originGroups:OriginGroup[]=[
 {id:'ORIGIN-S-DORM',nodeId:'S-DORM',initialAgents:24},
 {id:'ORIGIN-S-LIBRARY',nodeId:'S-LIBRARY',initialAgents:18},
 {id:'ORIGIN-S-LABS',nodeId:'S-LABS',initialAgents:18},
 {id:'ORIGIN-S-AUDITORIUM',nodeId:'S-AUDITORIUM',initialAgents:20},
]
function deepFreeze<T>(value:T):DeepReadonly<T>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);Object.values(value).forEach(deepFreeze)}return value as DeepReadonly<T>}

/** Appendix A fixture is immutable baseline data; all edits must go through createScenario(). */
export const BASELINE_SCENARIO:DeepReadonly<ScenarioData>=deepFreeze<ScenarioData>({
 schemaVersion:1,id:'fracture-campus-v1',name:'Campus baseline',nodes,edges,originGroups,deadlineTicks:20,
 constraints:{minimumEvacuationFraction:.95,maximumUnreachableAgents:0},
})
