import useStore from './store'

export default function ChapterList() {
  const { chapters, activeChapter, setActiveChapter } = useStore()

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
          <span className="chapter-number">{ch.length}字</span>
        </li>
      ))}
    </ul>
  )
}
