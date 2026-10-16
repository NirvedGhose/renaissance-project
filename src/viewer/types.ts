export type WorldPosition=readonly [x:number,y:number,z:number]
/** Scene units are metres. The application and Three.js world use +X east, +Y north, +Z up. */
export const toThreeWorld=(position:WorldPosition):[number,number,number]=>[position[0],position[1],position[2]]
/** glTF assets are Y-up; this single conversion rotates them into the app's Z-up world. */
export const GLTF_TO_Z_UP:readonly [number,number,number]=[Math.PI/2,0,0]
export type ComponentStatus='normal'|'disrupted'|'repaired'
export type CampusNodeType='START'|'JUNCTION'|'EXIT'
export type CampusNode={id:string;label:string;type:CampusNodeType;position:WorldPosition;status?:ComponentStatus}
export type CampusEdge={id:string;from:string;to:string;status?:ComponentStatus}
export type BuildingAssetId='building_academic_block'|'building_library'|'building_administration'|'building_laboratory'|'building_auditorium'|'building_utility'
export type CampusBuilding={id:string;label:string;assetId:BuildingAssetId;position:WorldPosition;analysisOpacity?:number}
export type CampusDecoration={id:string;label:string;assetId:'access_pedestrian_gate'|'access_emergency_exit'|'environment_sidewalk_tile';position:WorldPosition;rotation?:number}
export type AgentPosition={id:string;position:WorldPosition;status?:ComponentStatus}
export type SelectableCampusEntity={id:string;label:string;kind:'node'|'edge'|'building'|'decoration';status?:ComponentStatus;nodeType?:CampusNodeType;detail?:string}
export type CampusViewerProps={nodes:CampusNode[];edges:CampusEdge[];buildings:CampusBuilding[];decorations?:CampusDecoration[];selectedEntityId:string|null;nodeStatuses?:Record<string,ComponentStatus>;edgeStatuses?:Record<string,ComponentStatus>;agents?:AgentPosition[];highlightedCausalChain?:string[];analysisMode?:boolean;hideBuildingsInAnalysis?:boolean;onAnalysisModeChange?:(enabled:boolean)=>void;onSelectEntity?:(entity:SelectableCampusEntity|null)=>void}
