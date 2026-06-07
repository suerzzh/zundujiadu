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

const PASS_LABELS = {
  structure: '结构审查',
  character: '角色审查',
  dialogue: '对话审查',
  detail: '细节审查',
}

const STATUS_LABELS = {
  completed: '✅ 审核通过',
  conditional: '⚠️ 条件通过',
  failed: '❌ 审核未通过',
  paused: '⏸️ 等待用户决策',
}

export default function ReviewPanel() {
  const { review, setCurrentEpisode, projectId } = useStore()

  if (!review) {
    return <div className="empty-state"><div className="empty-state-text">暂无审核数据</div></div>
  }

  const overallScore = review.overall_score || 0

  // B3: Build radar chart data from dimension scores
  const radarData = review.dimension_scores?.map((ds) => ({
    dimension: ds.dimension,
    score: ds.score,
    fullMark: 10,
  })) || []

  return (
    <div>
      {/* Overall score */}
      <div className="score-display">
        <div className="score-value">{overallScore}</div>
        <div className="score-label">综合评分</div>
      </div>

      {/* B3: 5-dimension radar chart */}
      <div className="card">
        <div className="card-title">维度评分 (雷达图)</div>
        <div style={{ width: '100%', height: 280 }}>
          <svg viewBox="0 0 300 280" style={{ width: '100%', height: '100%' }}>
            {/* Radar chart background */}
            {(() => {
              const cx = 150, cy = 140, r = 100
              const dims = review.dimension_scores || []
              const n = dims.length || 5
              const angleStep = (2 * Math.PI) / n

              // Draw concentric pentagons (score levels 2,4,6,8,10)
              const levels = [2, 4, 6, 8, 10]
              return (
                <g>
                  {levels.map((level) => {
                    const lr = (level / 10) * r
                    const points = Array.from({ length: n }, (_, i) => {
                      const angle = -Math.PI / 2 + i * angleStep
                      return `${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`
                    }).join(' ')
                    return (
                      <polygon
                        key={level}
                        points={points}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="0.5"
                      />
                    )
                  })}

                  {/* Axis lines */}
                  {Array.from({ length: n }, (_, i) => {
                    const angle = -Math.PI / 2 + i * angleStep
                    return (
                      <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={cx + r * Math.cos(angle)}
                        y2={cy + r * Math.sin(angle)}
                        stroke="var(--border)"
                        strokeWidth="0.5"
                      />
                    )
                  })}

                  {/* Data polygon */}
                  {dims.length > 0 && (
                    <polygon
                      points={dims.map((ds, i) => {
                        const angle = -Math.PI / 2 + i * angleStep
                        const dr = (ds.score / 10) * r
                        return `${cx + dr * Math.cos(angle)},${cy + dr * Math.sin(angle)}`
                      }).join(' ')}
                      fill="rgba(99, 102, 241, 0.2)"
                      stroke="#6366f1"
                      strokeWidth="2"
                    />
                  )}

                  {/* Data points and labels */}
                  {dims.map((ds, i) => {
                    const angle = -Math.PI / 2 + i * angleStep
                    const dr = (ds.score / 10) * r
                    const key = DIMENSION_LABELS[ds.dimension] || 'other'
                    const color = DIMENSION_COLORS[key] || '#6366f1'
                    const labelR = r + 20
                    return (
                      <g key={i}>
                        <circle
                          cx={cx + dr * Math.cos(angle)}
                          cy={cy + dr * Math.sin(angle)}
                          r="4"
                          fill={color}
                        />
                        <text
                          x={cx + labelR * Math.cos(angle)}
                          y={cy + labelR * Math.sin(angle)}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="var(--text)"
                          fontSize="11"
                        >
                          {ds.dimension} {ds.score}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })()}
          </svg>
        </div>
      </div>

      {/* B4: Top issues - clickable to jump to episode */}
      <div className="card">
        <div className="card-title">Top 问题</div>
        {review.top_issues?.map((issue, i) => (
          <div
            key={i}
            className="issue-item"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (issue.episode && setCurrentEpisode) {
                setCurrentEpisode(issue.episode)
              }
            }}
            title={`点击跳转到第${issue.episode}集`}
          >
            <div className="issue-number">{i + 1}</div>
            <div className="issue-content">
              <div className="issue-episode">
                第{issue.episode}集 场景{issue.scene}
                <span style={{ fontSize: 11, color: 'var(--primary-light)', marginLeft: 8 }}>
                  [跳转]
                </span>
              </div>
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

      {/* Review status banner */}
      {review.review_status && (
        <div className="card" style={{
          borderLeft: `4px solid ${
            review.review_status === 'completed' ? 'var(--success)' :
            review.review_status === 'conditional' ? 'var(--warning)' :
            review.review_status === 'paused' ? 'var(--primary-light)' : 'var(--error)'
          }`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {STATUS_LABELS[review.review_status] || review.review_status}
          </div>
          {review.review_status === 'paused' && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              审核已完成，请查看以下结果并决定是否采纳修改建议
            </div>
          )}
        </div>
      )}

      {/* Four-pass review results */}
      {review.four_pass_results?.length > 0 && (
        <div className="card">
          <div className="card-title">四遍审查结果</div>
          {review.four_pass_results.map((pass, i) => (
            <div key={i} style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, borderLeft: `3px solid ${pass.passed ? 'var(--success)' : 'var(--warning)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {PASS_LABELS[pass.pass_name] || pass.pass_name}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 6px', borderRadius: 4,
                  background: pass.passed ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                  color: pass.passed ? 'var(--success)' : 'var(--warning)',
                }}>
                  {pass.passed ? '通过' : `${pass.issue_count}个问题`}
                </span>
              </div>
              {pass.issues?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {pass.issues.map((issue, j) => (
                    <div key={j} style={{ marginBottom: 2 }}>• {issue}</div>
                  ))}
                </div>
              )}
              {pass.suggestions?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--primary-light)' }}>
                  {pass.suggestions.map((s, j) => (
                    <div key={j} style={{ marginBottom: 2 }}>💡 {s}</div>
                  ))}
                </div>
              )}
              {pass.issue_count === 0 && pass.passed && (
                <div style={{ fontSize: 12, color: 'var(--success)' }}>全部通过 ✓</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cross-episode duplicate checks */}
      {review.cross_episode_checks?.length > 0 && (
        <div className="card">
          <div className="card-title">跨集重复检查</div>
          {review.cross_episode_checks.map((check, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>
                  {check.check_type === 'hook' ? '钩子重复' :
                   check.check_type === 'dialogue' ? '对话重复' :
                   check.check_type === 'conflict' ? '冲突模式重复' :
                   check.check_type}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 6px', borderRadius: 4,
                  background: check.has_duplicates ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  color: check.has_duplicates ? 'var(--error)' : 'var(--success)',
                }}>
                  {check.has_duplicates ? '发现重复' : '无重复'}
                </span>
              </div>
              {check.duplicates?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {check.duplicates.map((d, j) => (
                    <div key={j} style={{ marginBottom: 2 }}>• {d}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Event integrity score */}
      {review.event_integrity_score > 0 && (
        <div className="card">
          <div className="card-title">事件完整性</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: `conic-gradient(var(--primary) ${review.event_integrity_score * 360}deg, var(--border) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', background: 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700,
              }}>
                {Math.round(review.event_integrity_score * 100)}%
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {review.event_integrity_score >= 0.9 ? '事件链完整，逻辑清晰' :
               review.event_integrity_score >= 0.7 ? '事件链基本完整，建议检查' :
               '事件链存在断裂，建议复核'}
            </span>
          </div>
        </div>
      )}

      {/* B5: Suggestions with one-click adopt */}
      {review.suggestions?.length > 0 && (
        <div className="card">
          <div className="card-title">修改建议</div>
          {review.suggestions.map((s, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4, padding: '6px 8px', background: 'var(--bg)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{typeof s === 'string' ? s : s.description}</span>
              <button
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '2px 8px', minWidth: 'auto' }}
                onClick={async () => {
                  const episode = typeof s === 'object' ? s.episode : null
                  if (episode && projectId) {
                    // Trigger regeneration for the suggested episode
                    try {
                      const resp = await fetch(`/api/projects/${projectId}/regenerate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ episode_number: episode, regenerate_downstream: false }),
                      })
                      if (resp.ok) {
                        alert(`第${episode}集已触发重生成`)
                      }
                    } catch (e) {
                      console.error('Adopt suggestion failed:', e)
                    }
                  }
                }}
              >
                采纳
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
