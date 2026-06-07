import { useState } from 'react'
import useStore from './store'

function RawEntry({ entry, ep }) {
  if (!entry) {
    return (
      <div className="timeline-item">
        <div className="timeline-episode">第{ep}集</div>
        <div className="timeline-detail" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          连续性记录缺失（可能生成时未完成）
        </div>
      </div>
    )
  }
  return (
    <div className="timeline-item">
      <div className="timeline-episode">第{ep}集</div>
      {entry.character_changes?.length > 0 && (
        <div className="timeline-detail">{entry.character_changes.join('；')}</div>
      )}
      {entry.prop_states?.length > 0 && (
        <div className="timeline-detail" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {entry.prop_states.join('；')}
        </div>
      )}
      {entry.foreshadowing?.length > 0 && (
        <div className="timeline-detail" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          伏笔: {entry.foreshadowing.join('；')}
        </div>
      )}
    </div>
  )
}

function SummaryEntry({ s }) {
  const hasContent = s.character_states?.length > 0 || s.prop_states?.length > 0 ||
    s.active_foreshadowing?.length > 0 || s.title_conventions?.length > 0
  return (
    <div className="timeline-item">
      <div className="timeline-episode">第{s.from_episode}–{s.to_episode}集 摘要</div>
      {hasContent && s.character_states?.length > 0 && (
        <div className="timeline-detail"><strong>人物:</strong> {s.character_states.join('；')}</div>
      )}
      {hasContent && s.prop_states?.length > 0 && (
        <div className="timeline-detail"><strong>道具/场景:</strong> {s.prop_states.join('；')}</div>
      )}
      {hasContent && s.active_foreshadowing?.length > 0 && (
        <div className="timeline-detail"><strong>伏笔/情绪:</strong> {s.active_foreshadowing.join('；')}</div>
      )}
      {hasContent && s.title_conventions?.length > 0 && (
        <div className="timeline-detail"><strong>称呼:</strong> {s.title_conventions.join('；')}</div>
      )}
      {!hasContent && (
        <div className="timeline-detail" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          本区间暂无详细变更记录
        </div>
      )}
    </div>
  )
}

export default function ContinuityTimeline() {
  const { continuity, plan } = useStore()
  const [viewMode, setViewMode] = useState('summary')

  if (!continuity) {
    return <div className="empty-state"><div className="empty-state-text">暂无连续性数据</div></div>
  }

  const totalEpisodes = plan?.episodes?.length || continuity.raw?.length || 0

  let summaryView
  if (viewMode === 'summary') {
    if (continuity.summaries && continuity.summaries.length > 0) {
      summaryView = (
        <div className="timeline">
          {continuity.summaries.map((s, i) => <SummaryEntry key={i} s={s} />)}
        </div>
      )
    } else {
      summaryView = <div className="empty-state"><div className="empty-state-text">暂无摘要数据</div></div>
    }
  }

  let rawView
  if (viewMode !== 'summary') {
    if (continuity.raw && continuity.raw.length > 0) {
      const entryMap = {}
      continuity.raw.forEach(e => { entryMap[e.episode] = e })
      const maxEp = Math.max(totalEpisodes, ...Object.keys(entryMap).map(Number))
      const items = []
      for (let ep = 1; ep <= maxEp; ep++) {
        items.push(<RawEntry key={ep} entry={entryMap[ep]} ep={ep} />)
      }
      rawView = <div className="timeline">{items}</div>
    } else {
      rawView = <div className="empty-state"><div className="empty-state-text">暂无原始层数据</div></div>
    }
  }

  return (
    <div>
      <div className="toggle-group">
        <button className={`toggle-btn ${viewMode === 'summary' ? 'active' : ''}`} onClick={() => setViewMode('summary')}>摘要层</button>
        <button className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`} onClick={() => setViewMode('raw')}>原始层</button>
      </div>
      {summaryView}
      {rawView}
    </div>
  )
}
