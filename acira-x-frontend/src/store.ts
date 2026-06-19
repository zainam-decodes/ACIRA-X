import { create } from 'zustand'
import { API_BASE_URL } from './config'

export type Incident = {
  id: string
  title: string
  attack_type: string
  status: string
  severity: string
  risk_score: number
  affected_endpoint: string
  mitre_tactic: string
  source: string
  threat_explanation?: string
  root_cause?: string
  predicted_impact?: string
  remediation_steps?: string
  response_action?: string
  created_at: string
  updated_at: string
}

export type AgentLog = {
  id: number
  incident_id: string
  agent_name: string
  action: string
  details: string
  timestamp: string
}

export type Endpoint = {
  id: string
  hostname: string
  ip_address: string
  os: string
  status: string // Active, Isolated, Offline
  last_seen: string
  risk_level: string // Low, Medium, High, Critical
  cpu_percent: number
  ram_percent: number
  disk_percent: number
  agent_version: string
  last_telemetry: string | null
  is_real: boolean
}

export type TelemetrySnapshot = {
  id: number
  device_id: string
  hostname: string
  ip_address: string
  os_info: string
  cpu_percent: number
  ram_percent: number
  disk_percent: number
  processes_json: string
  ports_json: string
  connections_json: string
  failed_login_count: number
  agent_version: string
  timestamp: string
}

export type AutonomousActionLog = {
  id: number
  incident_id: string
  endpoint_id: string
  detection_trigger: string
  detection_detail: string
  decision_reasoning: string
  action_taken: string
  action_detail: string
  action_status: string
  severity: string
  timestamp: string
}

export type ActionLogStats = {
  total_actions: number
  critical: number
  high: number
  completed: number
  success_rate: number
}

export type IncidentAnalysis = {
  incident_id: string
  threat_explanation: string
  root_cause: string
  predicted_impact: string
  remediation_steps: string[]
  mitre_tactic: string
  risk_score: number
  confidence: string
  analyst: string
  generated_at: string
  response_action: string
}

export type DashboardMetrics = {
  active_incidents: number
  critical_alerts: number
  devices_protected: number
  real_endpoints_online: number
  isolated_endpoints: number
  threats_blocked_today: number
  mean_response_time: string
  security_score: number
  protected_files: number
  compromised_files: number
  autonomous_actions_taken: number
}

interface DashboardState {
  metrics: DashboardMetrics | null
  activeIncident: Incident | null
  activeIncidentAnalysis: IncidentAnalysis | null
  logs: AgentLog[]
  isSimulating: boolean
  endpoints: Endpoint[]
  actionLogs: AutonomousActionLog[]
  actionLogStats: ActionLogStats | null
  telemetryHistory: Record<string, TelemetrySnapshot[]>
  incidentAnalysis: Record<string, IncidentAnalysis>
  
  setMetrics: (metrics: DashboardMetrics) => void
  setActiveIncident: (incident: Incident | null) => void
  setLogs: (logs: AgentLog[]) => void
  setIsSimulating: (isSimulating: boolean) => void
  
  fetchMetrics: () => Promise<void>
  fetchIncidentStatus: (incidentId: string) => Promise<void>
  fetchEndpoints: () => Promise<void>
  fetchActionLogs: () => Promise<void>
  fetchTelemetryHistory: (deviceId: string) => Promise<void>
  fetchIncidentAnalysis: (incidentId: string) => Promise<IncidentAnalysis | null>
  isolateEndpoint: (endpointId: string) => Promise<void>
  reconnectEndpoint: (endpointId: string) => Promise<void>
}

export const useStore = create<DashboardState>((set, get) => ({
  metrics: null,
  activeIncident: null,
  activeIncidentAnalysis: null,
  logs: [],
  isSimulating: false,
  endpoints: [],
  actionLogs: [],
  actionLogStats: null,
  telemetryHistory: {},
  incidentAnalysis: {},
  
  setMetrics: (metrics) => set({ metrics }),
  setActiveIncident: (activeIncident) => set({ activeIncident, activeIncidentAnalysis: null }),
  setLogs: (logs) => set({ logs }),
  setIsSimulating: (isSimulating) => set({ isSimulating }),
  
  fetchMetrics: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/metrics`)
      if (res.ok) {
        const data = await res.json()
        set({ metrics: data })
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  },
  
  fetchIncidentStatus: async (incidentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/${incidentId}/status`)
      if (res.ok) {
        const data = await res.json()
        set({ activeIncident: data.incident, logs: data.logs })
      }
    } catch (error) {
      console.error('Failed to fetch incident status:', error)
    }
  },

  fetchEndpoints: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/endpoints`)
      if (res.ok) {
        const data = await res.json()
        set({ endpoints: data })
      }
    } catch (error) {
      console.error('Failed to fetch endpoints:', error)
    }
  },

  fetchActionLogs: async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/action-logs`),
        fetch(`${API_BASE_URL}/api/action-logs/stats`)
      ])
      
      if (logsRes.ok && statsRes.ok) {
        const logs = await logsRes.json()
        const stats = await statsRes.json()
        set({ actionLogs: logs, actionLogStats: stats })
      }
    } catch (error) {
      console.error('Failed to fetch action logs/stats:', error)
    }
  },

  fetchTelemetryHistory: async (deviceId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/telemetry/${deviceId}/history`)
      if (res.ok) {
        const data = await res.json()
        set((state) => ({
          telemetryHistory: {
            ...state.telemetryHistory,
            [deviceId]: data
          }
        }))
      }
    } catch (error) {
      console.error(`Failed to fetch telemetry history for ${deviceId}:`, error)
    }
  },

  fetchIncidentAnalysis: async (incidentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/analysis`)
      if (res.ok) {
        const data = await res.json()
        set((state) => ({
          activeIncidentAnalysis: data,
          incidentAnalysis: {
            ...state.incidentAnalysis,
            [incidentId]: data
          }
        }))
        return data
      }
    } catch (error) {
      console.error(`Failed to fetch incident analysis for ${incidentId}:`, error)
    }
    return null
  },

  isolateEndpoint: async (endpointId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/endpoints/${endpointId}/isolate`, {
        method: 'POST'
      })
      if (res.ok) {
        await get().fetchEndpoints()
        await get().fetchMetrics()
      }
    } catch (error) {
      console.error(`Failed to isolate endpoint ${endpointId}:`, error)
    }
  },

  reconnectEndpoint: async (endpointId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/endpoints/${endpointId}/reconnect`, {
        method: 'POST'
      })
      if (res.ok) {
        await get().fetchEndpoints()
        await get().fetchMetrics()
      }
    } catch (error) {
      console.error(`Failed to reconnect endpoint ${endpointId}:`, error)
    }
  }
}))
