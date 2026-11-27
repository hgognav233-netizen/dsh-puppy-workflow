/**
 * Puppy Workbench — host half.
 *
 * Reads the session log (read-only) of one root session and its subagent
 * sessions, and projects it into the vocabulary the client half draws:
 * stations (resource locations), actors (one per session), and notes
 * (task, tool call, message, wait). Serves the projection as JSON.
 *
 * Every value is derived from the log; nothing here writes to a session.
 */
import { readFile, stat } from 'node:fs/promises'

export const inject = ['webServer', 'sessionQuery', 'connection']

// Static files the 3D stage loads in the browser: the vendored three.js build
// (unchanged files from three@0.184.0, see vendor/README.md) and the island
// model exported from Blender. Bare and unused imports are rewritten while
// serving, so the vendored files stay byte-identical to the published package.
const STATIC_FILES = {
  'vendor/three/build/three.core.min.js': {},
  'vendor/three/build/three.module.min.js': {},
  'vendor/three/examples/jsm/utils/BufferGeometryUtils.js': {
    rewrite: [["from 'three'", "from '../../../build/three.module.min.js'"]],
  },
  'vendor/three/examples/jsm/loaders/GLTFLoader.js': {
    rewrite: [
      ["from 'three'", "from '../../../build/three.module.min.js'"],
      ["from '../utils/SkeletonUtils.js'", "from '../../../../skeleton-utils-stub.js'"],
    ],
  },
  'vendor/skeleton-utils-stub.js': {},
  // these two change between plugin versions under the same name: always revalidate
  'stage3d.js': { fresh: true },
  'pixel-look.js': { fresh: true },
  'assets/island.glb': { type: 'model/gltf-binary', fresh: true },
}

const LOOPBACK = /^(?:localhost|127\.0\.0\.1|\[?::1\]?)$/i
const EVENT_WINDOW = 1500
const MAX_SESSIONS = 16
const MAX_ITEMS = 420
const MAX_STATIONS = 24
const MAX_CACHED = 60
const LIST_LIMIT = 30
const TITLE_TTL = 15000

const MAX_FLOWS = 14

const FILE_TOOLS = new Set(['read', 'write', 'edit', 'read_image', 'glob', 'grep', 'list', 'str_replace'])
const SHELL_TOOLS = new Set(['pwsh', 'bash', 'shell', 'exec_command'])
const JOB_TOOLS = new Set(['job_output', 'job_kill', 'job_list'])
const DISPATCH_TOOLS = new Set(['subagent', 'subagent_fork', 'spawn_teammate', 'workflow'])
const TEAM_TOOLS = new Set(['team_task_create', 'team_task_update', 'team_task_get', 'team_task_list'])
const ASK_TOOLS = new Set(['ask_user_question'])
const MESSAGE_TOOLS = new Set(['send_message'])
const WAIT_TOOLS = new Set(['wait_agent'])
// `todo_write` is drawn from its `todo/write` event (which carries the list);
// `present` from `deliverables/presented` (which carries the files).
const QUIET_TOOLS = new Set(['list_agents', 'todo_write', 'list_subagents', 'present'])
// The plugin cannot read other plugins' MCP configuration, so "in the cloud"
// is a name heuristic; anything unknown is drawn as software on this computer.
const CLOUD_HINTS = [
  'exa', 'context7', 'miro', 'notion', 'gmail', 'google', 'calendar', 'drive', 'slack', 'github', 'figma',
  'linear', 'asana', 'atlassian', 'jira', 'canva', 'hubspot', 'stripe', 'dropbox', 'onedrive', 'sharepoint',
]
// Dependency and cache folders are one "parts store" instead of dozens of cabinets.
const PARTS = /(?:^|\/)(?:node_modules|__pycache__|\.cache|\.git|site-packages|\.venv|temp|tmp)(?:\/|$)/i
const WRITE_LIKE = /(?:create|write|save|update|set|add|send|post|upload|delete|remove|run|exec|edit|move)/i

