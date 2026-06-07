import useStore from './store'

const STAGE_LABELS = {
  extractor: '事件提取',
  analyzer: '改编分析',
  planner: '分集规划',
  writer: '剧本写作',
  reviewer: '审核校验',
}

export default function ProgressBar() {
  const { stageProgress, thinkingText, streamingText, streamingStage } = useStore()

  return (
    <div className="progress-container">
      {Object.entries(stageProgress).map(([stage, info]) => {
        const percent = info.status === 'completed' ? 100
          : info.status === 'running' && info.total > 0
            ? Math.round((info.progress / info.total) * 100)
            : 0

        return (
          <div key={stage} className="progress-stage">
            <div className="progress-stage-header">
              <span className="progress-stage-name">{STAGE_LABELS[stage]}</span>
              <span className="progress-stage-status">
                {info.status === 'completed' ? '✓ 完成'
                  : info.status === 'running' ? `${info.progress}/${info.total}`
                  : info.status === 'failed' ? '✗ 失败'
                  : '等待中'}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${info.status === 'completed' ? 'completed' : ''} ${info.status === 'failed' ? 'failed' : ''}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      })}
      {streamingText && (
        <div className="progress-streaming">
          <div className="progress-streaming-label">
            {STAGE_LABELS[streamingStage] || '处理中'} 实时输出
          </div>
          <pre className="progress-streaming-content">{streamingText.slice(-2000)}</pre>
        </div>
      )}
      {!streamingText && thinkingText && (
        <div className="progress-thinking">{thinkingText}</div>
      )}
    </div>
  )
}
