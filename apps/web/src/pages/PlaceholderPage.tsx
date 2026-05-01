export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="placeholder">
      <h2>{title}</h2>
      <p>该页面骨架已创建，下一步将接入对应 API 列表与表单。</p>
    </div>
  )
}