/** What the dog does with its paws for one tool. */
export function actionOf(name) {
  if (name === 'grep' || name === 'glob' || name === 'list') return 'search'
  if (name === 'read' || name === 'read_image' || name === 'skill') return 'read'
  if (name === 'write' || name === 'edit' || name === 'str_replace') return 'write'
  if (SHELL_TOOLS.has(name) || JOB_TOOLS.has(name)) return 'run'
  if (name === 'web_search') return 'web-search'
  if (name === 'web_fetch') return 'web-fetch'
  if (name.startsWith('mcp__')) return 'plug'
  if (DISPATCH_TOOLS.has(name)) return 'dispatch'
  if (ASK_TOOLS.has(name)) return 'ask'
  if (TEAM_TOOLS.has(name)) return 'board'
  return 'other'
}

function cloudServer(server) {
  const name = String(server).toLowerCase()
  return CLOUD_HINTS.some((hint) => name.includes(hint))
}

function clip(value, limit) {
  const text = String(value ?? '').trim()
  return text.length > limit ? text.slice(0, limit - 1) + '\u2026' : text
}

function textOf(content) {
  if (typeof content === 'string') return content
  return Array.isArray(content)
    ? content.filter((block) => block?.type === 'text').map((block) => block.text).join('\n')
    : ''
}

function argumentsOf(raw) {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

function pick(args, ...keys) {
  for (const key of keys) {
    if (typeof args[key] === 'string' && args[key].trim()) return args[key].trim()
    // web_search sends `queries: [...]`; show them joined.
    if (Array.isArray(args[key])) {
      const text = args[key].filter((value) => typeof value === 'string' && value.trim()).join(' / ')
      if (text) return text
    }
  }
  return ''
}

// Folder names repeat across a repository (`src/client` appears four times), so
// a station keeps the last two segments and stays distinguishable.
function shortDir(path) {
  const parts = String(path).split(/[\\/]/).filter(Boolean)
  if (parts.length >= 2) return parts.slice(-2).join('/')
  return parts.at(-1) ?? String(path)
}

function isAbsolute(path) {
  return /^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path) || path.startsWith('/')
}

function normalize(path) {
  return String(path).replace(/[\\/]+/g, '/').replace(/\/+$/, '')
}

// Files collapse to their folder: one folder is one station even when the
// session touches a dozen files inside it.
function dirOf(path, cwd) {
  const text = String(path ?? '').trim()
  if (!text) return normalize(cwd || '')
  let full = text
  if (!isAbsolute(text)) {
    const base = normalize(cwd || '')
    full = base ? base + '/' + normalize(text) : normalize(text)
  }
  const normalized = normalize(full)
  const cut = normalized.lastIndexOf('/')
  if (cut > 0) return normalized.slice(0, cut)
  return normalized
}

function resourceOf(name, args, cwd) {
  if (FILE_TOOLS.has(name)) {
    const path = pick(args, 'file_path', 'path', 'target', 'directory')
    const dir = dirOf(path, cwd)
    if (!dir) return { key: 'toolbox', kind: 'tool', name: 'toolbox', detail: '' }
    if (PARTS.test(dir)) return { key: 'parts', kind: 'file', name: 'parts', detail: clip(dir, 90), parts: true }
    return { key: 'dir:' + dir.toLowerCase(), kind: 'file', name: shortDir(dir), detail: clip(dir, 90) }
  }
  if (SHELL_TOOLS.has(name) || JOB_TOOLS.has(name)) return { key: 'shell', kind: 'shell', name: 'shell', detail: '' }
  if (ASK_TOOLS.has(name)) return { key: 'front', kind: 'front', name: 'front', detail: '' }
  if (TEAM_TOOLS.has(name)) return { key: 'desk', kind: 'desk', name: 'desk', detail: '' }
  if (name === 'web_search') return { key: 'web:search', kind: 'web', name: 'search', detail: '' }
  if (name === 'web_fetch') {
    const url = pick(args, 'url')
    let host = 'web'
    try {
      host = new URL(url).host || 'web'
    } catch {
      /* keep the generic web station */
    }
    return { key: 'web:' + host.toLowerCase(), kind: 'web', name: host, detail: clip(url, 90) }
  }
  if (name.startsWith('mcp__')) {
    const server = name.split('__')[1] || 'mcp'
    return {
      key: 'mcp:' + server.toLowerCase(),
      kind: 'mcp',
      name: server,
      detail: 'MCP',
      place: cloudServer(server) ? 'cloud' : 'local',
    }
  }
  if (name === 'skill') {
    return { key: 'skill', kind: 'file', name: 'skills', detail: clip(pick(args, 'skill', 'name'), 40) }
  }
  return { key: 'toolbox', kind: 'tool', name: 'toolbox', detail: name }
}

