import useStore from './store'

export default function EventsBoard() {
  const { events } = useStore()

  if (!events || !events.chapters || events.chapters.length === 0) {
    return <div className="empty-state"><div className="empty-state-text">暂无事件数据</div></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        AI 理解核对 — 请核对 AI 对小说的理解是否准确
      </div>
      {events.chapters.map((ch) => (
        <div key={ch.chapter} className="events-chapter">
          <div className="events-chapter-title">
            第{ch.chapter}章 {ch.title && `: ${ch.title}`}
          </div>
          <div className="events-list">
            {ch.events?.characters?.length > 0 && (
              <div className="event-item">
                <div className="event-label">人物</div>
                <div className="event-value">{ch.events.characters.join('、')}</div>
              </div>
            )}
            {ch.events?.events?.length > 0 && (
              <div className="event-item">
                <div className="event-label">事件</div>
                <div className="event-value">{ch.events.events.join('；')}</div>
              </div>
            )}
            {ch.events?.locations?.length > 0 && (
              <div className="event-item">
                <div className="event-label">地点</div>
                <div className="event-value">{ch.events.locations.join('、')}</div>
              </div>
            )}
            {ch.events?.conflicts?.length > 0 && (
              <div className="event-item">
                <div className="event-label">冲突</div>
                <div className="event-value">{ch.events.conflicts.join('；')}</div>
              </div>
            )}
            {ch.events?.emotional_turns?.length > 0 && (
              <div className="event-item">
                <div className="event-label">情感转折</div>
                <div className="event-value">{ch.events.emotional_turns.join('；')}</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
