import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { handleCorsOptions } from '../_shared/cors.ts'
import { respondError, respondJson } from '../_shared/http.ts'

// Custom CORS headers — Allow-Headers is "authorization, content-type"
// here (no apikey / x-client-info). preview-transactional-email is
// internal-only, gated by LOVABLE_API_KEY, so we keep the tighter list.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// Renders all registered templates with their previewData.
// Gated by LOVABLE_API_KEY — only the Go API calls this.

Deno.serve(async (req) => {
  const pre = handleCorsOptions(req, corsHeaders)
  if (pre) return pre

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    return respondError(500, 'Server configuration error', corsHeaders)
  }

  // Verify the caller is authorized with LOVABLE_API_KEY
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (token !== apiKey) {
    return respondError(401, 'Unauthorized', corsHeaders)
  }

  const templateNames = Object.keys(TEMPLATES)
  const results: Array<{
    templateName: string
    displayName: string
    subject: string
    html: string
    status: 'ready' | 'preview_data_required' | 'render_failed'
    errorMessage?: string
  }> = []

  for (const name of templateNames) {
    const entry = TEMPLATES[name]
    const displayName = entry.displayName || name

    if (!entry.previewData) {
      results.push({
        templateName: name,
        displayName,
        subject: '',
        html: '',
        status: 'preview_data_required',
      })
      continue
    }

    try {
      const html = await renderAsync(
        React.createElement(entry.component, entry.previewData)
      )
      const resolvedSubject =
        typeof entry.subject === 'function'
          ? entry.subject(entry.previewData)
          : entry.subject

      results.push({
        templateName: name,
        displayName,
        subject: resolvedSubject,
        html,
        status: 'ready',
      })
    } catch (err) {
      console.error('Failed to render template for preview', {
        template: name,
        error: err,
      })
      results.push({
        templateName: name,
        displayName,
        subject: '',
        html: '',
        status: 'render_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return respondJson(200, { templates: results }, corsHeaders)
})
