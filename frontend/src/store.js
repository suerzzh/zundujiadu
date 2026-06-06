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
  error: null,

  // Actions
  setProject: (projectId, chapterCount, warnings) =>
    set({ projectId, chapterCount, warnings }),

  setPipelineStatus: (status) => set({ pipelineStatus: status }),

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
      }))
    }

    if (type === 'pipeline_completed') {
      set({
        pipelineStatus: 'completed',
        thinkingText: '',
      })
      // Fetch all data
      get().fetchAlldata()
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
    events: null,
    analysis: null,
    plan: null,
    review: null,
    continuity: null,
    scriptContent: '',
    chapters: [],
    activeTab: 'events',
    activeChapter: null,
    error: null,
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
