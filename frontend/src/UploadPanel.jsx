import { useState, useRef, useCallback } from 'react'
import useStore from './store'

export default function UploadPanel() {
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const { setProject, setPipelineStatus, handleSSEEvent, setError } = useStore()

  const handleFile = useCallback(async (file) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Upload
      const uploadRes = await fetch('/api/projects/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        setError(err.detail || '上传失败')
        return
      }

      const { project_id, chapter_count, warnings } = await uploadRes.json()
      setProject(project_id, chapter_count, warnings)

      // Start pipeline with SSE
      setPipelineStatus('running')

      const eventSource = new EventSource(`/api/projects/${project_id}/convert/stream`)

      eventSource.addEventListener('stage_started', (e) => {
        handleSSEEvent({ event: 'stage_started', ...JSON.parse(e.data) })
      })

      eventSource.addEventListener('stage_progress', (e) => {
        handleSSEEvent({ event: 'stage_progress', ...JSON.parse(e.data) })
      })

      eventSource.addEventListener('stage_completed', (e) => {
        handleSSEEvent({ event: 'stage_completed', ...JSON.parse(e.data) })
      })

      eventSource.addEventListener('stage_failed', (e) => {
        handleSSEEvent({ event: 'stage_failed', ...JSON.parse(e.data) })
        eventSource.close()
      })

      eventSource.addEventListener('pipeline_completed', (e) => {
        handleSSEEvent({ event: 'pipeline_completed', ...JSON.parse(e.data) })
        eventSource.close()
      })

      eventSource.onerror = () => {
        eventSource.close()
      }
    } catch (err) {
      setError('上传失败: ' + err.message)
    }
  }, [setProject, setPipelineStatus, handleSSEEvent, setError])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleChange = (e) => {
    const file = e.target.files[0]
    handleFile(file)
  }

  return (
    <div
      className={`upload-area ${dragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="upload-icon">📄</div>
      <div className="upload-text">
        拖拽小说文本文件到此处<br />或点击选择文件
      </div>
      <div className="upload-hint">支持 .txt 格式，至少 3 个章节</div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
