import { useCallback, useState } from 'react'
import useStore from './store'

export default function ChapterList() {
  const { chapters, activeChapter, setActiveChapter, projectId, pipelineStatus } = useStore()
  const [regenDownstream, setRegenDownstream] = useState(true)

  const handleRegenerate = useCallback(async (episodeNum) => {
    if (!projectId) return
    try {
      await fetch(`/api/projects/${projectId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_number: episodeNum,
          regenerate_downstream: regenDownstream,
        }),
      })
      // Refresh data after regeneration
      useStore.getState().fetchAlldata()
    } catch (e) {
      console.error('Regeneration failed:', e)
    }
  }, [projectId, regenDownstream])

  if (!chapters || chapters.length === 0) {
    return <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>暂无章节数据</div>
  }

  return (
    <div>
      {/* A9: Regeneration scope toggle */}
      {pipelineStatus === 'completed' && (
        <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="radio"
              name="regen-scope"
              checked={regenDownstream}
              onChange={() => setRegenDownstream(true)}
            />
            本集+下游
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="radio"
              name="regen-scope"
              checked={!regenDownstream}
              onChange={() => setRegenDownstream(false)}
            />
            仅本集
          </label>
        </div>
      )}
      <ul className="chapter-list">
        {chapters.map((ch) => (
          <li
            key={ch.number}
            className={`chapter-item ${activeChapter === ch.number ? 'active' : ''}`}
            onClick={() => setActiveChapter(ch.number)}
          >
            <span>第{ch.number}章 {ch.title || ''}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="chapter-number">{ch.length}字</span>
              {pipelineStatus === 'completed' && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRegenerate(ch.number)
                  }}
                  title={regenDownstream ? '重生成此集及下游' : '仅重生成此集'}
                >
                  ↻
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
