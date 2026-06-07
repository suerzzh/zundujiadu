import { create } from 'zustand'

const useStore = create((set, get) => ({
  // Project state
  projectId: null,
  chapterCount: 0,
  warnings: [],

  // Pipeline state
  pipelineStatus: 'idle', // idle / running / completed / failed
  currentStage: '',
  stageProgress: {
    extractor: { status: 'pending', progress: 0, total: 0 },
    analyzer: { status: 'pending', progress: 0, total: 0 },
    planner: { status: 'pending', progress: 0, total: 0 },
    writer: { status: 'pending', progress: 0, total: 0 },
    reviewer: { status: 'pending', progress: 0, total: 0 },
  },
  thinkingText: '',

  // B8: Pipeline completion stats
  totalDurationSec: null,
  totalCost: null,

  // B6: Failed stage info for retry
  failedStage: null,
  failedError: null,

  // Data
  events: null,
  analysis: null,
  plan: null,
  review: null,
  continuity: null,
  scriptContent: '',
  chapters: [],

  // UI state
  activeTab: 'events', // events / analysis / plan / review / continuity
  activeChapter: null,
  currentEpisode: null,
  error: null,

  // LLM mode: 'cloud' | 'local' | 'local_only'
  llmMode: 'cloud',

  // Actions
  setProject: (projectId, chapterCount, warnings) =>
    set({ projectId, chapterCount, warnings }),

  setPipelineStatus: (status) => set({ pipelineStatus: status }),

  setCurrentEpisode: (ep) => set({ currentEpisode: ep }),

  handleSSEEvent: (event) => {
    const type = event.event
    const stage = event.stage

    if (type === 'stage_started') {
      set((state) => ({
        pipelineStatus: 'running',
        currentStage: stage,
        stageProgress: {
          ...state.stageProgress,
          [stage]: { status: 'running', progress: 0, total: event.total_chapters || 1 },
        },
        thinkingText: _getThinkingText(stage),
        failedStage: null,
        failedError: null,
      }))
    }

    if (type === 'stage_progress') {
      set((state) => ({
        stageProgress: {
          ...state.stageProgress,
          [stage]: {
            ...state.stageProgress[stage],
            progress: event.chapter,
            total: event.total,
          },
        },
      }))
    }

    if (type === 'stage_completed') {
      set((state) => ({
        stageProgress: {
          ...state.stageProgress,
          [stage]: { status: 'completed', progress: 100, total: state.stageProgress[stage]?.total || 1 },
        },
        thinkingText: '',
      }))
    }

    if (type === 'stage_failed') {
      set((state) => ({
        stageProgress: {
          ...state.stageProgress,
          [stage]: { status: 'failed', progress: 0, total: state.stageProgress[stage]?.total || 1 },
        },
        error: `${stage} 阶段失败: ${event.error}`,
        thinkingText: '',
        // B6: Store failed stage info for retry button
        failedStage: stage,
        failedError: event.error,
      }))
    }

    if (type === 'pipeline_completed') {
      set({
        pipelineStatus: 'completed',
        thinkingText: '',
        failedStage: null,
        failedError: null,
        // B8: Store total duration and cost
        totalDurationSec: event.total_duration_sec,
        totalCost: event.total_cost,
      })
      // Fetch all data
      get().fetchAlldata()
    }
  },

  // B6: Retry failed stage
  retryFailedStage: async () => {
    const { projectId, failedStage } = get()
    if (!projectId || !failedStage) return

    try {
      const resp = await fetch(`/api/projects/${projectId}/retry/${failedStage}`, {
        method: 'POST',
      })
      if (resp.ok) {
        set({ failedStage: null, failedError: null, error: null })
        // Re-connect SSE to monitor the retry
        get().connectSSE()
      }
    } catch (e) {
      console.error('Retry failed:', e)
    }
  },

  // B7: Export all outputs
  exportOutputs: async () => {
    const { projectId } = get()
    if (!projectId) return

    try {
      const resp = await fetch(`/api/projects/${projectId}/export`)
      if (resp.ok) {
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `剧本人AI_${projectId}.zip`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Export failed:', e)
    }
  },

  connectSSE: () => {
    const { projectId } = get()
    if (!projectId) return

    const evtSource = new EventSource(`/api/projects/${projectId}/convert/stream`)

    // Use typed event listeners to match backend SSE event types
    const eventTypes = ['stage_started', 'stage_progress', 'stage_completed', 'stage_failed', 'pipeline_completed']
    eventTypes.forEach((type) => {
      evtSource.addEventListener(type, (e) => {
        try {
          const data = JSON.parse(e.data)
          get().handleSSEEvent({ event: type, ...data })
        } catch (err) {
          console.error('SSE parse error:', err)
        }
      })
    })

    evtSource.onerror = () => {
      evtSource.close()
    }
  },

  fetchAlldata: async () => {
    const { projectId } = get()
    if (!projectId) return

    try {
      const [eventsRes, analysisRes, planRes, reviewRes, continuityRes, scriptRes, chaptersRes] = await Promise.allSettled([
        fetch(`/api/projects/${projectId}/events`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/analysis`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/plan`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/review`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/continuity`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/script`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/chapters`).then(r => r.json()),
      ])

      set({
        events: eventsRes.status === 'fulfilled' ? eventsRes.value : null,
        analysis: analysisRes.status === 'fulfilled' ? analysisRes.value : null,
        plan: planRes.status === 'fulfilled' ? planRes.value : null,
        review: reviewRes.status === 'fulfilled' ? reviewRes.value : null,
        continuity: continuityRes.status === 'fulfilled' ? continuityRes.value : null,
        scriptContent: scriptRes.status === 'fulfilled' ? scriptRes.value.content : '',
        chapters: chaptersRes.status === 'fulfilled' ? chaptersRes.value.chapters : [],
      })
    } catch (e) {
      console.error('Failed to fetch data:', e)
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveChapter: (chapter) => set({ activeChapter: chapter }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setLlmMode: (mode) => set({ llmMode: mode }),

  // Per-stage retry
  retryStage: async (stage) => {
    const { projectId } = get()
    if (!projectId || !stage) return

    try {
      // Reset the specific stage status before retrying
      set((state) => ({
        stageProgress: {
          ...state.stageProgress,
          [stage]: { status: 'running', progress: 0, total: state.stageProgress[stage]?.total || 1 },
        },
        error: null,
        failedStage: null,
        failedError: null,
        thinkingText: _getThinkingText(stage),
      }))

      const resp = await fetch(`/api/projects/${projectId}/retry/${stage}`, {
        method: 'POST',
      })
      if (resp.ok) {
        // Re-connect SSE to monitor the retry
        get().connectSSE()
      } else {
        const errData = await resp.json().catch(() => ({}))
        set((state) => ({
          stageProgress: {
            ...state.stageProgress,
            [stage]: { status: 'failed', progress: 0, total: state.stageProgress[stage]?.total || 1 },
          },
          error: `${stage} 重试失败: ${errData.detail || '未知错误'}`,
          thinkingText: '',
          failedStage: stage,
        }))
      }
    } catch (e) {
      console.error('Retry stage failed:', e)
      set((state) => ({
        stageProgress: {
          ...state.stageProgress,
          [stage]: { status: 'failed', progress: 0, total: state.stageProgress[stage]?.total || 1 },
        },
        error: `${stage} 重试失败: ${e.message}`,
        thinkingText: '',
        failedStage: stage,
      }))
    }
  },

  reset: () => set({
    projectId: null,
    chapterCount: 0,
    warnings: [],
    pipelineStatus: 'idle',
    currentStage: '',
    stageProgress: {
      extractor: { status: 'pending', progress: 0, total: 0 },
      analyzer: { status: 'pending', progress: 0, total: 0 },
      planner: { status: 'pending', progress: 0, total: 0 },
      writer: { status: 'pending', progress: 0, total: 0 },
      reviewer: { status: 'pending', progress: 0, total: 0 },
    },
    thinkingText: '',
    totalDurationSec: null,
    totalCost: null,
    failedStage: null,
    failedError: null,
    events: null,
    analysis: null,
    plan: null,
    review: null,
    continuity: null,
    scriptContent: '',
    chapters: [],
    activeTab: 'events',
    activeChapter: null,
    currentEpisode: null,
    error: null,
    llmMode: 'cloud',
  }),
}))

function _getThinkingText(stage) {
  const texts = {
    extractor: '正在提取章节事件...',
    analyzer: '正在分析改编策略...',
    planner: '正在规划分集结构...',
    writer: '正在编写剧本...',
    reviewer: '正在审核剧本质量...',
  }
  return texts[stage] || 'AI 正在思考...'
}

export default useStore
