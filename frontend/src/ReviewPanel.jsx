import useStore from './store'

const DIMENSION_LABELS = {
  '结构完整性': 'structure',
  '角色一致性': 'character',
  '对话质量': 'dialogue',
  '节奏把控': 'pacing',
  '改编忠实度': 'fidelity',
}

const DIMENSION_COLORS = {
  structure: '#6366f1',
  character: '#22c55e',
  dialogue: '#f59e0b',
  pacing: '#3b82f6',
  fidelity: '#ec4899',
}

export default function ReviewPanel() {
  const { review } = useStore()

  if (!review) {
    return <div className="empty-state"><div className="empty-state-text">暂无审核数据</div></div>
  }

  const overallScore = review.overall_score || 0

  return (
    <div>
      {/* Overall score */}
      <div className="score-display">
        <div className="score-value">{overallScore}</div>
        <div className="score-label">综合评分</div>
      </div>

      {/* Dimension scores */}
      <div className="card">
        <div className="card-title">维度评分</div>
        <div className="dimension-scores">
          {review.dimension_scores?.map((ds, i) => {
            const key = DIMENSION_LABELS[ds.dimension] || 'other'
            const color = DIMENSION_COLORS[key] || '#6366f1'
            return (
              <div key={i} className="dimension-row">
                <span className="dimension-name">{ds.dimension}</span>
                <div className="dimension-bar">
                  <div
                    className="dimension-bar-fill"
                    style={{ width: `${ds.score * 10}%`, background: color }}
                  />
                </div>
                <span className="dimension-score" style={{ color }}>{ds.score}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top issues */}
      <div className="card">
        <div className="card-title">Top 问题</div>
        {review.top_issues?.map((issue, i) => (
          <div key={i} className="issue-item">
            <div className="issue-number">{i + 1}</div>
            <div className="issue-content">
              <div className="issue-episode">第{issue.episode}集 场景{issue.scene}</div>
              <div className="issue-description">{issue.description}</div>
              <div className="issue-suggestion">{issue.suggestion}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quality gates */}
      <div className="card">
        <div className="card-title">质量门禁</div>
        {review.quality_gates?.map((gate, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13 }}>
            <span style={{ color: gate.passed ? 'var(--success)' : 'var(--error)' }}>
              {gate.passed ? '✓' : '✗'}
            </span>
            <span>{gate.rule}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{gate.details}</span>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      {review.suggestions?.length > 0 && (
        <div className="card">
          <div className="card-title">修改建议</div>
          {review.suggestions.map((s, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4, padding: '6px 8px', background: 'var(--bg)', borderRadius: 4 }}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