/**
 * Fold one session's events into notes. Pure: the same events always produce
 * the same notes, which is what the per-session cache relies on.
 */
export function project(session, events) {
  const notes = []
  const calls = new Map()
  let title = ''
  let label = ''
  let task = null
  let taskLabel = ''
  let running = 0
  let lastStation = 'desk'
  let worked = false
  let waiting = false
  let waitCall = null
  let ended = false
  let reply = ''
  let asking = null
  // the model's turn: from a tool result (or your message) until it answers;
  // the next visible step carries how long that took (`think`, ms)
  let modelFrom = null
  let think = null
  const thought = (time) => {
    if (modelFrom !== null && think === null) think = Math.max(0, Math.min(600000, time - modelFrom))
    modelFrom = null
  }
  const takeThink = () => {
    const ms = think
    think = null
    return ms === null ? {} : { think: ms }
  }

  const add = (seq, time, fields) => {
    notes.push({ id: session.id + ':' + seq, time, session: session.id, seq, ...fields })
  }

  for (const event of events) {
    const data = event.data ?? {}
    const seq = event.seq ?? 0
    const time = event.time ?? 0
    switch (event.type) {
      case 'todo/write': {
        const todos = (Array.isArray(data.todos) ? data.todos : []).slice(0, 12).map((todo) => ({
          content: clip(todo?.content, 60),
          status: String(todo?.status ?? ''),
        }))
        add(seq, time, { type: 'plan', actor: session.id, station: 'desk', todos, detail: todos.map((todo) => todo.content).join(' / ') })
        break
      }
      case 'approval/asked': {
        const callId = String(data.callId ?? '')
        const call = calls.get(callId)
        asking = String(data.id ?? callId)
        add(seq, time, {
          type: 'approval.ask',
          actor: session.id,
          approval: asking,
          call: callId,
          tool: String(data.toolName ?? call?.tool ?? ''),
          action: actionOf(String(data.toolName ?? call?.tool ?? '')),
          station: call?.station ?? lastStation,
          target: call?.target ?? '',
          detail: clip(data.reason, 200),
        })
        break
      }
      case 'approval/decided': {
        const id = String(data.id ?? '')
        if (id === asking) asking = null
        add(seq, time, { type: 'approval.done', actor: session.id, approval: id, outcome: String(data.outcome ?? ''), detail: '' })
        break
      }
      case 'compaction/end': {
        add(seq, time, { type: 'compact', actor: session.id, detail: '' })
        break
      }
      case 'deliverables/presented': {
        const files = (Array.isArray(data.files) ? data.files : []).slice(0, 6)
        add(seq, time, {
          type: 'deliver',
          actor: session.id,
          station: 'front',
          files: files.map((file) => clip(String(file?.path ?? '').split(/[\\/]/).pop(), 48)),
          detail: clip(files.map((file) => file?.description ?? '').filter(Boolean).join(' / '), 200),
        })
        break
      }
      case 'assistant/message': {
        const content = data.message?.content
        const text = Array.isArray(content)
          ? content.filter((block) => block?.type === 'text').map((block) => block.text).join('\n').trim()
          : ''
        if (text) reply = clip(text.replace(/\s+/g, ' '), 200)
        thought(time)
        break
      }
      case 'subagent/descriptor': {
        label = clip(data.label, 40)
        break
      }
      case 'session/title': {
        title = clip(data.title, 60)
        break
      }
      case 'user/message': {
        const kind = data.source?.kind ?? 'user'
        const text = textOf(data.content)
        if (kind === 'user') {
          modelFrom = time
          think = null
          task = session.id + ':task:' + seq
          taskLabel = clip(text.split('\n').find((line) => line.trim()) ?? '', 48)
          add(seq, time, {
            type: 'task.open',
            task,
            label: taskLabel,
            detail: clip(text.replace(/\s+/g, ' '), 200),
          })
        }
        // A message from another agent also appears here, in the receiver's log.
        // The sender's own `send_message` call already records the hand-off with
        // its recipient, so this copy is skipped instead of drawn twice.
        break
      }
      case 'tool/call': {
        const name = String(data.name || 'tool')
        const args = argumentsOf(data.arguments)
        if (QUIET_TOOLS.has(name)) break
        thought(time)
        worked = true
        waiting = false
        if (MESSAGE_TOOLS.has(name)) {
          const body = pick(args, 'message', 'content')
          add(seq, time, {
            type: 'message.send',
            actor: session.id,
            to: pick(args, 'target', 'to', 'agent'),
            toName: clip(pick(args, 'target', 'to', 'agent'), 40),
            station: 'desk',
            carry: clip(body.replace(/\s+/g, ' '), 60),
            detail: clip(body, 200),
            ...takeThink(),
          })
          lastStation = 'desk'
          break
        }
        if (WAIT_TOOLS.has(name)) {
          add(seq, time, { type: 'agent.wait', actor: session.id, station: 'desk', label: 'wait', detail: '', ...takeThink() })
          lastStation = 'desk'
          waiting = true
          waitCall = String(data.callId || '')
          break
        }
        const resource = DISPATCH_TOOLS.has(name)
          ? { key: 'desk', kind: 'desk', name: 'desk', detail: '' }
          : resourceOf(name, args, session.cwd)
        const target = clip(
          pick(args, 'file_path', 'path', 'command', 'cmd', 'query', 'queries', 'url', 'description', 'label', 'name', 'skill'),
          70,
        )
        const item = {
          type: 'call.start',
          actor: session.id,
          call: String(data.callId || seq),
          tool: name,
          action: actionOf(name),
          station: resource.key,
          resource,
          target,
          label: name,
          detail: target,
          ...takeThink(),
        }
        add(seq, time, item)
        calls.set(item.call, item)
        running++
        lastStation = resource.key
        break
      }
      case 'tool/result': {
        const message = data.message ?? {}
        const callId = String(message.toolCallId ?? data.callId ?? '')
        if (callId && callId === waitCall) {
          waiting = false
          waitCall = null
        }
        const call = calls.get(callId)
        if (!call) break
        modelFrom = time
        calls.delete(callId)
        running = Math.max(0, running - 1)
        const status = message.isError || data.error ? 'failed' : 'ok'
        add(seq, time, {
          type: 'call.end',
          actor: session.id,
          call: call.call,
          station: call.station,
          tool: call.tool,
          action: call.action,
          status,
          target: call.target,
          detail: status === 'failed' ? clip(data.error?.reason ?? textOf(message.content), 200) : '',
        })
        break
      }
      case 'turn/start': {
        ended = false
        break
      }
      case 'turn/end': {
        ended = true
        // A call whose result never arrived (interrupted) is closed here, so a
        // stopped turn never leaves a dog stuck at a station.
        for (const call of calls.values()) {
          add(seq, time, {
            type: 'call.end',
            actor: session.id,
            call: call.call,
            station: call.station,
            tool: call.tool,
            action: call.action,
            status: 'stopped',
            target: call.target,
            detail: '',
          })
        }
        calls.clear()
        running = 0
        waiting = false
        asking = null
        if (task) {
          const reason = data.reason?.kind ?? ''
          add(seq, time, {
            type: 'task.end',
            actor: session.id,
            task,
            label: taskLabel,
            status: reason && reason !== 'completed' ? 'stopped' : 'ok',
            reply,
            detail: reason === 'aborted' ? 'aborted' : reason,
            ...takeThink(),
          })
          task = null
        }
        break
      }
      default:
        break
    }
  }

  // The last action is what a dog is doing right now; the client cannot derive
  // it from history it deliberately does not replay.
  const lastNote = [...notes].reverse().find((note) => note.type !== 'actor.spawn') ?? null
  const last = lastNote
    ? {
        type: lastNote.type,
        tool: lastNote.tool ?? '',
        action: lastNote.action ?? '',
        target: lastNote.target ?? '',
        status: lastNote.status ?? '',
        carry: lastNote.carry ?? '',
      }
    : null

  return {
    notes, title, label, running, lastStation, openTask: task !== null, worked, waiting, ended, last,
    asking: asking !== null,
  }
}

