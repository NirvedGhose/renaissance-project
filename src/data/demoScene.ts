import type {CampusBuilding,CampusDecoration,CampusEdge,CampusNode} from '../viewer/types'

/** Demo layout derived from the FRACTURE campus fixture; positions below are metres in the viewer's +Z-up world. */
export const demoCampusNodes:CampusNode[]=[
 {id:'S-DORM',label:'North Dormitory',type:'START',position:[-15,27,0]},
 {id:'S-LIBRARY',label:'Library',type:'START',position:[12,11,0]},
 {id:'S-LABS',label:'Science Laboratories',type:'START',position:[12,-16,0]},
 {id:'S-AUDITORIUM',label:'Auditorium',type:'START',position:[-15,-29,0]},
 {id:'J-NORTH',label:'North Junction',type:'JUNCTION',position:[-1,23,0]},
 {id:'J-NE',label:'Northeast Junction',type:'JUNCTION',position:[16,19,0]},
 {id:'J-EAST',label:'East Junction',type:'JUNCTION',position:[25,6,0]},
 {id:'J-SE',label:'Southeast Junction',type:'JUNCTION',position:[20,-9.5,0]},
 {id:'J-SOUTH',label:'South Junction',type:'JUNCTION',position:[5,-20.5,0]},
 {id:'J-SW',label:'Southwest Junction',type:'JUNCTION',position:[-10,-17.5,0]},
 {id:'J-WEST',label:'West Junction',type:'JUNCTION',position:[-19,-3,0]},
 {id:'J-NW',label:'Northwest Junction',type:'JUNCTION',position:[-15,14,0]},
 {id:'E-NORTH',label:'North Gate',type:'EXIT',position:[32,27,0]},
 {id:'E-SOUTH',label:'South Gate',type:'EXIT',position:[32,-21,0]},
 {id:'E-WEST',label:'West Gate',type:'EXIT',position:[-32,-4,0]},
]
export const demoCampusEdges:CampusEdge[]=[
 {id:'L01',from:'J-NORTH',to:'J-NE'},{id:'L02',from:'J-NE',to:'J-EAST'},{id:'L03',from:'J-EAST',to:'J-SE'},{id:'L04',from:'J-SE',to:'J-SOUTH'},
 {id:'L05',from:'J-SOUTH',to:'J-SW'},{id:'L06',from:'J-SW',to:'J-WEST'},{id:'L07',from:'J-WEST',to:'J-NW'},{id:'L08',from:'J-NW',to:'J-NORTH'},
 {id:'L09',from:'S-DORM',to:'J-NORTH'},{id:'L10',from:'S-DORM',to:'J-NE'},{id:'L11',from:'S-LIBRARY',to:'J-EAST'},{id:'L12',from:'S-LIBRARY',to:'J-SE'},
 {id:'L13',from:'S-LABS',to:'J-SOUTH'},{id:'L14',from:'S-LABS',to:'J-SW'},{id:'L15',from:'S-AUDITORIUM',to:'J-WEST'},{id:'L16',from:'S-AUDITORIUM',to:'J-NW'},
 {id:'L17',from:'E-NORTH',to:'J-NORTH'},{id:'L18',from:'E-NORTH',to:'J-NE'},{id:'L19',from:'E-SOUTH',to:'J-SOUTH'},{id:'L20',from:'E-SOUTH',to:'J-SW'},
 {id:'L21',from:'E-WEST',to:'J-WEST'},{id:'L22',from:'E-WEST',to:'J-NW'},
]
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
