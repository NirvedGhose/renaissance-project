import {CampusViewer} from '../viewer/CampusViewer'
import {demoCampusBuildings,demoCampusDecorations,viewerGraphForScenario} from '../data/demoScene'
import type {ScenarioData,SelectedGraphEntity} from '../graph/types'
import {Icon} from './Icon'

export function CampusViewport({scenario,selectedEntity,onSelect,viewName}:{scenario:ScenarioData;selectedEntity:SelectedGraphEntity;onSelect:(entity:SelectedGraphEntity)=>void;viewName:string}){
 const {nodes,edges}=viewerGraphForScenario(scenario)
 return <section className="viewport-panel" aria-label="Campus simulation viewport"><div className="viewport-heading"><div><div className="eyebrow">{viewName.toUpperCase()} <span className="eyebrow-sep">/</span> DEMO CAMPUS</div><h1>{viewName==='Overview'?'Network overview':viewName==='Campus'?'Campus model':viewName}</h1><p>{nodes.length} nodes <i/> {edges.length} links <i/> {scenario.originGroups.reduce((sum,group)=>sum+group.initialAgents,0)} agents configured</p></div><span className="viewport-source"><Icon name="layers" size={13}/> APPENDIX A MODEL</span></div><div className="campus-canvas"><CampusViewer nodes={nodes} edges={edges} buildings={demoCampusBuildings} decorations={demoCampusDecorations} agents={[]} selectedEntityId={selectedEntity?.id??null} onSelectEntity={entity=>onSelect(entity&&(entity.kind==='node'||entity.kind==='edge')?{kind:entity.kind,id:entity.id}:null)}/></div><div className="viewport-footer"><div className="legend"><span><i className="legend-start"/>Origin</span><span><i className="legend-junction"/>Junction</span><span><i className="legend-exit"/>Exit</span><span><i className="legend-road"/>Graph edge</span></div><span className="footer-coords">MODEL LAYOUT <b/> 0–1000</span></div></section>
}