/**
 * Which places this round connected. Inferred, not logged: a dog that took
 * something from A and then wrote to B links A→B; a helper's sources pass to
 * its parent when it finishes. Items must be in time order.
 */
export function flowsOf(items, actors) {
  const parentOf = new Map(actors.map((actor) => [actor.id, actor.parent]))
  const lastIndex = new Map()
  items.forEach((item, index) => { if (item.actor) lastIndex.set(item.actor, index) })
  const sources = new Map()
  const edges = new Map()
  // The three places a dog took something from most recently: older reads
  // are not what it is writing from, and linking them all draws a hairball.
  const sourcesOf = (actor) => {
    if (!sources.has(actor)) sources.set(actor, [])
    return sources.get(actor)
  }
  const remember = (list, station) => {
    const at = list.indexOf(station)
    if (at >= 0) list.splice(at, 1)
    list.push(station)
    if (list.length > 3) list.shift()
  }
  const link = (from, to, item) => {
    if (!from || !to || from === to) return
    const key = from + '→' + to
    const edge = edges.get(key) ?? { from, to, count: 0, time: 0, actor: item.actor }
    edge.count++
    edge.time = item.time
    edge.actor = item.actor
    edges.set(key, edge)
  }
  items.forEach((item, index) => {
    const actor = item.actor
    if (item.type === 'task.open' && actor) sources.set(actor, [])
    if (item.type === 'call.end' && item.status === 'ok' && item.station && item.station !== 'desk') {
      const action = item.action || actionOf(item.tool || '')
      const mine = sourcesOf(actor)
      const writes = action === 'write' || (action === 'plug' && WRITE_LIKE.test(String(item.tool).split('__').pop()))
      if (writes) for (const from of mine) link(from, item.station, item)
      if (['read', 'search', 'web-search', 'web-fetch', 'plug'].includes(action)) remember(mine, item.station)
    }
    // A helper's last note: what it gathered now belongs to whoever sent it.
    if (actor && lastIndex.get(actor) === index && parentOf.get(actor)) {
      const parent = sourcesOf(parentOf.get(actor))
      for (const from of sourcesOf(actor)) remember(parent, from)
    }
  })
  return [...edges.values()].sort((left, right) => right.time - left.time).slice(0, MAX_FLOWS)
}

