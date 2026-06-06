import { useCallback } from 'react'
import useStore from './store'

export default function ChapterList() {
  const { chapters, activeChapter, setActiveChapter, projectId, pipelineStatus } = useStore()

  const handleRegenerate = useCallback(async (episodeNum) => {
    if (!projectId) return
    try {
      await fetch(`/api/projects/${projectId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_number: episodeNum,
          regenerate_downstream: true,
        }),
      })
      // Refresh data after regeneration
      useStore.getState().fetchAlldata()
    } catch (e) {
      console.error('Regeneration failed:', e)
    }
  }, [projectId])

  if (!chapters || chapters.length === 0) {
    return <div style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)' }}>暂无章节数据</div>
  }

  return (
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
                title="重生成此集"
              >
                ↻
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
