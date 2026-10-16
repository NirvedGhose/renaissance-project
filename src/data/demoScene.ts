import type {CampusBuilding,CampusDecoration,CampusEdge,CampusNode} from '../viewer/types'
import type {GraphEdge as ModelEdge,GraphNode as ModelNode} from '../graph/types'

/** Converts appendix layout coordinates to viewer scene units. Connectivity remains in the graph model. */
export const appendixLayoutToWorld=(x:number,y:number):readonly [number,number,number]=>[(x-400)*.09,(370-y)*.09,0]
export function viewerGraphForScenario(scenario:{nodes:readonly ModelNode[];edges:readonly ModelEdge[]}):{nodes:CampusNode[];edges:CampusEdge[]}{return{
 nodes:scenario.nodes.map(node=>({id:node.id,label:node.label,type:node.type,position:appendixLayoutToWorld(node.x,node.y),enabled:node.enabled})),
 edges:scenario.edges.map(edge=>({id:edge.id,from:edge.endpointA,to:edge.endpointB,direction:edge.direction,capacityPerTick:edge.capacityPerTick,travelTicks:edge.travelTicks,lengthMeters:edge.lengthMeters,enabled:edge.enabled})),
}}
export const demoCampusBuildings:CampusBuilding[]=[
 {id:'BLD-DORM',label:'Academic block',assetId:'building_academic_block',position:[-26,20,0]},
 {id:'BLD-LIBRARY',label:'Library',assetId:'building_library',position:[5,0,0]},
 {id:'BLD-ADMIN',label:'Administration',assetId:'building_administration',position:[7,31,0]},
 {id:'BLD-LABS',label:'Laboratory',assetId:'building_laboratory',position:[23,-24,0]},
 {id:'BLD-AUDITORIUM',label:'Auditorium',assetId:'building_auditorium',position:[-26,-25,0]},
 {id:'BLD-UTILITY',label:'Utility building',assetId:'building_utility',position:[28,1,0]},
]
export const demoCampusDecorations:CampusDecoration[]=[
 {id:'GATE-MAIN',label:'Pedestrian gate',assetId:'access_pedestrian_gate',position:[-38,-4,0]},
 {id:'EXIT-NORTH-PORTAL',label:'North emergency exit',assetId:'access_emergency_exit',position:[36,27,0]},
 {id:'EXIT-SOUTH-PORTAL',label:'South emergency exit',assetId:'access_emergency_exit',position:[36,-21,0]},
 {id:'EXIT-WEST-PORTAL',label:'West emergency exit',assetId:'access_emergency_exit',position:[-36,-4,0],rotation:Math.PI/2},
 {id:'PLAZA-NORTH',label:'North sidewalk tile',assetId:'environment_sidewalk_tile',position:[-1,16,.02]},
 {id:'PLAZA-CENTRE',label:'Central sidewalk tile',assetId:'environment_sidewalk_tile',position:[4,0,.02]},
 {id:'PLAZA-SOUTH',label:'South sidewalk tile',assetId:'environment_sidewalk_tile',position:[5,-14,.02]},
]
