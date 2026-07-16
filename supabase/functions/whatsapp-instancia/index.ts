import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Extração defensiva dos campos da resposta da uazapiGO ─────────────────────
function extractQr(d: any): string | null {
  const c = [d?.qrcode, d?.qrCode, d?.qr, d?.base64, d?.instance?.qrcode, d?.instance?.qrCode, d?.instance?.base64]
  for (const v of c) if (typeof v === 'string' && v.length > 20) return v
  return null
}
function extractConnected(d: any): boolean {
  if (d?.connected === true || d?.instance?.connected === true || d?.loggedIn === true) return true
  const s = String(d?.instance?.status ?? d?.status ?? '').toLowerCase()
  return ['connected', 'open', 'online', 'conectado'].includes(s)
}
function extractNumero(d: any): string | null {
  const raw = d?.instance?.owner ?? d?.owner ?? d?.instance?.jid ?? d?.jid ?? d?.instance?.wid ?? d?.wid ?? d?.number ?? null
  if (typeof raw === 'string' && raw) return raw.split('@')[0].split(':')[0]
  return null
}
function extractToken(d: any): string | null {
  const raw = d?.token ?? d?.instance?.token ?? d?.hash ?? d?.instance?.hash ?? null
  return typeof raw === 'string' && raw ? raw : null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)
    const jwt = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Config da uazapiGO: env (preferencial) ou tabela privada integracao_config
    let BASE = (Deno.env.get('UAZAPI_BASE_URL') ?? '').replace(/\/+$/, '')
    let ADMIN_TOKEN = Deno.env.get('UAZAPI_ADMIN_TOKEN') ?? ''
    if (!BASE || !ADMIN_TOKEN) {
      const { data: cfg } = await admin
        .from('integracao_config')
        .select('chave, valor')
        .in('chave', ['UAZAPI_BASE_URL', 'UAZAPI_ADMIN_TOKEN'])
      for (const row of cfg ?? []) {
        if (row.chave === 'UAZAPI_BASE_URL' && !BASE) BASE = String(row.valor).replace(/\/+$/, '')
        if (row.chave === 'UAZAPI_ADMIN_TOKEN' && !ADMIN_TOKEN) ADMIN_TOKEN = String(row.valor)
      }
    }
    if (!BASE || !ADMIN_TOKEN) {
      return json({ error: 'Configuração da API do WhatsApp ausente (UAZAPI_BASE_URL / UAZAPI_ADMIN_TOKEN).' }, 500)
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData?.user) return json({ error: 'Invalid token' }, 401)
    const userId = userData.user.id

    const { data: rest, error: restErr } = await admin
      .from('restaurantes')
      .select('id, nome_restaurante, whatsapp_token, numero_whatsapp')
      .eq('auth_user_id', userId)
      .single()
    if (restErr || !rest?.id) return json({ error: 'Restaurante não encontrado' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? '')
    let token: string | null = rest.whatsapp_token ?? null

    // Garante que a instância existe (cria via admintoken se necessário)
    async function ensureInstance(): Promise<string> {
      if (token) return token
      const resp = await fetch(`${BASE}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', admintoken: ADMIN_TOKEN },
        body: JSON.stringify({ name: `fib_${rest.id}`, adminField01: '', adminField02: '' }),
      })
      const data = await resp.json().catch(() => ({}))
      const novo = extractToken(data)
      if (!novo) throw new Error('Falha ao criar instância (token não retornado).')
      await admin.from('restaurantes').update({ whatsapp_token: novo }).eq('id', rest.id)
      token = novo
      return novo
    }

    async function callInstance(path: string, method = 'POST') {
      const tk = token as string
      const resp = await fetch(`${BASE}/instance/${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', token: tk },
      })
      return await resp.json().catch(() => ({}))
    }

    // ── Ações ──────────────────────────────────────────────────────────────────
    if (action === 'status') {
      if (!token) return json({ hasInstance: false, connected: false, qrcode: null, numero: rest.numero_whatsapp ?? null })
      const data = await callInstance('status', 'GET')
      const connected = extractConnected(data)
      const numero = extractNumero(data)
      if (connected && numero && numero !== rest.numero_whatsapp) {
        await admin.from('restaurantes').update({ numero_whatsapp: numero }).eq('id', rest.id)
      }
      return json({ hasInstance: true, connected, qrcode: connected ? null : extractQr(data), numero: numero ?? rest.numero_whatsapp ?? null })
    }

    if (action === 'iniciar') {
      await ensureInstance()
      const data = await callInstance('connect', 'POST')
      const connected = extractConnected(data)
      const numero = extractNumero(data)
      if (connected && numero) {
        await admin.from('restaurantes').update({ numero_whatsapp: numero }).eq('id', rest.id)
      }
      return json({ hasInstance: true, connected, qrcode: connected ? null : extractQr(data), numero: numero ?? null })
    }

    if (action === 'desconectar') {
      if (token) await callInstance('disconnect', 'POST')
      await admin.from('restaurantes').update({ numero_whatsapp: null }).eq('id', rest.id)
      return json({ hasInstance: !!token, connected: false, qrcode: null, numero: null })
    }

    if (action === 'reset') {
      if (token) await callInstance('reset', 'POST')
      return json({ ok: true })
    }

    return json({ error: 'Ação inválida' }, 400)
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})
