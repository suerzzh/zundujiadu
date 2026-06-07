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
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th>集号</th>
                <th>标题</th>
                <th>类型</th>
                <th>原文章节</th>
                <th>钩子</th>
                <th>爽点</th>
                <th>情绪</th>
              </tr>
            </thead>
            <tbody>
              {plan.episodes?.map((ep) => (
                <tr key={ep.episode}>
                  <td>{ep.episode}</td>
                  <td style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</td>
                  <td><span className={`tag tag-${ep.episode_type}`}>{ep.episode_type}</span></td>
                  <td style={{ fontSize: 12 }}>{ep.source_chapters?.join(',') || '-'}</td>
                  <td style={{ fontSize: 12, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.hook || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--primary-light)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.satisfaction_points?.join('、') || '-'}</td>
                  <td>{(ep.emotional_intensity * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emotion curve */}
      {(plan.emotion_curve?.length > 0 || plan.episodes?.length > 0) && (
        <div className="card">
          <div className="card-title">情绪曲线</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
            {(plan.emotion_curve?.length > 0 ? plan.emotion_curve : plan.episodes?.map(ep => ({
              episode: ep.episode,
              intensity: ep.emotional_intensity || 0.5,
              label: ep.episode_type || '',
            })) || []).map((point, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--primary-light)', marginBottom: 2 }}>
                  {point.label || `${(point.intensity * 100).toFixed(0)}%`}
                </div>
                <div
                  style={{
                    height: `${Math.max(point.intensity * 80, 4)}px`,
                    background: point.intensity >= 0.8 ? 'var(--danger, #ef4444)' :
                               point.intensity >= 0.6 ? 'var(--primary)' :
                               point.intensity >= 0.4 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)',
                    borderRadius: '2px 2px 0 0',
                    minHeight: 4,
                    transition: 'height 0.3s',
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>第{point.episode}集</div>
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
  const {
    projectId, pipelineStatus, error, warnings, clearError, chapterCount,
    failedStage, retryFailedStage, totalDurationSec, totalCost, exportOutputs,
  } = useStore()

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
        {/* B7: Export button */}
        {pipelineStatus === 'completed' && (
          <button className="btn btn-primary" style={{ marginLeft: 12, fontSize: 12 }} onClick={exportOutputs}>
            导出
          </button>
        )}
      </header>

      {/* Error banner with B6: retry button */}
      {error && (
        <div className="error-banner">
          <span className="error-message">{error}</span>
          {failedStage && (
            <button className="btn btn-sm btn-primary" onClick={retryFailedStage} style={{ marginRight: 8 }}>
              重试 {failedStage}
            </button>
          )}
          <button className="btn btn-sm btn-danger" onClick={clearError}>关闭</button>
        </div>
      )}

      {/* B8: Pipeline completion stats */}
      {pipelineStatus === 'completed' && totalDurationSec != null && (
        <div className="warning-banner" style={{ background: 'var(--success-bg, #e8f5e9)', color: 'var(--success, #22c55e)' }}>
          Pipeline 完成 — 总耗时: {totalDurationSec}s | 总成本: ¥{totalCost?.toFixed(2) || '0.00'}
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
