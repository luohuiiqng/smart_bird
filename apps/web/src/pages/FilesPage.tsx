import { useState, type FormEvent } from 'react'
import {
  deleteFile,
  getFileDetail,
  getFilePresignedUrl,
  uploadFileBinary,
} from '../lib/api'
import type { FileAsset, FileCategory } from '../types'

const CATEGORIES: FileCategory[] = [
  'ANSWER_SHEET_TEMPLATE',
  'IMPORT_FILE',
  'EXPORT_FILE',
  'SCAN_IMAGE',
  'OTHER',
]

export function FilesPage() {
  const [fileIdInput, setFileIdInput] = useState('')
  const [detail, setDetail] = useState<FileAsset | null>(null)
  const [presignedUrl, setPresignedUrl] = useState('')
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [category, setCategory] = useState<FileCategory>('IMPORT_FILE')
  const [bizType, setBizType] = useState('student-import')
  const [bizId, setBizId] = useState('1')
  const [createdFileId, setCreatedFileId] = useState<number | null>(null)

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!selectedFile) {
      setError('请先选择文件')
      return
    }
    try {
      const data = await uploadFileBinary({
        file: selectedFile,
        category,
        bizType: bizType.trim() || undefined,
        bizId: bizId.trim() ? Number(bizId) : undefined,
      })
      setCreatedFileId(data.fileId)
      setFileIdInput(String(data.fileId))
      setPresignedUrl('')
      const loaded = await getFileDetail(data.fileId)
      setDetail(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传登记失败')
    }
  }

  const onQueryDetail = async () => {
    if (!fileIdInput) return
    setError('')
    try {
      const data = await getFileDetail(Number(fileIdInput))
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败')
    }
  }

  const onPresign = async () => {
    if (!fileIdInput) return
    setError('')
    try {
      const data = await getFilePresignedUrl(Number(fileIdInput), 300)
      setPresignedUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取签名失败')
    }
  }

  const onDelete = async () => {
    if (!fileIdInput) return
    setError('')
    try {
      await deleteFile(Number(fileIdInput))
      setDetail(null)
      setPresignedUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="org-page">
      <div className="page-header">
        <h2>文件中心</h2>
        <span>{createdFileId ? `最近创建文件ID: ${createdFileId}` : '未创建文件'}</span>
      </div>
      {error ? <div className="error-tip">{error}</div> : null}

      <div className="block-card">
        <h3>真实上传（MinIO）</h3>
        <form className="inline-form exam-bind-form" onSubmit={onUpload}>
          <select value={category} onChange={(e) => setCategory(e.target.value as FileCategory)}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <input value={bizType} onChange={(e) => setBizType(e.target.value)} />
          <input value={bizId} onChange={(e) => setBizId(e.target.value)} />
          <button type="submit">上传文件</button>
        </form>
        <p>{selectedFile ? `已选择: ${selectedFile.name}` : '尚未选择文件'}</p>
      </div>

      <div className="block-card">
        <h3>文件查询与操作</h3>
        <div className="inline-form exam-bind-form">
          <input
            placeholder="fileId"
            value={fileIdInput}
            onChange={(e) => setFileIdInput(e.target.value)}
          />
          <button type="button" onClick={onQueryDetail}>
            查询详情
          </button>
          <button type="button" onClick={onPresign}>
            获取签名链接
          </button>
          <button type="button" onClick={onDelete}>
            删除文件
          </button>
        </div>
        {detail ? (
          <div className="data-card">
            <p>ID: {detail.id}</p>
            <p>名称: {detail.fileName}</p>
            <p>分类: {detail.category}</p>
            <p>大小: {detail.size}</p>
            <p>ObjectKey: {detail.objectKey}</p>
          </div>
        ) : (
          <p>暂无文件详情</p>
        )}
        {presignedUrl ? (
          <p>
            签名地址：
            <a href={presignedUrl} target="_blank" rel="noreferrer">
              打开链接
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
