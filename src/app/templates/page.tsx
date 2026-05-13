'use client'

import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { DraggableNavPill } from '@/components/DraggableNavPill'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { TemplateEditor } from '@/components/templates/TemplateEditor'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTemplates } from '@/hooks/useTemplates'
import type { Template } from '@/types'

export default function TemplatesPage() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = useTemplates()
  const [editing, setEditing] = useState<Template | 'new' | null>(null)

  async function handleSave(name: string, body: string) {
    if (editing === 'new') {
      await createTemplate(name, body)
    } else if (editing) {
      await updateTemplate(editing.id, name, body)
    }
    setEditing(null)
  }

  async function handleDelete(template: Template) {
    if (!confirm(`Delete "${template.name}"?`)) return
    await deleteTemplate(template.id)
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4"
          style={{ background: 'var(--bg)', minHeight: 52 }}
        >
          <DraggableNavPill />
          <button
            onClick={() => setEditing('new')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
          >
            + New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 lg:pb-4">
          {loading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl p-4 flex flex-col gap-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex gap-1 pt-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No templates yet</p>
              <button
                onClick={() => setEditing('new')}
                className="text-sm font-semibold px-4 py-2 rounded-xl"
                style={{ background: '#2563EB', color: '#fff' }}
              >
                Create your first template
              </button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => setEditing(template)}
                  onDuplicate={() => duplicateTemplate(template)}
                  onDelete={() => handleDelete(template)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {editing !== null && (
        <div
          className="fixed inset-0 flex items-end lg:items-center justify-center z-50 p-0 lg:p-4"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditing(null) }}
        >
          <div
            className="w-full lg:max-w-lg rounded-t-2xl lg:rounded-2xl p-5 flex flex-col gap-0 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>
                {editing === 'new' ? 'New template' : 'Edit template'}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-xl leading-none"
                style={{ color: 'var(--muted)' }}
              >
                ×
              </button>
            </div>
            <TemplateEditor
              template={editing !== 'new' ? editing : undefined}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </AppShell>
  )
}
