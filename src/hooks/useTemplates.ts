'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Template } from '@/types'

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/templates')
    if (res.ok) setTemplates(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createTemplate(name: string, body: string) {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body }),
    })
    if (res.ok) await load()
  }

  async function updateTemplate(id: string, name: string, body: string) {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, body }),
    })
    if (res.ok) await load()
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setTemplates(t => t.filter(x => x.id !== id))
  }

  async function duplicateTemplate(template: Template) {
    await createTemplate(`${template.name} (copy)`, template.body)
  }

  return { templates, loading, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, reload: load }
}
