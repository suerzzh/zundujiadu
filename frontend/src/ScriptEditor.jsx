import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import useStore from './store'

export default function ScriptEditor() {
  const { scriptContent, projectId } = useStore()
  const [content, setContent] = useState(scriptContent)
  const [saving, setSaving] = useState(false)

  // Sync content from store
  if (scriptContent && content !== scriptContent) {
    setContent(scriptContent)
  }

  const handleSave = useCallback(async () => {
    if (!projectId) return
    setSaving(true)
    try {
      // Save to workspace via API
      await fetch(`/api/projects/${projectId}/script`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    } catch (e) {
      console.error('Save failed:', e)
    }
    setSaving(false)
  }, [projectId, content])

  if (!scriptContent) {
    return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      </div>
      <div className="empty-state-text">上传小说后，剧本将在此显示</div>
    </div>
  )
  }

  return (
    <div className="editor-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', background: 'linear-gradient(180deg, var(--bg-card), var(--bg-hover))', borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
      <Editor
        height="100%"
        defaultLanguage="yaml"
        value={content}
        onChange={(val) => setContent(val || '')}
        theme="vs"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          fontFamily: "'JetBrains Mono', monospace",
          backgroundColor: '#ffffff',
          renderLineHighlight: 'line',
          selectionHighlight: true,
        }}
      />
    </div>
  )
}
