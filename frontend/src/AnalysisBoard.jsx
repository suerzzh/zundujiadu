import useStore from './store'

export default function AnalysisBoard() {
  const { analysis, plan } = useStore()

  if (!analysis) {
    return <div className="empty-state"><div className="empty-state-text">暂无分析数据</div></div>
  }

  return (
    <div>
      {/* B2: Overview card - fixed */}
      <div className="card">
        <div className="card-title">总览</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>题材:</span> {analysis.genre}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>频向:</span> {analysis.orientation}</div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: 'var(--text-muted)' }}>子题材:</span> {analysis.sub_genres?.join('、')}
          </div>
        </div>
        {analysis.conflict_pool && (analysis.conflict_pool.core_conflicts?.length > 0 || analysis.conflict_pool.potential_conflicts?.length > 0) && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 4 }}>冲突池</div>
            {analysis.conflict_pool.core_conflicts?.map((c, i) => (
              <div key={`core-${i}`} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                • 核心: {c}
              </div>
            ))}
            {analysis.conflict_pool.sub_conflicts?.map((c, i) => (
              <div key={`sub-${i}`} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                • 次要: {c}
              </div>
            ))}
            {analysis.conflict_pool.potential_conflicts?.map((c, i) => (
              <div key={`pot-${i}`} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                • 潜在: {c}
              </div>
            ))}
          </div>
        )}
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

      {/* B2: Episode directory - fixed data source from plan */}
      <div className="card">
        <div className="card-title">分集目录</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>集号</th>
              <th>标题</th>
              <th>原文章节</th>
              <th>事件</th>
              <th>钩子</th>
              <th>爽点</th>
            </tr>
          </thead>
          <tbody>
            {plan?.episodes?.map((ep, i) => (
              <tr key={i}>
                <td>{ep.episode}</td>
                <td>{ep.title}</td>
                <td style={{ fontSize: 12 }}>{ep.source_chapters?.join(',') || '-'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {ep.events?.join('、') || '-'}
                </td>
                <td style={{ fontSize: 12, color: 'var(--primary-light)' }}>
                  {ep.hook || '-'}
                </td>
                <td style={{ fontSize: 12, color: 'var(--primary-light)' }}>
                  {ep.satisfaction_points?.join('、') || '-'}
                </td>
              </tr>
            )) || (
              <tr>
                <td colSpan={6} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  暂无分集规划数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hook library — collected from plan episodes */}
      <div className="card">
        <div className="card-title">钩子库</div>
        {plan?.episodes?.filter(ep => ep.hook).length > 0 ? (
          plan.episodes.filter(ep => ep.hook).map((ep, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: 'var(--primary-light)' }}>第{ep.episode}集:</span> {ep.hook}
            </div>
          ))
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>暂无钩子数据</div>
        )}
      </div>

      {/* B1: Satisfaction fulfillment table (爽点兑现表) */}
      <div className="card">
        <div className="card-title">爽点兑现表</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>爽点</th>
              <th>兑现方式</th>
              <th>兑现时机</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {(analysis.satisfaction_pool?.fulfillments?.length > 0
              ? analysis.satisfaction_pool.fulfillments
              : analysis.satisfaction_pool?.points?.map((p) => ({ point: p }))
            )?.map((f, i) => (
              <tr key={i}>
                <td style={{ fontSize: 12 }}>{f.point || f.name}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.method || '-'}</td>
                <td style={{ fontSize: 12 }}>第{f.episode || '?'}集</td>
                <td>
                  <span className={`tag tag-${f.status === 'fulfilled' ? 'setup' : f.status === 'partial' ? 'escalation' : 'climax'}`}>
                    {f.status === 'fulfilled' ? '已兑现' : f.status === 'partial' ? '部分兑现' : '未兑现'}
                  </span>
                </td>
              </tr>
            )) || (
              <tr>
                <td colSpan={4} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  暂无爽点兑现数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
            {ch.relationships?.length > 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>关系: {ch.relationships.join('；')}</div>
            )}
          </div>
        ))}
      </div>

      {/* Naming conventions (称呼规范) */}
      {analysis.naming_conventions?.length > 0 && (
        <div className="card">
          <div className="card-title">称呼规范</div>
          {analysis.naming_conventions.map((nc, i) => (
            <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
              • {nc}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
