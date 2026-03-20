'use client'

import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { TemplateEditor } from '@/components/templates/TemplateEditor'
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
          className="flex items-center justify-between px-4 py-3.5"
          style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
        >
          <span className="font-semibold" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Templates</span>
          <button
            onClick={() => setEditing('new')}
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: '#2563EB', color: '#fff' }}
          >
            + New template
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 lg:pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
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
            style={{ background: '#fff' }}
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
