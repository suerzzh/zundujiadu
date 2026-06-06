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
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-text">上传小说后，剧本将在此显示</div>
      </div>
    )
  }

  return (
    <div className="editor-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
      <Editor
        height="100%"
        defaultLanguage="yaml"
        value={content}
        onChange={(val) => setContent(val || '')}
        theme="vs-dark"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          padding: { top: 12 },
        }}
      />
    </div>
  )
}
