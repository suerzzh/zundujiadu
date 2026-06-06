import useStore from './store'
import UploadPanel from './UploadPanel'
import ProgressBar from './ProgressBar'
import ChapterList from './ChapterList'
import ScriptEditor from './ScriptEditor'
import EventsBoard from './EventsBoard'
import AnalysisBoard from './AnalysisBoard'
import ReviewPanel from './ReviewPanel'
import ContinuityTimeline from './ContinuityTimeline'

const TABS = [
  { key: 'events', label: '事件核对' },
  { key: 'analysis', label: '改编分析' },
  { key: 'plan', label: '分集规划' },
  { key: 'review', label: '审核报告' },
  { key: 'continuity', label: '连续性' },
]

function RightPanel() {
  const { activeTab, setActiveTab, pipelineStatus } = useStore()

  return (
    <div className="panel panel-right">
      <div className="tabs">
        {TABS.map((tab) => (
          <div
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="panel-body">
        {activeTab === 'events' && <EventsBoard />}
        {activeTab === 'analysis' && <AnalysisBoard />}
        {activeTab === 'plan' && <PlanView />}
        {activeTab === 'review' && <ReviewPanel />}
        {activeTab === 'continuity' && <ContinuityTimeline />}
      </div>
    </div>
  )
}

function PlanView() {
  const { plan } = useStore()

  if (!plan) {
    return <div className="empty-state"><div className="empty-state-text">暂无规划数据</div></div>
  }

  return (
    <div>
      {/* Episode list */}
      <div className="card">
        <div className="card-title">分集目录</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>集号</th>
              <th>标题</th>
              <th>类型</th>
              <th>钩子</th>
              <th>情绪</th>
            </tr>
          </thead>
          <tbody>
            {plan.episodes?.map((ep) => (
              <tr key={ep.episode}>
                <td>{ep.episode}</td>
                <td>{ep.title}</td>
                <td><span className={`tag tag-${ep.episode_type}`}>{ep.episode_type}</span></td>
                <td style={{ fontSize: 12 }}>{ep.hook}</td>
                <td>{(ep.emotional_intensity * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Emotion curve */}
      {plan.emotion_curve?.length > 0 && (
        <div className="card">
          <div className="card-title">情绪曲线</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
            {plan.emotion_curve.map((point, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${point.intensity * 100}%`,
                    background: 'var(--primary)',
                    borderRadius: '2px 2px 0 0',
                    minHeight: 4,
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{point.episode}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pacing warnings */}
      {plan.pacing_warnings?.length > 0 && (
        <div className="card">
          <div className="card-title">节奏预警</div>
          {plan.pacing_warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--warning)', marginBottom: 4 }}>
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { projectId, pipelineStatus, error, warnings, clearError, chapterCount } = useStore()

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Novel2Script — AI剧本创作助手</h1>
        <span className="header-status">
          {pipelineStatus === 'idle' && '等待上传'}
          {pipelineStatus === 'running' && '处理中...'}
          {pipelineStatus === 'completed' && `已完成 · ${chapterCount}章`}
          {pipelineStatus === 'failed' && '处理失败'}
        </span>
      </header>

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span className="error-message">{error}</span>
          <button className="btn btn-sm btn-danger" onClick={clearError}>关闭</button>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="warning-banner">
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}

      {/* Main layout */}
      <div className="main">
        {/* Left panel: Upload + Progress + Chapters */}
        <div className="panel panel-left">
          <div className="panel-header">小说输入</div>
          <div className="panel-body">
            {!projectId && <UploadPanel />}
            {projectId && (
              <>
                <ProgressBar />
                {pipelineStatus === 'completed' && <ChapterList />}
              </>
            )}
          </div>
        </div>

        {/* Center panel: Script Editor */}
        <div className="panel panel-center">
          <div className="panel-header">剧本编辑器</div>
          <ScriptEditor />
        </div>

        {/* Right panel: Analysis tabs */}
        <RightPanel />
      </div>
    </div>
  )
}
