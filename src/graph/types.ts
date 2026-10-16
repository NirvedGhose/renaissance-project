export type NodeId = string
export type EdgeId = string
export type LinkDirection = 'BIDIRECTIONAL' | 'A_TO_B' | 'B_TO_A'
export type GraphNodeType = 'START' | 'JUNCTION' | 'EXIT'

type NodeBase = {
  id: NodeId
  label: string
  type: GraphNodeType
  x: number
  y: number
  enabled: boolean
  /** null means the v1 specification does not model a holding limit. */
  holdingCapacity: number | null
  /** The spec routes on link travelTicks; no node delay is defined, so baseline is zero. */
  processingDelayTicks: number
}
export type StartNode = NodeBase & { type: 'START' }
export type JunctionNode = NodeBase & { type: 'JUNCTION' }
export type ExitNode = NodeBase & { type: 'EXIT'; serviceCapacityPerTick: number }
export type GraphNode = StartNode | JunctionNode | ExitNode

export type DisruptionMetadata = {
  active: boolean
  kind: 'closure' | 'capacity_reduction' | 'travel_delay' | 'other' | null
  description: string | null
}
export type GraphEdge = {
  id: EdgeId
  endpointA: NodeId
  endpointB: NodeId
  direction: LinkDirection
  /** Not present in Appendix A. null explicitly preserves that omission. */
  lengthMeters: number | null
  capacityPerTick: number
  travelTicks: number
  enabled: boolean
  disruption: DisruptionMetadata
}
export type OriginGroup = { id: string; nodeId: NodeId; initialAgents: number }
export type ScenarioConstraints = {
  minimumEvacuationFraction: number
  maximumUnreachableAgents: number
}
export type ScenarioData = {
  schemaVersion: 1
  id: string
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  originGroups: OriginGroup[]
  deadlineTicks: number
  constraints: ScenarioConstraints
}
export type SelectedGraphEntity = { kind: 'node' | 'edge'; id: string } | null
export type ScenarioSnapshot = {
  scenario: ScenarioData
  selectedEntity: SelectedGraphEntity
  highlightedEntityIds: string[]
}
export type ValidationIssue = { severity: 'error' | 'warning'; code: string; message: string; entityId?: string }
export type DeepReadonly<T>=T extends(...args:never[])=>unknown?T:T extends object?{readonly [K in keyof T]:DeepReadonly<T[K]>}:T
