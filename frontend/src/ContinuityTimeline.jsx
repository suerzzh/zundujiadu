import { useState } from 'react'
import useStore from './store'

export default function ContinuityTimeline() {
  const { continuity } = useStore()
  const [viewMode, setViewMode] = useState('summary') // summary / raw

  if (!continuity) {
    return <div className="empty-state"><div className="empty-state-text">暂无连续性数据</div></div>
  }

  const data = viewMode === 'summary' ? continuity.summaries || [] : continuity.raw || []

  return (
    <div>
      <div className="toggle-group">
        <button
          className={`toggle-btn ${viewMode === 'summary' ? 'active' : ''}`}
          onClick={() => setViewMode('summary')}
        >
          摘要层
        </button>
        <button
          className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
          onClick={() => setViewMode('raw')}
        >
          原始层
        </button>
      </div>

      {viewMode === 'summary' ? (
        <div className="timeline">
          {data.map((s, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-episode">
                第{s.from_episode}–{s.to_episode}集 摘要
              </div>
              {s.character_states?.length > 0 && (
                <div className="timeline-detail">
                  <strong>人物:</strong> {s.character_states.join('；')}
                </div>
              )}
              {s.prop_states?.length > 0 && (
                <div className="timeline-detail">
                  <strong>道具:</strong> {s.prop_states.join('；')}
                </div>
              )}
              {s.active_foreshadowing?.length > 0 && (
                <div className="timeline-detail">
                  <strong>伏笔:</strong> {s.active_foreshadowing.join('；')}
                </div>
              )}
              {s.title_conventions?.length > 0 && (
                <div className="timeline-detail">
                  <strong>称呼:</strong> {s.title_conventions.join('；')}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="timeline">
          {data.map((entry, i) => (
            <div key={i} className="timeline-item">
              <div className="timeline-episode">第{entry.episode}集</div>
              {entry.character_changes?.length > 0 && (
                <div className="timeline-detail">
                  {entry.character_changes.join('；')}
                </div>
              )}
              {entry.foreshadowing?.length > 0 && (
                <div className="timeline-detail">
                  伏笔: {entry.foreshadowing.join('；')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
