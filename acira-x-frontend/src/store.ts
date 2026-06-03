import { create } from 'zustand'
import { API_BASE_URL } from './config'

export type Incident = {
  id: string
  title: string
  status: string
  severity: string
  risk_score: number
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

export type DashboardMetrics = {
  active_incidents: number
  critical_alerts: number
  devices_protected: number
  threats_blocked_today: number
  mean_response_time: string
  security_score: number
}

interface DashboardState {
  metrics: DashboardMetrics | null
  activeIncident: Incident | null
  logs: AgentLog[]
  isSimulating: boolean
  setMetrics: (metrics: DashboardMetrics) => void
  setActiveIncident: (incident: Incident | null) => void
  setLogs: (logs: AgentLog[]) => void
  setIsSimulating: (isSimulating: boolean) => void
  fetchMetrics: () => Promise<void>
  fetchIncidentStatus: (incidentId: string) => Promise<void>
}

export const useStore = create<DashboardState>((set, get) => ({
  metrics: null,
  activeIncident: null,
  logs: [],
  isSimulating: false,
  
  setMetrics: (metrics) => set({ metrics }),
  setActiveIncident: (activeIncident) => set({ activeIncident }),
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
  }
}))