function hashOf(text) {
  let hash = 2166136261
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function apply(ctx) {
  const logs = new Map()
  const lineages = new Map()
  const titles = new Map()

  function remember(map, key, value) {
    map.delete(key)
    map.set(key, value)
    if (map.size > MAX_CACHED) map.delete(map.keys().next().value)
    return value
  }

  function liveSession(id) {
    try {
      return ctx.get('sessions')?.get(id)
    } catch {
      return undefined
    }
  }

  async function logOf(row) {
    const cached = logs.get(row.id)
    const live = liveSession(row.id)
    if (live && typeof live.snapshotEvents === 'function') {
      const seq = live.seq ?? 0
      if (cached?.seq === seq && cached.projection) return cached.projection
      const inherited = live.inheritedEventCount ?? 0
      const from = Math.max(inherited, seq - EVENT_WINDOW)
      const projection = project(row, live.snapshotEvents(from, seq) ?? [])
      return remember(logs, row.id, { seq, projection, diskAt: 0 }).projection
    }
    if (cached?.projection && Date.now() - (cached.diskAt ?? 0) < 3000) return cached.projection
    const snapshot = await ctx.sessionQuery.readSession(row.id)
    const events = snapshot?.events ?? []
    const inherited = snapshot?.inheritedEventCount ?? 0
    const from = Math.max(inherited, events.length - EVENT_WINDOW)
    const projection = project(row, events.slice(from))
    return remember(logs, row.id, { projection, diskAt: Date.now(), seq: -1 }).projection
  }

  async function lineageOf(rootId) {
    const cached = lineages.get(rootId)
    if (cached && Date.now() - cached.at < 2000) return cached.rows
    const trace = await ctx.sessionQuery.traceSession(rootId)
    if (!trace?.target?.header) return []
    const rows = []
    const seen = new Set()
    const walk = (record, descendants, depth) => {
      const header = record?.header
      if (!header?.id || seen.has(header.id)) return
      if (depth && header.origin && header.origin !== 'subagent') return
      seen.add(header.id)
      rows.push({
        id: header.id,
        parent: header.parentSession ?? null,
        depth,
        cwd: header.cwd ?? '',
        createdAt: header.createdAt ?? 0,
        origin: header.origin ?? '',
      })
      for (const child of descendants ?? []) walk(child.session, child.descendants, depth + 1)
    }
    walk(trace.target, trace.descendants, 0)
    remember(lineages, rootId, { at: Date.now(), rows })
    return rows
  }

  async function buildSnapshot(rootId) {
    const rows = (await lineageOf(rootId)).slice(0, MAX_SESSIONS)
    if (!rows.length) return null
    const projections = []
    for (const row of rows) projections.push(await logOf(row))

    const stations = new Map([['desk', { id: 'desk', name: 'desk', kind: 'desk', detail: '', order: 0 }]])
    const items = []
    const actors = []
    let activeTools = 0
    let openTasks = 0

    rows.forEach((row, index) => {
      const projection = projections[index]
      const root = index === 0
      const name = root ? clip(projection.title || '', 24) : clip(projection.label || '', 24)
      const state = projection.asking
        ? 'asking'
        : projection.running > 0
          ? 'working'
          : root
            ? (projection.waiting ? 'waiting' : 'idle')
            : (projection.ended ? 'done' : 'idle')
      actors.push({
        id: row.id,
        parent: row.parent,
        depth: row.depth,
        role: root ? 'lead' : 'helper',
        name,
        sprite: root ? 0 : 1 + (hashOf(row.id) % 2),
        slot: index,
        station: projection.lastStation || 'desk',
        state,
        last: projection.last,
      })
      if (!root) {
        items.push({
          id: row.id + ':spawn',
          time: row.createdAt,
          session: row.id,
          seq: 0,
          type: 'actor.spawn',
          actor: row.id,
          parent: row.parent,
          name,
          station: 'desk',
          label: 'spawn',
          detail: projection.label,
        })
      }
      activeTools += projection.running
      openTasks += projection.openTask ? 1 : 0
      for (const note of projection.notes) items.push({ ...note })
    })

    items.sort((left, right) => left.time - right.time || String(left.id).localeCompare(String(right.id)))

    // Stations come from the whole projection, not from the visible window: a
    // folder the session used earlier keeps its place.
    for (const item of items) {
      if (!item.resource) continue
      if (!stations.has(item.resource.key) && stations.size < MAX_STATIONS) {
        stations.set(item.resource.key, {
          id: item.resource.key,
          name: item.resource.name,
          kind: item.resource.kind,
          detail: item.resource.detail,
          place: item.resource.place ?? '',
          parts: item.resource.parts === true,
          order: stations.size,
        })
      }
      item.station = item.resource.key
      delete item.resource
    }
    for (const item of items) if (!item.station) item.station = 'desk'
    const flows = flowsOf(items, actors)

    const windowed = items.slice(-MAX_ITEMS)
    // The window can start after the current job opened; without its opening
    // note the header would fall back to the session title.
    if (!windowed.some((item) => item.type === 'task.open' && item.session === rootId)) {
      const opening = items.findLast((item) => item.type === 'task.open' && item.session === rootId)
      if (opening) windowed.unshift(opening)
    }

    return {
      root: rootId,
      generatedAt: Date.now(),
      title: clip(projections[0].title, 60),
      actors,
      stations: [...stations.values()],
      items: windowed,
      flows,
      counts: { tasks: openTasks, agents: actors.length, tools: activeTools },
    }
  }

  function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' },
    })
  }

  async function snapshotResource(request) {
    const query = new URL(request.url, 'http://localhost').searchParams
    const root = query.get('root') || ''
    if (!root || root.length > 180) return json({ error: 'invalid_session' }, 400)
    try {
      const snapshot = await buildSnapshot(root)
      if (!snapshot) return json({ error: 'session_not_found' }, 404)
      return json(snapshot)
    } catch (error) {
      if (error?.code === 'SESSION_QUERY_SESSION_NOT_FOUND') return json({ error: 'session_not_found' }, 404)
      return json({ error: 'session_unavailable' }, 503)
    }
  }

  async function rootsOf() {
    const records = await ctx.sessionQuery.listSessions()
    return (records ?? [])
      .filter((record) => record.header?.id && !record.header.parentSession && record.header.origin !== 'subagent')
      .sort((left, right) => (right.header.createdAt ?? 0) - (left.header.createdAt ?? 0))
      .slice(0, LIST_LIMIT)
  }

  async function sessionsResource() {
    try {
      const roots = await rootsOf()
      const live = new Set()
      try {
        for (const session of ctx.get('sessions')?.list() ?? []) {
          live.add(session.header?.id ?? String(session.id))
        }
      } catch {
        /* live membership stays empty */
      }
      await Promise.all(roots.map(async (record) => {
        const id = record.header.id
        const cached = titles.get(id)
        if (cached && Date.now() - cached.at < TITLE_TTL) return
        try {
          const snapshot = await ctx.sessionQuery.readTitle(id)
          titles.set(id, { title: clip(snapshot?.title, 60), at: Date.now() })
        } catch {
          titles.set(id, { title: '', at: Date.now() })
        }
      }))
      return json({
        sessions: roots.map((record) => ({
          id: record.header.id,
          createdAt: record.header.createdAt ?? 0,
          cwd: record.header.cwd ?? '',
          live: live.has(record.header.id),
          title: titles.get(record.header.id)?.title ?? '',
        })),
      })
    } catch {
      return json({ error: 'sessions_unavailable' }, 503)
    }
  }

  // Session data (list, replay, ping): only a reader the host admitted. Over HTTP
  // the webserver passes no Peer, so ask Connection — the same Host/Origin fence
  // and signed browser-session cookie that guard the Harness page itself.
  // No loopback fallback: any local process can reach 127.0.0.1.
  function dataRejection(request, peer) {
    if (peer) return undefined
    try {
      return ctx.connection.requestRejection(request)
    } catch {
      return 401
    }
  }

  // Static modules and the island model hold no session data; like the Harness's
  // own non-index assets they stay readable from a loopback listener.
  function canRead(request, peer) {
    if (peer) return true
    const authority = request.headers.get('host')
    const host = authority?.replace(/^(\[[^\]]+\]|[^:]+):\d+$/, '$1') ?? new URL(request.url).hostname
    const crossSite = ['cross-site', 'same-site'].includes(request.headers.get('sec-fetch-site'))
    return LOOPBACK.test(ctx.webServer.host) && LOOPBACK.test(host) && !crossSite
  }

  const staticCache = new Map()
  async function staticResource(name) {
    const spec = STATIC_FILES[name]
    const file = new URL('./' + name, import.meta.url)
    let body
    try {
      // re-read when the file changed on disk (plugin updated in place)
      const { mtimeMs } = await stat(file)
      const cached = staticCache.get(name)
      if (cached && cached.mtimeMs === mtimeMs) body = cached.body
      else {
        body = await readFile(file)
        if (spec.rewrite) {
          let text = body.toString('utf8')
          for (const [from, to] of spec.rewrite) text = text.split(from).join(to)
          body = Buffer.from(text, 'utf8')
        }
        staticCache.set(name, { mtimeMs, body })
      }
    } catch {
      return json({ error: 'not_found' }, 404)
    }
    return new Response(body, {
      headers: {
        'content-type': spec.type ?? 'text/javascript; charset=utf-8',
        'cache-control': spec.fresh ? 'no-cache' : 'private, max-age=3600',
      },
    })
  }

  for (const name of Object.keys(STATIC_FILES)) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/puppy-workflow/' + name,
      auth: 'required',
      resource: (request, peer) => canRead(request, peer) ? staticResource(name) : json({ error: 'access_denied' }, 403),
    }))
  }

  for (const [name, resource] of [
    ['snapshot', snapshotResource],
    ['sessions', sessionsResource],
    ['ping', () => json({ ok: true, plugin: 'puppy-workflow' })],
  ]) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: '/puppy-workflow/' + name,
      auth: 'required',
      resource: (request, peer) => {
        const rejection = dataRejection(request, peer)
        return rejection === undefined ? resource(request) : json({ error: rejection === 401 ? 'unauthorized' : 'access_denied' }, rejection)
      },
    }))
  }
}
