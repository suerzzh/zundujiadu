import useStore from './store'

export default function AnalysisBoard() {
  const { analysis } = useStore()

  if (!analysis) {
    return <div className="empty-state"><div className="empty-state-text">暂无分析数据</div></div>
  }

  return (
    <div>
      {/* Overview card */}
      <div className="card">
        <div className="card-title">总览</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>题材:</span> {analysis.genre}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>频向:</span> {analysis.orientation}</div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: 'var(--text-muted)' }}>子题材:</span> {analysis.sub_genres?.join('、')}
          </div>
        </div>
        {analysis.risks?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 4 }}>改编风险</div>
            {analysis.risks.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                • {r.risk} — {r.mitigation}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Episode directory */}
      <div className="card">
        <div className="card-title">分集目录</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>集号</th>
              <th>标题</th>
              <th>类型</th>
              <th>钩子</th>
              <th>情绪强度</th>
            </tr>
          </thead>
          <tbody>
            {analysis.conflict_pool?.core_conflicts?.map((c, i) => (
              <tr key={i}>
                <td colSpan={5} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  核心冲突: {c}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hook library */}
      <div className="card">
        <div className="card-title">钩子库</div>
        {analysis.satisfaction_pool?.points?.map((p, i) => (
          <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: 'var(--primary-light)' }}>{i + 1}.</span> {p}
          </div>
        ))}
      </div>

      {/* Character profiles */}
      <div className="card">
        <div className="card-title">角色档案</div>
        {analysis.characters?.map((ch, i) => (
          <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{ch.name} <span className={`tag tag-${ch.role === 'protagonist' ? 'setup' : ch.role === 'antagonist' ? 'climax' : 'escalation'}`}>{ch.role}</span></div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ch.traits?.join('、')}</div>
            {ch.titles?.length > 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>称呼: {ch.titles.join('、')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
