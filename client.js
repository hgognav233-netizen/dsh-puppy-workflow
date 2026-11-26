/**
 * Puppy Workbench — client half (beginner view, island garden).
 *
 * Draws the projection served by `index.js` as a small island garden: the
 * island is this computer (flower beds = folders, windmill = commands, shed +
 * vine = local apps through a connector, cottage door = you), the sea is the
 * internet (mail boat + buoys), the far islet is a cloud service, the whale in
 * the sea is the model. One dog per session; the basket on its back is its
 * notebook (context). Every animation is one real event (tool call, message,
 * wait, approval…). React owns the chrome (story bar, work log, inspector);
 * the stage is imperative SVG so animation never re-renders React.
 */
window.__ModuleLoader__.load({
  id: 'puppy-workflow',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useLayoutEffect, useRef, useState, useCallback } = React
    const useIsoLayout = useLayoutEffect || useEffect

    const NS = 'puppyWorkflow'
    // DSH locale lookup is a flat key lookup, so every key is one flat string.
    const DICTS = {
      zh: {
        open: '小狗',
        openFull: '打开小狗工作台',
        panel: '小狗工作台',
        title: '小狗工作台',
        subtitle: '看 AI 在你电脑上做什么',
        close: '关闭',
        loading: '正在读会话记录…',
        failed: '读不到这个会话的记录',
        retry: '重试',
        reconnect: '连接中断 · 重试',
        live: '运行中',
        sessions: '会话',
        noSessions: '没有可打开的会话',
        empty: 'AI 还没开始干活。它一动，小狗就会出门。',
        ledger: '工作记录',
        ledgerHint: '每条是真实发生的一步。点一条看原始记录。',
        raw: '原始记录',
        flows: '连线',
        words: '文字',
        wordsHint: '关掉画面上的文字标注（木牌、计数、名牌、卡片），只留小狗的对话气泡',
        flowsHint: '连线是推测：一只狗从 A 拿了东西、接着写进 B，就画 A→B。',
        dex: '图鉴',
        dexTitle: '画面里的动作是什么意思',
        dexClose: '知道了',
        lead: '领队',
        helper: '帮手',
        roleLead: '领队 · 主 Agent（你直接对话的 AI）',
        roleHelper: '帮手 · 子 Agent（领队派出的独立对话）',
        nowLabel: '现在：',
        taskLabel: '任务：',
        packLabel: '竹篮（读进来的东西）：{n} 份',
        toolsLabel: '用了 {n} 次工具',
        idle: '待命',
        sleeping: '下班睡觉了',
        waitingNow: '坐着等帮手回信',
        askingNow: '叼着花在门口等你批准',
        more: '还有 {n} 只在睡',
        otherFolders: '还有 {n} 个文件夹没画出来',
        'phase.open': '接单', 'phase.plan': '计划', 'phase.split': '分工', 'phase.work': '干活', 'phase.done': '交付',
        'stat.helpers': '帮手 {n}', 'stat.folders': '文件夹 {n}', 'stat.web': '上网 {n}', 'stat.runs': '命令 {n}',
        'stat.plugs': '连接器 {n}', 'stat.fails': '失败 {n}', 'stat.asks': '等你批准 {n}',
        'zone.files': '档案室', 'zone.filesSub': '电脑里的文件夹',
        'zone.apps': '插座墙', 'zone.appsSub': '接到 AI 上的本机软件（MCP）',
        'zone.front': '前台', 'zone.frontSub': '你和 AI 说话的地方',
        'zone.hq': '指挥部', 'zone.hqSub': '想事、列计划、等人',
        'zone.kennel': '狗窝', 'zone.kennelSub': '帮手出生、下班',
        'zone.shell': '机房', 'zone.shellSub': '终端：让电脑跑命令',
        'zone.net': '互联网', 'zone.netSub': '离开了你的电脑',
        'zone.cloud': '云端服务', 'zone.cloudSub': '经连接器接上',
        house: '你 的 电 脑',
        chat: '你的对话',
        board: '计划',
        door: '门',
        parts: '零件库', partsSub: '依赖和缓存',
        skills: 'skills', skillsSub: '技能说明',
        localApp: '本机软件',
        search: '搜索',
        'say.taskOpen': '你发来新任务：「{label}」',
        'say.helperTask': '{who}接到任务包袱：「{label}」',
        'say.taskEnd': '{who}交回答案。{reply}',
        'say.taskStop': '这一轮被停下了',
        'say.helperEnd': '{who}干完交差',
        'say.plan': '{who}在告示板上列计划：{n} 步{doing}',
        'say.planDoing': '，正在做「{text}」',
        'say.spawn': '{who}吹散蒲公英，叫来帮手「{name}」',
        'say.search': '{who}在「{place}」花圃里找 {target}',
        'say.read': '{who}在「{place}」花圃闻花，读 {target}',
        'say.write': '{who}在「{place}」花圃种花，写 {target}',
        'say.run': '{who}推风车，让电脑跑命令：{target}',
        'say.webSearch': '{who}在码头等邮船，上网搜索：{target}',
        'say.webFetch': '{who}在码头等邮船，去网上取页面：{place}',
        'say.plugCloud': '{who}叫海鸥去小浮岛，用云端服务 {place}',
        'say.plugLocal': '{who}顺着藤蔓去工具棚，用本机软件 {place}',
        'say.dispatch': '{who}派活：{target}',
        'say.ask': '{who}叼着花到门口，问你一个问题',
        'say.board': '{who}看团队告示板',
        'say.other': '{who}用工具 {tool}',
        'say.ok': '{text} ✓',
        'say.failed': '{text} — 失败了{reason}',
        'say.stopped': '{text} — 被中断',
        'say.message': '{who}寄花瓣信给 {to}：{carry}',
        'say.wait': '{who}坐下等帮手回话',
        'say.approvalAsk': '{who}叼着花在门口等你批准：{target}',
        'say.approvalYes': '你批准了，{who}继续干',
        'say.approvalNo': '你没批准，{who}不做这一步',
        'say.compact': '{who}的竹篮装太满，把旧笔记倒进堆肥（记忆压缩）',
        'say.deliver': '{who}把文件送到小屋门口：{files}',
        'bark.got': '收到！', 'bark.help': '来帮忙！', 'bark.ouch': '嗷！', 'bark.catch': '汪！',
        'bark.dig': '扒拉扒拉…', 'bark.found': '找到了', 'bark.stamp': '种好啦', 'bark.boot': '……靴子？',
        'bark.caught': '收到信啦', 'bark.cough': '咳咳', 'bark.ugh': '呃…', 'bark.stop': '停！',
        'bark.ask': '可以吗？', 'bark.question': '问你个问题', 'bark.thanks': '谢啦！', 'bark.fine': '好吧～',
        'bark.squish': '塞一塞…', 'bark.done': '做完啦！', 'bark.take': '给你！', 'bark.puff': '噗',
        'bark.tool': '叮叮当', 'bark.plugged': '连上了', 'bark.print': '出来了',
        'dex.1': '小屋里飞出一封信|你发来一条消息|user message',
        'dex.2': '在告示板上列清单（右上角的「计划」）|列计划|todo_write',
        'dex.3': '蒲公英种子落地，变成一只新小狗|派出子 Agent（独立的新对话）|subagent / spawn_teammate',
        'dex.4': '把小包袱扔给帮手|给子 Agent 下指令，它只看得到包袱里的话|subagent prompt',
        'dex.5': '在花圃里扒拉、花瓣乱飞|在文件夹里搜索|grep / glob / list',
        'dex.6': '低头闻花，竹篮里长出一枝|读文件|read',
        'dex.7': '花圃里冒出一朵新花|写入或修改文件|write / edit',
        'dex.8': '推风车，风车转快|让电脑跑命令|pwsh / bash',
        'dex.9': '码头上等邮船，邮船去浮标那边|网上搜索、抓取网页|web_search / web_fetch',
        'dex.10': '邮船带回一封信，放进竹篮|网上的内容读进来了|web result',
        'dex.11': '邮船带回一只靴子 / 风车冒黑烟|工具调用失败|error',
        'dex.12': '藤蔓上的小灯跑向工具棚、棚门亮灯|用本机软件的连接器|mcp__…（本机）',
        'dex.13': '海鸥飞去小浮岛送信|用云端服务的连接器|mcp__…（云端）',
        'dex.14': '花瓣信|Agent 之间发消息|send_message',
        'dex.15': '坐着打瞌睡、冒 z|等别的 Agent 回话|wait_agent',
        'dex.16': '叼着花坐在门口「可以吗？」|请你批准|approval',
        'dex.17': '把篮子里的叶子倒进堆肥|记忆太满，压缩整理|compaction',
        'dex.18': '把花瓣信交回领队，然后在草地上睡觉|子 Agent 交回结果、结束|subagent result / turn end',
        'dex.19': '把花送到小屋门口|给你最终回复|assistant reply',
        'dex.20': '小狗抬头看鲸鱼，鲸鱼冒泡泡、喷水、抛来一颗种子，小狗跳起来接住|每一步之前 AI 都先问大模型；泡泡越多，大模型这次想得越久|model',
        'dex.21': '竹篮里的枝叶|读进来的东西（上下文）|context',
        'dex.22': '鲸鱼喷出彩虹|AI 给了你最终回答|assistant reply',
        'dex.23': '闲着时闻闻地、挠耳朵、伸懒腰、追蝴蝶|只是在玩，不代表 AI 在做事|—',
        sceneLabel: '小岛花园：岛是你的电脑，小狗是 AI，海里的鲸鱼是大模型',
        whale: '鲸鱼 = 大模型（大脑）',
        you: '你',
        'label.net': '海那边 = 互联网',
        'label.cloud': '小浮岛 = 云端服务',
        'count.read': '读 {n}',
        'count.write': '写 {n}',
        'bark.whistle': '♪',
      },
      en: {
        open: 'Puppy',
        openFull: 'Open the puppy workbench',
        panel: 'Puppy workbench',
        title: 'Puppy workbench',
        subtitle: 'See what AI does on your computer',
        close: 'Close',
        loading: 'Reading the session log…',
        failed: 'This session log could not be read',
        retry: 'Retry',
        reconnect: 'Disconnected · retry',
        live: 'Running',
        sessions: 'Sessions',
        noSessions: 'No session to open',
        empty: 'Nothing yet. The dogs head out as soon as the AI starts working.',
        ledger: 'Work log',
        ledgerHint: 'Each line is one real step. Click one to see the raw record.',
        raw: 'Raw record',
        flows: 'Links',
        words: 'Labels',
        wordsHint: 'Hide the words on the island (signs, counts, name tags, cards); the dogs’ speech bubbles stay',
        flowsHint: 'Links are inferred: a dog that took something from A and then wrote to B draws A→B.',
        dex: 'Guide',
        dexTitle: 'What the actions mean',
        dexClose: 'Got it',
        lead: 'Lead',
        helper: 'Helper',
        roleLead: 'Lead · main agent (the AI you talk to)',
        roleHelper: 'Helper · subagent (a separate conversation the lead started)',
        nowLabel: 'Now: ',
        taskLabel: 'Task: ',
        packLabel: 'Basket (things read in): {n}',
        toolsLabel: '{n} tool calls',
        idle: 'Standing by',
        sleeping: 'Off duty, asleep',
        waitingNow: 'Waiting for a helper to write back',
        askingNow: 'Waiting at your door with a flower for your approval',
        more: '{n} more asleep',
        otherFolders: '{n} more folders not drawn',
        'phase.open': 'Request', 'phase.plan': 'Plan', 'phase.split': 'Delegate', 'phase.work': 'Work', 'phase.done': 'Deliver',
        'stat.helpers': 'Helpers {n}', 'stat.folders': 'Folders {n}', 'stat.web': 'Web {n}', 'stat.runs': 'Commands {n}',
        'stat.plugs': 'Connectors {n}', 'stat.fails': 'Failures {n}', 'stat.asks': 'Approvals {n}',
        'zone.files': 'File room', 'zone.filesSub': 'Folders on this computer',
        'zone.apps': 'Socket wall', 'zone.appsSub': 'Local software plugged into the AI (MCP)',
        'zone.front': 'Front desk', 'zone.frontSub': 'Where you talk to the AI',
        'zone.hq': 'HQ', 'zone.hqSub': 'Thinking, planning, waiting',
        'zone.kennel': 'Kennel', 'zone.kennelSub': 'Helpers start and sleep here',
        'zone.shell': 'Machine room', 'zone.shellSub': 'Terminal: runs commands',
        'zone.net': 'Internet', 'zone.netSub': 'Outside your computer',
        'zone.cloud': 'Cloud services', 'zone.cloudSub': 'Through connectors',
        house: 'YOUR COMPUTER',
        chat: 'Your chat',
        board: 'Plan',
        door: 'Door',
        parts: 'Parts store', partsSub: 'Dependencies & caches',
        skills: 'skills', skillsSub: 'Skill notes',
        localApp: 'Local software',
        search: 'Search',
        'say.taskOpen': 'You sent a new request: “{label}”',
        'say.helperTask': '{who} got the task bundle: “{label}”',
        'say.taskEnd': '{who} handed back the answer. {reply}',
        'say.taskStop': 'This round was stopped',
        'say.helperEnd': '{who} finished and reported back',
        'say.plan': '{who} wrote a plan on the notice board: {n} steps{doing}',
        'say.planDoing': ', now on “{text}”',
        'say.spawn': '{who} blew a dandelion and called in helper “{name}”',
        'say.search': '{who} is rummaging through the “{place}” bed for {target}',
        'say.read': '{who} sniffs the “{place}” bed, reading {target}',
        'say.write': '{who} plants a flower in the “{place}” bed, writing {target}',
        'say.run': '{who} pushes the windmill to run a command: {target}',
        'say.webSearch': '{who} waits for the mail boat to search the web: {target}',
        'say.webFetch': '{who} waits for the mail boat to fetch a page: {place}',
        'say.plugCloud': '{who} sends the gull to the islet to use the cloud service {place}',
        'say.plugLocal': '{who} follows the vine to the shed to drive {place} on this computer',
        'say.dispatch': '{who} hands out work: {target}',
        'say.ask': '{who} brings a flower to your door with a question',
        'say.board': '{who} checks the team notice board',
        'say.other': '{who} uses the tool {tool}',
        'say.ok': '{text} ✓',
        'say.failed': '{text} — failed{reason}',
        'say.stopped': '{text} — interrupted',
        'say.message': '{who} sends a petal letter to {to}: {carry}',
        'say.wait': '{who} sits down to wait for helpers',
        'say.approvalAsk': '{who} waits at your door with a flower for your approval: {target}',
        'say.approvalYes': 'You approved; {who} carries on',
        'say.approvalNo': 'You declined; {who} skips this step',
        'say.compact': '{who}\'s basket was too full, so old notes went on the compost (memory compaction)',
        'say.deliver': '{who} brought files to the cottage door: {files}',
        'bark.got': 'Got it!', 'bark.help': 'Help!', 'bark.ouch': 'Ow!', 'bark.catch': 'Woof!',
        'bark.dig': 'rummage…', 'bark.found': 'Found it', 'bark.stamp': 'Planted', 'bark.boot': '…a boot?',
        'bark.caught': 'A letter!', 'bark.cough': 'cough', 'bark.ugh': 'Uh…', 'bark.stop': 'Stop!',
        'bark.ask': 'May I?', 'bark.question': 'A question', 'bark.thanks': 'Thanks!', 'bark.fine': 'OK then',
        'bark.squish': 'squeeze…', 'bark.done': 'Done!', 'bark.take': 'Here!', 'bark.puff': 'pff',
        'bark.tool': 'clink', 'bark.plugged': 'Connected', 'bark.print': 'Printed',
        'dex.1': 'A letter flies out of the cottage|You sent a message|user message',
        'dex.2': 'A list on the notice board (“Plan” top right)|Making a plan|todo_write',
        'dex.3': 'A dandelion seed lands and becomes a new dog|A subagent starts (a separate conversation)|subagent / spawn_teammate',
        'dex.4': 'A bundle tossed to the helper|Instructions for the subagent; it only sees what is in the bundle|subagent prompt',
        'dex.5': 'Rummaging in a flower bed, petals flying|Searching a folder|grep / glob / list',
        'dex.6': 'Sniffing flowers, a sprout grows in the basket|Reading a file|read',
        'dex.7': 'A new flower pops up in the bed|Writing or editing a file|write / edit',
        'dex.8': 'Pushing the windmill, it spins fast|Running a command|pwsh / bash',
        'dex.9': 'Waiting on the pier, the mail boat sails to a buoy|Web search or fetching a page|web_search / web_fetch',
        'dex.10': 'The boat brings back a letter for the basket|Web content was read in|web result',
        'dex.11': 'The boat brings back a boot / the windmill puffs black smoke|A tool call failed|error',
        'dex.12': 'Lights run along the vine, the shed door lights up|Using a local app through a connector|mcp__… (local)',
        'dex.13': 'The gull flies a letter to the islet|Using a cloud service through a connector|mcp__… (cloud)',
        'dex.14': 'Petal letter|Agents message each other|send_message',
        'dex.15': 'Sitting and dozing, z z z|Waiting for another agent|wait_agent',
        'dex.16': 'Sitting at your door with a flower: “May I?”|Asking for your approval|approval',
        'dex.17': 'Leaves from the basket onto the compost|Memory too full, compacted|compaction',
        'dex.18': 'Hands a petal letter to the lead, then sleeps on the grass|The subagent returns its result and ends|subagent result / turn end',
        'dex.19': 'Flowers carried to the cottage door|The final reply to you|assistant reply',
        'dex.20': 'The dog looks up at the whale; it bubbles, spouts and tosses a seed the dog jumps to catch|Before every step the AI asks the model; more bubbles = the model took longer|model',
        'dex.21': 'Sprouts in the basket|Things read in (context)|context',
        'dex.22': 'The whale spouts a rainbow|The AI gave you its final answer|assistant reply',
        'dex.23': 'Sniffing, scratching, stretching, chasing a butterfly when free|Just play: not something the AI is doing|—',
        sceneLabel: 'Island garden: the island is your computer, the dogs are the AI, the whale in the sea is the model',
        whale: 'Whale = the model (brain)',
        you: 'You',
        'label.net': 'Over the sea = the internet',
        'label.cloud': 'Islet = cloud service',
        'count.read': 'read {n}',
        'count.write': 'wrote {n}',
        'bark.whistle': '♪',
      },
    }

    const localeListeners = new Set()
    let localeVersion = 0
    let translate = (key) => key
    const fmt = (key, vars) => {
      let text = String(translate(key))
      if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])))
      return text
    }

    function useT() {
      const [, bump] = useState(0)
      useEffect(() => {
        const listener = () => bump((value) => value + 1)
        localeListeners.add(listener)
        return () => { localeListeners.delete(listener) }
      }, [])
      return fmt
    }
    const tr = (key) => translate(key)

    // ------------------------------------------------------------- data access

    async function getJson(path) {
      const response = await fetch(path, { headers: { accept: 'application/json' }, cache: 'no-store' })
      if (!response.ok) {
        const error = new Error('http_' + response.status)
        error.status = response.status
        throw error
      }
      return response.json()
    }

    function useWorkbenchData(root, interval = 2000) {
      const [state, setState] = useState({ data: null, error: null, attempt: 0 })
      const attempt = state.attempt
      useEffect(() => {
        if (!root) return undefined
        let stopped = false
        let timer = 0
        let inFlight = false
        const load = async () => {
          if (inFlight || document.hidden) return
          inFlight = true
          try {
            const data = await getJson('/puppy-workflow/snapshot?root=' + encodeURIComponent(root))
            // Some items (task.open) name their session but not an actor.
            for (const item of data.items ?? []) if (!item.actor && item.session) item.actor = item.session
            if (!stopped) setState((prev) => ({ ...prev, data, error: null }))
          } catch (error) {
            if (!stopped) setState((prev) => ({ ...prev, error: error?.status ?? -1 }))
          } finally {
            inFlight = false
          }
        }
        load()
        timer = window.setInterval(load, interval)
        return () => {
          stopped = true
          window.clearInterval(timer)
        }
      }, [root, interval, attempt])
      const retry = useCallback(() => setState((prev) => ({ ...prev, attempt: prev.attempt + 1 })), [])
      return { data: state.data, error: state.error, retry }
    }

    // ------------------------------------------------------ plain language

    const lastSegment = (text) => String(text ?? '').split(/[\\/]/).filter(Boolean).at(-1) ?? ''
    /** Replies are Markdown; a beginner sees words, not ## | ** `. */
    const unmark = (text) => String(text ?? '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?/g, ' ')
      .replace(/[#*`>|]+/g, ' ')
    const clipText = (text, limit) => {
      const value = unmark(text).replace(/\s+/g, ' ').trim()
      return value.length > limit ? value.slice(0, limit - 1) + '…' : value
    }

    /** A station's beginner name: last folder segment, host, or server. */
    function placeName(station, id) {
      if (!station) {
        if (String(id).startsWith('web:')) return String(id).slice(4)
        if (String(id).startsWith('mcp:')) return String(id).slice(4)
        if (String(id).startsWith('dir:')) return lastSegment(String(id).slice(4))
        return String(id ?? '')
      }
      if (station.id === 'parts') return tr('parts')
      if (station.id === 'skill') return tr('skills')
      if (station.id === 'web:search') return tr('search')
      if (station.kind === 'file') return lastSegment(station.detail || station.name) || station.name
      return station.name || station.id
    }

    function targetText(item) {
      const target = String(item.target ?? '')
      if (item.action === 'read' || item.action === 'write') return lastSegment(target) || target
      if (item.action === 'search') return target.length > 30 ? '' : target
      return clipText(target, 40)
    }

    const ACTION_SAY = {
      search: 'say.search', read: 'say.read', write: 'say.write', run: 'say.run', 'web-search': 'say.webSearch',
      'web-fetch': 'say.webFetch', dispatch: 'say.dispatch', ask: 'say.ask', board: 'say.board', other: 'say.other',
    }

    /** One sentence a beginner can read, for any projected item. */
    function plainOf(item, ctx) {
      const who = ctx.who(item.actor)
      const station = ctx.station(item.station)
      const place = placeName(station, item.station)
      switch (item.type) {
        case 'task.open':
          return ctx.isLead(item.actor)
            ? fmt('say.taskOpen', { label: clipText(item.label, 40) })
            : fmt('say.helperTask', { who, label: clipText(item.label, 40) })
        case 'task.end':
          if (!ctx.isLead(item.actor)) return fmt('say.helperEnd', { who })
          if (item.status !== 'ok') return fmt('say.taskStop')
          return fmt('say.taskEnd', { who, reply: clipText(item.reply, 80) })
        case 'plan': {
          const todos = item.todos ?? []
          const doing = todos.find((todo) => todo.status === 'in_progress')
          return fmt('say.plan', {
            who,
            n: todos.length,
            doing: doing ? fmt('say.planDoing', { text: clipText(doing.content, 30) }) : '',
          })
        }
        case 'actor.spawn':
          return fmt('say.spawn', { who: ctx.who(item.parent), name: clipText(item.name, 24) })
        case 'call.start':
        case 'call.end': {
          let base
          if (item.action === 'plug') {
            base = fmt(station?.place === 'cloud' ? 'say.plugCloud' : 'say.plugLocal', { who, place })
          } else {
            base = fmt(ACTION_SAY[item.action] ?? 'say.other', { who, place, target: targetText(item), tool: item.tool })
          }
          if (item.type === 'call.start') return base
          if (item.status === 'failed') return fmt('say.failed', { text: base, reason: item.detail ? '：' + clipText(item.detail, 60) : '' })
          if (item.status === 'stopped') return fmt('say.stopped', { text: base })
          return fmt('say.ok', { text: base })
        }
        case 'message.send':
          return fmt('say.message', { who, to: ctx.whoByName(item.to), carry: clipText(item.carry, 40) })
        case 'agent.wait':
          return fmt('say.wait', { who })
        case 'approval.ask':
          return fmt('say.approvalAsk', { who, target: clipText(item.detail || item.target || item.tool, 60) })
        case 'approval.done':
          return fmt(/allow|approve|accept/i.test(item.outcome) ? 'say.approvalYes' : 'say.approvalNo', { who })
        case 'compact':
          return fmt('say.compact', { who })
        case 'deliver':
          return fmt('say.deliver', { who, files: (item.files ?? []).join('、') })
        default:
          return who + ' · ' + item.type
      }
    }

    function rawOf(item) {
      const lines = []
      if (item.tool) lines.push(item.tool + (item.target ? '  ' + item.target : ''))
      else lines.push(item.type)
      if (item.status) lines.push('→ ' + item.status)
      if (item.todos) for (const todo of item.todos) lines.push('[' + (todo.status || ' ') + '] ' + todo.content)
      if (item.files) lines.push(item.files.join(', '))
      if (item.outcome) lines.push('→ ' + item.outcome)
      if (item.carry && !item.detail) lines.push(item.carry)
      if (item.reply) lines.push(item.reply)
      if (item.detail && item.detail !== item.target) lines.push(item.detail)
      if (item.label && item.type === 'task.open') lines.push(item.label)
      return lines.join('\n')
    }

    // ---------------------------------------------------------------- stage: island garden
    //
    // The island is this computer, the sea around it is the internet, the far
    // islet is a cloud service and the whale in the sea is the model (the
    // brain). Flower beds are folders, the windmill runs commands, the pier is
    // where the mail boat (the web) lands, the shed on the shore is a local app
    // reached through a connector (the vine). One dog per session; the basket on
    // its back is its notebook (context). All of it is drawn in code as one SVG
    // in a plan-oblique view with the sun from the front-left.

    const SVG_NS = 'http://www.w3.org/2000/svg'
    const CANCEL = Symbol('cancel')
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    function svgEl(tag, attrs, parent) {
      const node = document.createElementNS(SVG_NS, tag)
      if (attrs) for (const key in attrs) node.setAttribute(key, attrs[key])
      if (parent) parent.append(node)
      return node
    }
    function rng(seed) {
      return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }
    // Plan turned 45°, depth squashed to 0.57, heights straight up.
    const K = 1.2, F = 0.57, V = 0.95, CX = 436, CY = 395, C45 = 0.7071
    function P(x, y, z = 0) { return [CX + (x - y) * C45 * K, CY + (x + y) * C45 * K * F - z * V] }
    function planAt(sx, sy) { const a = (sx - CX) / (C45 * K), b = (sy - CY) / (C45 * K * F); return [(a + b) / 2, (b - a) / 2] }
    function smooth(points, closed = true) {
      const n = points.length, at = (i) => points[(i + n) % n]
      let d = 'M' + points[0][0].toFixed(1) + ' ' + points[0][1].toFixed(1)
      const last = closed ? n : n - 1
      for (let i = 0; i < last; i++) {
        const p0 = closed ? at(i - 1) : points[Math.max(0, i - 1)]
        const p1 = at(i), p2 = closed ? at(i + 1) : points[Math.min(n - 1, i + 1)]
        const p3 = closed ? at(i + 2) : points[Math.min(n - 1, i + 2)]
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
        d += 'C' + [...c1, ...c2, ...p2].map((v) => v.toFixed(1)).join(' ')
      }
      return d + (closed ? 'Z' : '')
    }
    function blob(cx, cy, r, wobble, n, seed, z = 0) {
      const rand = rng(seed), pts = [], phase = rand() * 6
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const k = 1 + wobble * (Math.sin(a * 2 + phase) * 0.6 + (rand() - 0.5))
        pts.push(P(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k, z))
      }
      return pts
    }
    function sblob(cx, cy, rx, ry, wobble, n, seed) {
      const rand = rng(seed), pts = []
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, k = 1 + wobble * (rand() - 0.5)
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
      }
      return pts
    }
    const poly = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z'
    const lerp = (a, b, t) => a + (b - a) * t
    const SH = [0.85, -0.18]
    const SHADOW = '#4d7a2a'
    function textWidth(text, size) {
      let width = 0
      for (const ch of String(text)) width += /[⺀-￿]/.test(ch) ? size : size * 0.6
      return width
    }

    const C = {
      sea: '#4a9f95', seaDeep: '#3d8d86', seaLight: '#5aae9f',
      grass: '#8fbb47', grassLight: '#a8cb5c', grassDark: '#76a53c', rim: '#b9d56e',
      path: '#e9dfb9', pathEdge: '#d4c79b',
      pond: '#86c6c0', pondLight: '#a9dbd3', pondEdge: '#5f9f86', reflect: '#3b8673',
      cypress: '#2f6b3c', cypressLight: '#40804a', cypressDark: '#245535',
      crown: '#79a944', crownLight: '#9fc65a', crownDark: '#4f8a3f', trunk: '#6b5034',
      bush: '#5f9a43', bushLight: '#84b852',
      roof: '#d9804a', roofDark: '#b8673a', houseWall: '#f5f1e6', houseShade: '#e3dccb', door: '#7f5a36', glass: '#9cc6cf',
      wood: '#cd8f4e', woodDark: '#a8733c', sail: '#efe2bf',
      yellow: '#f1c63c', yellowLight: '#f8e27e', pink: '#eea5a3', pinkLight: '#f8cfc6', leaf: '#5f8a35', leafDark: '#4a7029',
      pier: '#d8af73', pierDark: '#a97f4b', post: '#7c5a38',
      whale: '#3f6f8a', whaleDark: '#2f5a74', belly: '#c3d9d5', bellyLine: '#f2f8f6',
    }
    const COATS = {
      shiba: { coat: '#e0974a', shade: '#c47a36', light: '#f6ead6', ear: 'pointy', earColor: '#e0974a', inner: '#f3c99a', muzzle: '#f6ead6', tail: 'curl', socks: true },
      brown: { coat: '#9c714c', shade: '#80593a', light: '#b98f67', ear: 'floppy', earColor: '#7a5434', muzzle: '#b48a62', tail: 'plume' },
      cream: { coat: '#efe2cb', shade: '#d8c7aa', light: '#fbf5ea', ear: 'floppy', earColor: '#3f3b36', muzzle: '#fbf5ea', tail: 'plume' },
    }
    // Four flower beds = the four folders used most recently.
    const BEDS = [
      { cx: 510, cy: 300, rx: 60, ry: 21, color: C.yellow, light: C.yellowLight },
      { cx: 684, cy: 412, rx: 70, ry: 26, color: C.pink, light: C.pinkLight },
      { cx: 742, cy: 486, rx: 46, ry: 17, color: '#f4efe2', light: '#ffffff', signSide: 0.62 },
      { cx: 160, cy: 322, rx: 46, ry: 17, color: '#b9a3dc', light: '#dccff2' },
    ]
    const BUOYS = [[990, 700], [1092, 744], [1194, 702], [1120, 652]]
    const SLEEP = [[600, 566], [96, 462], [638, 580], [68, 436]]
    const OFFSETS = [0, -26, 26, -50, 50, -74, 74]
    const DOCK = [912, 652]
    const PATHS = {
      A: [[319, 391], [379, 395], [452, 399], [516, 420], [581, 452], [640, 490], [664, 530], [672, 552]],
      B: [[452, 399], [452, 355], [428, 307], [436, 278], [500, 258], [581, 258], [638, 266]],
      C: [[638, 266], [672, 299], [646, 331], [597, 352], [557, 380], [516, 420]],
      D: [[379, 395], [330, 425], [260, 445], [200, 470], [172, 505], [170, 540]],
    }

    /** Draws the island into `svg`; ids are prefixed with `u` so two stages can coexist. */
    function buildIsland(svg, u, t) {
      const el = svgEl
      const url = (name) => 'url(#' + u + name + ')'
      svg.setAttribute('viewBox', '0 0 1280 800')
      svg.innerHTML = `<defs>
<filter id="${u}grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.18  0 0 0 0 0.12  0 0 0 -1.3 0.95"/></filter>
<filter id="${u}speck" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves="1" seed="3"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.99  0 0 0 0 0.94  0 0 0 -2.3 1.3"/></filter>
<filter id="${u}fuzz" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="${u}soft"><feGaussianBlur stdDeviation="28"/></filter>
<filter id="${u}soft8"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="${u}soft3"><feGaussianBlur stdDeviation="3"/></filter>
<pattern id="${u}stones" width="28" height="16" patternUnits="userSpaceOnUse"><path d="M0 15.5 H28 M0 7.5 H28 M9 0 V7.5 M22 8 V15.5" stroke="#9c875b" stroke-width=".7" opacity=".22" fill="none"/></pattern>
<pattern id="${u}planks" width="6" height="40" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="40" stroke="#8a5a2c" stroke-width=".9" opacity=".45"/></pattern>
<pattern id="${u}weave" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><path d="M0 1.6 H3.2 M1.6 0 V1.6" stroke="#8d6c37" stroke-width=".6" fill="none"/></pattern>
<linearGradient id="${u}wallGrad" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#e6d3a5"/><stop offset=".55" stop-color="#dcc697"/><stop offset="1" stop-color="#c3ac7a"/></linearGradient>
<linearGradient id="${u}underwater" gradientUnits="userSpaceOnUse" x1="0" y1="-70" x2="0" y2="50"><stop offset="0" stop-color="#4a9f95" stop-opacity="0"/><stop offset=".55" stop-color="#4a9f95" stop-opacity=".15"/><stop offset="1" stop-color="#4a9f95" stop-opacity=".7"/></linearGradient>
<marker id="${u}arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2c3a2e"/></marker>
</defs>`
      const bg = el('rect', { width: 1280, height: 800, fill: C.sea }, svg)
      const layer = (attrs) => el('g', attrs, svg)
      const sea = layer()
      const whaleLayer = layer()
      const island = layer()
      const groundLayer = layer()
      const shadows = layer({ opacity: 0.9, 'clip-path': url('islandClip') })
      const tufts = layer()
      const objects = layer()
      const fx = layer()
      const clouds = layer({ style: 'mix-blend-mode: multiply; pointer-events: none' })
      const grain = el('rect', { width: 1280, height: 800, filter: url('grain'), style: 'mix-blend-mode: multiply; pointer-events: none', opacity: 0.5 }, svg)
      const speck = el('rect', { width: 1280, height: 800, filter: url('speck'), style: 'pointer-events: none', opacity: 0.3 }, svg)
      const ui = layer({ class: 'pws-ui' })
      const flows = layer({ class: 'pws-flows' })

      const place = (node, y) => { node.dataset.y = y; return node }
      const castShadow = (x, y, len, w, opacity = 0.32) => {
        const tx = x + len * SH[0], ty = y + len * SH[1]
        el('path', { d: `M${x} ${y - w * 0.3} Q ${(x + tx) / 2} ${(y + ty) / 2 - w * 0.6} ${tx} ${ty} Q ${(x + tx) / 2 + w * 0.3} ${(y + ty) / 2 + w * 0.6} ${x} ${y + w * 0.3} Z`, fill: SHADOW, opacity }, shadows)
      }
      const leafMarks = (parent, cx, cy, rx, ry, n, seed, colors, size = 1) => {
        const rand = rng(seed)
        for (let i = 0; i < n; i++) {
          const a = rand() * Math.PI * 2, d = Math.sqrt(rand())
          const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d
          const col = colors[Math.floor(rand() * colors.length)]
          el('ellipse', { cx: x.toFixed(1), cy: y.toFixed(1), rx: (1.8 + rand() * 1.4) * size, ry: (0.9 + rand() * 0.5) * size, fill: col.c, opacity: col.o, transform: `rotate(${(-40 + rand() * 80).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})` }, parent)
        }
      }
      const sway = (rand, d, a) => ({ class: 'pws-sway', style: `--d:${(d + rand() * 2).toFixed(1)}s; --delay:${(-rand() * 4).toFixed(1)}s; --a:${(a + rand() * 0.8).toFixed(1)}deg` })
      const label = (parent, x, y, text, size = 15, anchor = 'middle', fill = '#ffffff') => {
        const node = el('text', { x, y, 'text-anchor': anchor, 'font-size': size, fill, class: 'pws-place' }, parent)
        node.textContent = text
        return node
      }

      // ---------- sea
      el('path', { d: smooth(blob(40, 40, 520, 0.2, 10, 11, -60)), fill: C.seaDeep, opacity: 0.35, filter: url('soft') }, sea)
      el('ellipse', { cx: 1040, cy: 470, rx: 260, ry: 170, fill: C.seaLight, opacity: 0.25, filter: url('soft') }, sea)
      {
        const rand = rng(21)
        for (let i = 0; i < 18; i++) {
          const x = rand() * 1280, y = 30 + rand() * 750
          if (x < 880 && y > 120 && y < 690) continue
          const w = 14 + rand() * 26
          el('path', { d: `M${x.toFixed(0)} ${y.toFixed(0)} q ${w / 2} -3 ${w} 0`, stroke: '#e8f4ee', 'stroke-width': 1.4, fill: 'none', 'stroke-linecap': 'round', class: 'pws-glint', style: `--d:${(5 + rand() * 4).toFixed(1)}s; --delay:${(-rand() * 8).toFixed(1)}s` }, sea)
        }
      }

      // ---------- whale (the model)
      const swirls = el('g', { opacity: 0.4 }, whaleLayer)
      for (const [rx, ry, dash, d] of [[170, 92, '120 50 30 80', 16], [205, 112, '160 70 50 110', 21], [245, 134, '80 120 180 90', 27], [128, 70, '70 40', 12]]) {
        el('ellipse', { cx: 1060, cy: 430, rx, ry, transform: 'rotate(-30 1060 430)', fill: 'none', stroke: '#eef8f3', 'stroke-width': 1.5, 'stroke-dasharray': dash, 'stroke-linecap': 'round', opacity: 0.75, class: 'pws-swirl', style: `--d:${d}s` }, swirls)
      }
      const whale = el('g', {}, whaleLayer)
      const BODY = 'M0 6 C 2 -30 50 -62 130 -70 C 200 -76 250 -84 290 -110 C 320 -130 340 -158 352 -190 L 368 -183 C 362 -150 344 -114 320 -88 C 292 -58 242 -20 182 4 C 122 28 52 40 18 34 C 4 30 -2 20 0 6 Z'
      const BELLY = 'M-6 -2 C 40 6 120 2 196 -26 C 252 -48 300 -84 340 -128 L 420 40 L -20 90 Z'
      const whaleBody = el('g', {}, whale)
      el('clipPath', { id: u + 'whaleClip' }, whaleLayer).append(el('path', { d: BODY }))
      const flukes = el('g', {}, whaleBody)
      el('path', { d: 'M0 0 C -12 -6 -34 -16 -58 -14 C -44 -30 -20 -36 -2 -20 C 6 -40 26 -52 52 -50 C 38 -30 18 -10 0 0 Z', fill: C.whale }, flukes)
      el('path', { d: 'M0 0 C 6 -22 22 -40 52 -50 C 38 -30 18 -10 0 0 Z', fill: C.whaleDark, opacity: 0.5 }, flukes)
      el('path', { d: BODY, fill: C.whale }, whaleBody)
      const skin = el('g', { 'clip-path': url('whaleClip') }, whaleBody)
      el('path', { d: 'M0 -10 C 60 -60 200 -80 360 -200 L 400 -260 L -40 -260 Z', fill: C.whaleDark, opacity: 0.55 }, skin)
      {
        const rand = rng(5)
        el('path', { d: 'M24 -36 C 90 -62 200 -76 300 -126', stroke: '#86abc0', 'stroke-width': 14, fill: 'none', opacity: 0.28, filter: url('soft3'), 'stroke-linecap': 'round' }, skin)
        for (let i = 0; i < 600; i++) {
          const x = rand() * 370, y = -205 + rand() * 230, big = rand() < 0.1
          el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (big ? 2 + rand() * 2.5 : 0.5 + rand() * 1.1).toFixed(1), fill: rand() > 0.45 ? '#b4d0de' : '#1f4157', opacity: (big ? 0.14 + rand() * 0.14 : 0.3 + rand() * 0.35).toFixed(2) }, skin)
        }
      }
      el('path', { d: BELLY, fill: C.belly }, skin)
      for (let i = 0; i < 11; i++) {
        const o = 3.5 + i * 3.6
        el('path', { d: `M-6 ${-2 + o} C 40 ${6 + o * 0.9} 120 ${2 + o * 0.7} 196 ${-26 + o * 0.5} C 252 ${-48 + o * 0.4} 300 ${-84 + o * 0.4} 340 ${-128 + o * 0.4}`, stroke: C.bellyLine, 'stroke-width': 0.9, fill: 'none', opacity: 0.85 }, skin)
      }
      el('path', { d: 'M2 14 C 30 22 70 22 104 12', stroke: C.whaleDark, 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, skin)
      el('rect', { x: -60, y: -260, width: 520, height: 360, fill: url('underwater') }, skin)
      const deepTint = el('path', { d: BODY, fill: C.sea, opacity: 0.4 }, whaleBody)
      el('path', { d: 'M126 24 C 148 54 170 84 200 98 C 196 76 176 44 158 16 Z', fill: C.whaleDark, opacity: 0.9 }, whaleBody)
      const eyeOpen = el('circle', { cx: 62, cy: -6, r: 2.6, fill: '#1c3242' }, whaleBody)
      const eyeShut = el('path', { d: 'M57 -6 q 5 4 10 0', stroke: '#1c3242', 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, whaleBody)
      const bodyWaves = el('g', { opacity: 0 }, whale)
      for (const [x, y, w] of [[40, -40, 70], [120, -52, 90], [220, -66, 70], [70, -24, 50], [180, -36, 60], [270, -92, 40], [300, -40, 60]]) {
        el('path', { d: `M${x} ${y} q ${w * 0.25} -6 ${w * 0.5} 0 t ${w * 0.5} 0`, stroke: '#f4fbf8', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, bodyWaves)
      }
      const rays = el('g', { opacity: 0.3, style: 'mix-blend-mode: screen' }, whaleLayer)
      for (const [x, w] of [[930, 26], [990, 40], [1070, 22], [1120, 34]]) el('path', { d: `M${x} 230 L ${x + w} 230 L ${x + w - 110} 640 L ${x - 120} 640 Z`, fill: '#d9f1ea', opacity: 0.35, filter: url('soft8') }, rays)
      const W = { x: 862, y: 532, rot: -12, rise: 0.45, lift: 0, t: 0, spouting: false }
      const whaleMatrix = () => {
        const drift = Math.sin(W.t / 5600) * 10, bob = Math.sin(W.t / 1400) * 2.4
        return new DOMMatrix().translate(W.x + drift, W.y + bob + (1 - W.rise) * 10).rotate(W.rot).scale(1.12)
      }
      const wpt = (x, y) => { const p = whaleMatrix().transformPoint(new DOMPoint(x, y)); return [p.x, p.y] }
      const drawWhale = () => {
        whale.setAttribute('transform', whaleMatrix().toString())
        const r = W.rise
        whaleBody.setAttribute('opacity', (0.6 + 0.4 * r).toFixed(2))
        deepTint.setAttribute('opacity', ((1 - r) * 0.5).toFixed(2))
        bodyWaves.setAttribute('opacity', Math.max(0, Math.min(1, (r - 0.35) * 1.6)).toFixed(2))
        rays.setAttribute('opacity', ((1 - r) * 0.35).toFixed(2))
        swirls.setAttribute('opacity', (0.25 + 0.6 * r).toFixed(2))
        eyeOpen.setAttribute('opacity', W.spouting ? 0 : 1)
        eyeShut.setAttribute('opacity', W.spouting ? 1 : 0)
        flukes.setAttribute('transform', `translate(360 -186) rotate(${(16 - W.lift * 22).toFixed(1)}) scale(${(1 + W.lift * 0.15).toFixed(2)})`)
      }
      label(sea, 1150, 600, t('whale'), 15, 'middle').setAttribute('opacity', 0.85)

      // ---------- island
      const R = 330
      const TOP = blob(0, 0, R, 0.035, 20, 5)
      const LOW = blob(0, 0, R, 0.035, 20, 5, -50)
      el('path', { d: smooth(blob(0, 0, R + 10, 0.035, 20, 5, -58)), fill: '#2f7d74', opacity: 0.55, filter: url('soft8'), transform: 'translate(10 16)' }, island)
      el('path', { d: smooth(LOW), fill: url('wallGrad') }, island)
      el('path', { d: smooth(LOW), fill: url('stones') }, island)
      el('path', { d: smooth(LOW.map(([x, y]) => [x, y - 6])), fill: 'none', stroke: '#a7976a', 'stroke-width': 7, opacity: 0.45 }, island)
      el('path', { d: smooth(blob(0, 0, R + 6, 0.035, 20, 5, -52)), fill: 'none', stroke: '#f2faf5', 'stroke-width': 2, 'stroke-dasharray': '30 22 8 22', opacity: 0.7, class: 'pws-foam' }, island)
      el('path', { d: smooth(TOP), fill: C.grass }, island)
      el('clipPath', { id: u + 'islandClip' }, island).append(el('path', { d: smooth(TOP) }))
      const wallText = el('text', { x: 436, y: 652, 'text-anchor': 'middle', 'font-size': 17, fill: '#9c875b', 'letter-spacing': 6, opacity: 0.85, class: 'pws-wall' }, island)
      wallText.textContent = t('house')
      const ground = el('g', { 'clip-path': url('islandClip') }, groundLayer)
      el('ellipse', { cx: 330, cy: 250, rx: 260, ry: 110, fill: C.grassLight, opacity: 0.7, filter: url('soft') }, ground)
      el('ellipse', { cx: 720, cy: 470, rx: 160, ry: 90, fill: C.grassDark, opacity: 0.55, filter: url('soft') }, ground)
      el('ellipse', { cx: 180, cy: 520, rx: 140, ry: 70, fill: C.grassDark, opacity: 0.4, filter: url('soft') }, ground)
      el('path', { d: smooth(TOP), fill: 'none', stroke: C.rim, 'stroke-width': 5, opacity: 0.7 }, ground)
      for (const pts of Object.values(PATHS)) el('path', { d: smooth(pts, false), fill: 'none', stroke: C.pathEdge, 'stroke-width': 17, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'translate(0 1.5)' }, ground)
      for (const pts of Object.values(PATHS)) el('path', { d: smooth(pts, false), fill: 'none', stroke: C.path, 'stroke-width': 15, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ground)

      // ---------- pond with mirrored trees
      {
        const PC = [390, 525]
        const POND = [[187, 483], [242, 452], [339, 444], [420, 464], [452, 496], [492, 512], [565, 525], [589, 557], [569, 589], [484, 605], [363, 607], [242, 599], [187, 565], [179, 516]]
          .map(([x, y]) => [lerp(PC[0], x, 0.86), lerp(PC[1], y, 0.86)])
        const d = smooth(POND)
        el('path', { d, fill: 'none', stroke: C.pondEdge, 'stroke-width': 7, opacity: 0.6 }, ground)
        el('clipPath', { id: u + 'pondClip' }, ground).append(el('path', { d }))
        el('path', { d, fill: C.pond }, ground)
        const g = el('g', { 'clip-path': url('pondClip') }, ground)
        el('ellipse', { cx: 360, cy: 470, rx: 200, ry: 26, fill: C.pondLight, opacity: 0.8 }, g)
        for (const [x, y, h, w] of [[300, 456, 120, 18], [326, 452, 150, 20], [454, 490, 90, 16], [540, 512, 60, 14]]) {
          el('path', { d: `M${x - w / 2} ${y} C ${x - w * 0.6} ${y + h * 0.3} ${x - w * 0.2} ${y + h * 0.8} ${x} ${y + h} C ${x + w * 0.2} ${y + h * 0.8} ${x + w * 0.6} ${y + h * 0.3} ${x + w / 2} ${y} Z`, fill: C.reflect, opacity: 0.55, class: 'pws-shimmer', style: '--d:3.4s' }, g)
        }
        el('path', { d: smooth(sblob(462, 512, 34, 16, 0.3, 9, 3)), fill: C.reflect, opacity: 0.4, class: 'pws-shimmer', style: '--d:4.1s' }, g)
        const rand = rng(77)
        for (let i = 0; i < 12; i++) {
          const x = 200 + rand() * 360, y = 470 + rand() * 120, w = 10 + rand() * 30
          el('path', { d: `M${x} ${y} h ${w}`, stroke: '#f1faf6', 'stroke-width': 1.3, 'stroke-linecap': 'round', class: 'pws-glint', style: `--d:${(3 + rand() * 3).toFixed(1)}s; --delay:${(-rand() * 5).toFixed(1)}s` }, g)
        }
      }

      // ---------- trees and bushes
      const cypress = (x, y, h, w, seed) => {
        const rand = rng(seed)
        castShadow(x, y, h * 0.75, w)
        const tr = el('g', sway(rand, 3.6, 0.7), place(el('g', {}, objects), y))
        el('rect', { x: x - 2, y: y - 10, width: 4, height: 11, fill: C.trunk }, tr)
        const body = `M${x} ${y - h} C ${x + w * 0.5} ${y - h * 0.7} ${x + w * 0.62} ${y - h * 0.22} ${x + w * 0.3} ${y - 6} Q ${x} ${y - 1} ${x - w * 0.3} ${y - 6} C ${x - w * 0.62} ${y - h * 0.22} ${x - w * 0.5} ${y - h * 0.7} ${x} ${y - h} Z`
        el('path', { d: body, fill: C.cypress }, tr)
        el('path', { d: `M${x} ${y - h} C ${x - w * 0.5} ${y - h * 0.7} ${x - w * 0.6} ${y - h * 0.25} ${x - w * 0.3} ${y - 6} C ${x - w * 0.1} ${y - h * 0.3} ${x - w * 0.15} ${y - h * 0.7} ${x} ${y - h} Z`, fill: C.cypressLight }, tr)
        el('path', { d: `M${x + w * 0.05} ${y - h * 0.9} C ${x + w * 0.45} ${y - h * 0.6} ${x + w * 0.55} ${y - h * 0.25} ${x + w * 0.3} ${y - 6} L ${x + w * 0.12} ${y - 8} C ${x + w * 0.25} ${y - h * 0.4} ${x + w * 0.2} ${y - h * 0.7} ${x + w * 0.05} ${y - h * 0.9} Z`, fill: C.cypressDark, opacity: 0.8 }, tr)
        el('clipPath', { id: u + 'cy' + seed }, tr).append(el('path', { d: body }))
        leafMarks(el('g', { 'clip-path': url('cy' + seed) }, tr), x - w * 0.15, y - h * 0.5, w * 0.35, h * 0.45, Math.round(h / 5), seed * 7, [{ c: '#5c9a55', o: 0.5 }, { c: '#1f4a2e', o: 0.45 }], 0.9)
      }
      const roundTree = (x, y, h, r, seed) => {
        const rand = rng(seed)
        el('ellipse', { cx: x + r * 0.9, cy: y - 4, rx: r * 1.15, ry: r * 0.32, fill: SHADOW, opacity: 0.32 }, shadows)
        const tr = el('g', sway(rand, 4.2, 0.5), place(el('g', {}, objects), y))
        const cy = y - h
        el('path', { d: `M${x - 4} ${y} C ${x - 3} ${y - h * 0.4} ${x - 6} ${cy + r * 0.3} ${x - r * 0.35} ${cy + r * 0.1} L ${x - r * 0.3} ${cy} C ${x - 2} ${cy + r * 0.3} ${x + 1} ${cy + r * 0.2} ${x + r * 0.3} ${cy - r * 0.05} L ${x + r * 0.34} ${cy + r * 0.06} C ${x + 6} ${cy + r * 0.35} ${x + 4} ${y - h * 0.4} ${x + 5} ${y} Z`, fill: C.trunk }, tr)
        const puffs = []
        for (let i = 0; i < 11; i++) {
          const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r * 0.62
          puffs.push([x + Math.cos(a) * d * 1.15, cy + Math.sin(a) * d * 0.75 - r * 0.08, r * (0.36 + rand() * 0.18)])
        }
        puffs.sort((a, b) => a[1] - b[1])
        for (const [px, py, pr] of puffs) el('circle', { cx: px + pr * 0.15, cy: py + pr * 0.2, r: pr, fill: C.crownDark }, tr)
        for (const [px, py, pr] of puffs) el('circle', { cx: px, cy: py, r: pr * 0.92, fill: C.crown }, tr)
        for (const [px, py, pr] of puffs) if (py < cy) el('circle', { cx: px - pr * 0.2, cy: py - pr * 0.25, r: pr * 0.55, fill: C.crownLight, opacity: 0.9 }, tr)
        leafMarks(tr, x - r * 0.2, cy - r * 0.25, r * 0.6, r * 0.4, Math.round(r * 0.9), seed * 3, [{ c: '#c3dc7a', o: 0.7 }, { c: '#b2d26a', o: 0.6 }])
        leafMarks(tr, x + r * 0.15, cy + r * 0.25, r * 0.75, r * 0.3, Math.round(r * 0.7), seed * 5, [{ c: '#3f7434', o: 0.55 }, { c: '#5b9443', o: 0.6 }])
      }
      const bush = (x, y, r, seed) => {
        el('ellipse', { cx: x + r * 0.7, cy: y - 1, rx: r * 1.1, ry: r * 0.35, fill: SHADOW, opacity: 0.3 }, shadows)
        const g = place(el('g', {}, objects), y)
        el('path', { d: smooth(sblob(x, y - r * 0.55, r * 1.05, r * 0.68, 0.18, 9, seed)), fill: C.bush }, g)
        el('path', { d: smooth(sblob(x - r * 0.25, y - r * 0.78, r * 0.6, r * 0.38, 0.2, 8, seed + 1)), fill: C.bushLight, opacity: 0.85 }, g)
        leafMarks(g, x - r * 0.1, y - r * 0.6, r * 0.75, r * 0.45, Math.round(r * 1.2), seed * 11, [{ c: '#a5c965', o: 0.6 }, { c: '#3f7434', o: 0.45 }], 0.8)
      }

      // ---------- cottage: your chat window lives behind its door
      const house = (sx, sy, dx, dy, h, rise) => {
        const [x1, y1] = planAt(sx, sy), x0 = x1 - dx, y0 = y1 - dy, xm = (x0 + x1) / 2, o = 7
        const s = (x, y, z) => { const [px, py] = P(x, y); return [px + z * SH[0] * 0.9, py + z * SH[1] * 0.9] }
        el('path', { d: poly([P(x1, y1), P(x1, y0), s(x1, y0, h), s(xm, y0, h + rise), s(xm, y1, h + rise), s(x1, y1, h)]), fill: SHADOW, opacity: 0.32 }, shadows)
        const g = place(el('g', {}, objects), sy)
        const cx = lerp(x0, xm, 0.45), cy = y0 + dy * 0.2
        el('path', { d: poly([P(cx, cy, h + rise * 0.4), P(cx + 10, cy, h + rise * 0.4), P(cx + 10, cy, h + rise + 22), P(cx, cy, h + rise + 22)]), fill: C.houseShade }, g)
        el('path', { d: poly([P(cx + 10, cy, h + rise * 0.4), P(cx + 10, cy + 10, h + rise * 0.4), P(cx + 10, cy + 10, h + rise + 22), P(cx + 10, cy, h + rise + 22)]), fill: C.houseWall }, g)
        el('path', { d: poly([P(cx - 1, cy - 1, h + rise + 22), P(cx + 11, cy - 1, h + rise + 22), P(cx + 11, cy + 11, h + rise + 22), P(cx - 1, cy + 11, h + rise + 22)]), fill: C.roofDark }, g)
        el('path', { d: poly([P(x0, y1), P(x1, y1), P(x1, y1, h), P(xm, y1, h + rise), P(x0, y1, h)]), fill: C.houseWall }, g)
        el('path', { d: poly([P(x1, y0), P(x1, y1), P(x1, y1, h), P(x1, y0, h)]), fill: C.houseShade }, g)
        el('path', { d: poly([P(x0, y1), P(x1, y1), P(x1, y1, 7), P(x0, y1, 7)]), fill: '#d9d1bd', opacity: 0.6 }, g)
        el('path', { d: poly([P(x0 - o, y0 - o, h - 5), P(xm, y0 - o, h + rise), P(xm, y1 + o, h + rise), P(x0 - o, y1 + o, h - 5)]), fill: C.roofDark }, g)
        el('path', { d: poly([P(xm, y0 - o, h + rise), P(x1 + o, y0 - o, h - 5), P(x1 + o, y1 + o, h - 5), P(xm, y1 + o, h + rise)]), fill: C.roof }, g)
        for (let i = 1; i < 12; i++) {
          const y = lerp(y0 - o, y1 + o, i / 12)
          el('path', { d: 'M' + P(xm, y, h + rise).join(' ') + 'L' + P(x1 + o, y, h - 5).join(' '), stroke: C.roofDark, 'stroke-width': 0.9, opacity: 0.55 }, g)
        }
        for (let i = 1; i < 5; i++) {
          const k = i / 5
          el('path', { d: 'M' + P(lerp(xm, x1 + o, k), y0 - o, lerp(h + rise, h - 5, k)).join(' ') + 'L' + P(lerp(xm, x1 + o, k), y1 + o, lerp(h + rise, h - 5, k)).join(' '), stroke: '#e79a62', 'stroke-width': 0.8, opacity: 0.5 }, g)
        }
        el('path', { d: 'M' + P(x0 - o, y1 + o, h - 5).join(' ') + 'L' + P(xm, y1 + o, h + rise).join(' ') + 'L' + P(x1 + o, y1 + o, h - 5).join(' '), stroke: '#efd8c0', 'stroke-width': 2, fill: 'none', 'stroke-linejoin': 'round' }, g)
        const dy0 = y1 - dy * 0.42, dy1 = dy0 + 18
        const doorPoly = poly([P(x1, dy0, 0), P(x1, dy1, 0), P(x1, dy1, h * 0.62), P(x1, dy0, h * 0.62)])
        el('path', { d: doorPoly, fill: C.door }, g)
        const doorGlow = el('path', { d: doorPoly, fill: '#ffe9a8', opacity: 0 }, g)
        el('path', { d: 'M' + P(x1, (dy0 + dy1) / 2, 0).join(' ') + 'L' + P(x1, (dy0 + dy1) / 2, h * 0.62).join(' '), stroke: '#5f4026', 'stroke-width': 0.8 }, g)
        const win = (ya, yb, za, zb) => {
          el('path', { d: poly([P(x1, ya, za), P(x1, yb, za), P(x1, yb, zb), P(x1, ya, zb)]), fill: C.glass, stroke: '#ffffff', 'stroke-width': 1.6 }, g)
          el('path', { d: 'M' + P(x1, (ya + yb) / 2, za).join(' ') + 'L' + P(x1, (ya + yb) / 2, zb).join(' ') + 'M' + P(x1, ya, (za + zb) / 2).join(' ') + 'L' + P(x1, yb, (za + zb) / 2).join(' '), stroke: '#ffffff', 'stroke-width': 1 }, g)
        }
        win(y0 + dy * 0.18, y0 + dy * 0.36, h * 0.34, h * 0.68)
        el('path', { d: poly([P(x0 + dx * 0.36, y1, h * 0.36), P(x0 + dx * 0.64, y1, h * 0.36), P(x0 + dx * 0.64, y1, h * 0.66), P(x0 + dx * 0.36, y1, h * 0.66)]), fill: C.glass, stroke: '#ffffff', 'stroke-width': 1.6 }, g)
        const door = P(x1, (dy0 + dy1) / 2, 0)
        return { door: [door[0] + 16, door[1] + 8], doorTop: [door[0], door[1] - 40], glow: doorGlow, g }
      }
      // ---------- windmill = runs commands
      const windmill = (x, y) => {
        const H = 112, B = 30, T = 17
        el('path', { d: `M${x - B} ${y} L ${x + B} ${y} L ${x + B + H * 0.75} ${y - 8 - H * 0.15} L ${x + B + H * 0.6} ${y - H * 0.17} Z`, fill: SHADOW, opacity: 0.3 }, shadows)
        const g = place(el('g', { 'data-station': 'shell' }, objects), y)
        el('path', { d: `M${x - B} ${y} L ${x - T} ${y - H} L ${x + T} ${y - H} L ${x + B} ${y} Z`, fill: C.wood }, g)
        el('path', { d: `M${x + 6} ${y} L ${x + 4} ${y - H} L ${x + T} ${y - H} L ${x + B} ${y} Z`, fill: C.woodDark }, g)
        el('path', { d: `M${x - B} ${y} L ${x - T} ${y - H} L ${x + T} ${y - H} L ${x + B} ${y} Z`, fill: url('planks') }, g)
        for (const k of [0.33, 0.66]) el('path', { d: `M${lerp(x - B, x - T, k)} ${y - H * k} L ${lerp(x + B, x + T, k)} ${y - H * k}`, stroke: '#8a5a2c', 'stroke-width': 1.2, opacity: 0.6 }, g)
        el('path', { d: `M${x - 7} ${y} L ${x - 7} ${y - 22} Q ${x} ${y - 28} ${x + 7} ${y - 22} L ${x + 7} ${y} Z`, fill: '#6e4a2a' }, g)
        el('rect', { x: x - 4, y: y - 70, width: 8, height: 10, rx: 1.5, fill: '#5d3f24' }, g)
        el('path', { d: `M${x - T - 5} ${y - H + 2} Q ${x - 4} ${y - H - 32} ${x + 2} ${y - H - 34} Q ${x + 8} ${y - H - 30} ${x + T + 5} ${y - H + 2} Z`, fill: '#a66f3c' }, g)
        el('path', { d: `M${x + 2} ${y - H - 34} Q ${x + 8} ${y - H - 30} ${x + T + 5} ${y - H + 2} L ${x + 4} ${y - H + 2} Z`, fill: '#8c5a2e' }, g)
        const hub = [x - 6, y - H - 4]
        const tilt = el('g', { transform: `translate(${hub[0]} ${hub[1]}) matrix(0.82 0.22 0 1 0 0)` }, g)
        const sails = el('g', { class: 'pws-sails', style: '--spin: 10s' }, tilt)
        el('circle', { r: 76, fill: 'none' }, sails)
        for (let i = 0; i < 4; i++) {
          const s = el('g', { transform: `rotate(${i * 90 + 30})` }, sails)
          el('rect', { x: -1.5, y: -74, width: 3, height: 74, fill: '#7a5532' }, s)
          el('rect', { x: 1.5, y: -72, width: 17, height: 54, fill: C.sail, stroke: '#cdbb92', 'stroke-width': 1 }, s)
          for (let k = 1; k < 6; k++) el('line', { x1: 1.5, y1: -72 + k * 9, x2: 18.5, y2: -72 + k * 9, stroke: '#cdbb92', 'stroke-width': 0.7 }, s)
          el('line', { x1: 10, y1: -72, x2: 10, y2: -18, stroke: '#cdbb92', 'stroke-width': 0.7 }, s)
        }
        el('circle', { cx: hub[0], cy: hub[1], r: 4, fill: '#5b3f28' }, g)
        return { sails, top: [x, y - H - 30], g }
      }
      // ---------- wooden sign (folder names, the shed's app, the islet's service)
      const makeSign = (parent, x, y, post = 16) => {
        const g = el('g', { class: 'pws-signpost' }, parent)
        el('rect', { x: x - 1.2, y: y - post, width: 2.4, height: post, fill: C.post }, g)
        const box = el('rect', { x: x - 24, y: y - post - 18, width: 48, height: 19, rx: 4, fill: '#f6ecd2', stroke: '#b08a56', 'stroke-width': 1, class: 'pws-signbox' }, g)
        const text = el('text', { x, y: y - post - 4, 'text-anchor': 'middle', 'font-size': 14, fill: '#5b3f28' }, g)
        const tip = el('title', {}, g)
        const set = (value, title) => {
          const shown = clipText(value, 12)
          text.textContent = shown
          const w = Math.max(30, textWidth(shown, 14) + 14)
          box.setAttribute('x', x - w / 2)
          box.setAttribute('width', w)
          tip.textContent = title || value
        }
        return { g, set, box }
      }
      // ---------- flower bed = a folder
      const flowerBed = (spec, index) => {
        const { cx, cy, rx, ry, color, light } = spec
        const seed = 31 + index
        const g = place(el('g', { style: 'display:none' }, objects), cy - ry * 0.4)
        const body = el('g', {}, g)
        el('ellipse', { cx: cx + 10, cy: cy + 5, rx: rx * 1.05, ry, fill: SHADOW, opacity: 0.3 }, body)
        el('ellipse', { cx, cy: cy + 5, rx, ry, fill: C.leafDark }, body)
        el('ellipse', { cx, cy, rx, ry, fill: C.leaf }, body)
        el('path', { d: `M${cx - rx} ${cy} Q ${cx} ${cy + ry * 1.9} ${cx + rx} ${cy} Q ${cx} ${cy + ry * 1.05} ${cx - rx} ${cy} Z`, fill: C.leafDark, opacity: 0.55 }, body)
        leafMarks(body, cx, cy, rx * 0.9, ry * 0.85, Math.round(rx * 0.8), seed * 13, [{ c: '#86ad4c', o: 0.8 }, { c: '#3f6424', o: 0.6 }], 1.1)
        const rand = rng(seed), heads = []
        for (let i = 0; i < 600 && heads.length < Math.round(rx * ry / 5.5); i++) {
          const a = rand() * 2 - 1, b = rand() * 2 - 1
          if (a * a + b * b > 0.86) continue
          heads.push([cx + a * rx, cy + b * ry - (1 - a * a - b * b) * 9, a, b])
        }
        heads.sort((a, b) => a[1] - b[1])
        for (const [hx, hy, a, b] of heads) {
          const r = 1.8 + rand() * 1.1
          el('circle', { cx: hx + 0.9, cy: hy + 1.3, r: r + 0.8, fill: '#3f6424', opacity: 0.55 }, body)
          const lit = -a * 0.5 - b * 0.7
          el('circle', { cx: hx, cy: hy, r, fill: lit > 0.25 || rand() < 0.2 ? light : color }, body)
          if (lit < -0.3) el('circle', { cx: hx, cy: hy, r, fill: '#7a4a2a', opacity: Math.min(0.35, (-lit - 0.3) * 0.6).toFixed(2) }, body)
          if (rand() > 0.55) el('circle', { cx: hx - r * 0.3, cy: hy - r * 0.3, r: r * 0.35, fill: '#fffaf0', opacity: 0.8 }, body)
        }
        el('ellipse', { cx: cx - rx * 0.3, cy: cy - ry * 0.45, rx: rx * 0.45, ry: ry * 0.3, fill: '#fff8e0', opacity: 0.18, filter: url('soft3') }, body)
        const buds = []
        for (let i = 0; i < 6; i++) {
          const a = -2.6 + i * 0.5, bx = cx + Math.cos(a) * rx * 0.98, by = cy + Math.sin(a) * ry * 0.98 + 6
          const f = el('g', { transform: `translate(${bx.toFixed(1)} ${by.toFixed(1)}) scale(0)` }, body)
          el('path', { d: 'M0 0 q 1 -6 0 -11', stroke: C.leafDark, 'stroke-width': 1.3, fill: 'none' }, f)
          el('ellipse', { cx: -3, cy: -5, rx: 3, ry: 1.4, fill: C.leaf, transform: 'rotate(-30 -3 -5)' }, f)
          for (let k = 0; k < 5; k++) el('ellipse', { cx: Math.cos(k * 1.257) * 2.6, cy: -12 + Math.sin(k * 1.257) * 2.6, rx: 2.2, ry: 1.6, fill: color === '#f4efe2' ? C.yellow : color, transform: `rotate(${k * 72} ${Math.cos(k * 1.257) * 2.6} ${-12 + Math.sin(k * 1.257) * 2.6})` }, f)
          el('circle', { cx: 0, cy: -12, r: 1.4, fill: '#e3a33b' }, f)
          buds.push({ node: f, x: bx, y: by, grown: false })
        }
        // the sign stands behind the bed so the dog never covers it
        const signLayer = place(el('g', { style: 'display:none' }, objects), cy - ry * 0.5 - 1)
        const sign = makeSign(signLayer, cx + rx * (spec.signSide ?? -0.45), cy - ry * 0.55, 18)
        const count = el('text', { x: cx, y: cy + ry + 17, 'text-anchor': 'middle', 'font-size': 13, class: 'pws-count' }, g)
        const bed = {
          g, body, buds, cx, cy, rx, ry, sign, count, signLayer,
          spot: { x: cx - rx - 8, y: cy + 4, face: 1 },
          show(on) { g.style.display = on ? '' : 'none'; signLayer.style.display = on ? '' : 'none' },
          setBuds(n) {
            buds.forEach((bud, i) => {
              bud.grown = i < n
              bud.node.setAttribute('transform', `translate(${bud.x.toFixed(1)} ${bud.y.toFixed(1)}) scale(${i < n ? 1.6 : 0})`)
            })
          },
        }
        return bed
      }
      // ---------- pier + rowboat
      const pier = (S, E, half) => {
        const ax = E[0] - S[0], ay = E[1] - S[1]
        const c = (k, s, dz = 0) => [S[0] + ax * k + half[0] * s, S[1] + ay * k + half[1] * s + dz]
        const g = place(el('g', {}, objects), S[1] - 14)
        el('path', { d: poly([c(0.05, -1, 18), c(1, -1, 18), c(1, 1, 22), c(0.05, 1, 22)]), fill: '#2e7a70', opacity: 0.45 }, g)
        for (const k of [0.42, 0.72, 1]) for (const s of [-0.9, 0.9]) {
          const p = c(k, s)
          el('rect', { x: p[0] - 2.5, y: p[1] - 2, width: 5, height: 34, fill: C.post }, g)
          el('path', { d: `M${p[0] - 6} ${p[1] + 32} q 6 -3 12 0`, stroke: '#e6f4ee', 'stroke-width': 1.2, fill: 'none', opacity: 0.8 }, g)
        }
        el('path', { d: poly([c(0, 1), c(1, 1), c(1, 1, 5), c(0, 1, 5)]), fill: C.pierDark }, g)
        el('path', { d: poly([c(1, -1), c(1, 1), c(1, 1, 5), c(1, -1, 5)]), fill: '#8f6a3d' }, g)
        el('path', { d: poly([c(0, -1), c(1, -1), c(1, 1), c(0, 1)]), fill: C.pier }, g)
        for (let i = 1; i < 16; i++) el('path', { d: 'M' + c(i / 16, -1).join(' ') + 'L' + c(i / 16, 1).join(' '), stroke: C.pierDark, 'stroke-width': 0.9, opacity: 0.6 }, g)
        const post = c(0.72, 0.9)
        el('rect', { x: post[0] - 2.5, y: post[1] - 12, width: 5, height: 12, fill: C.post }, g)
        const bx = 672, by = 662
        const boat = el('g', { class: 'pws-sway', style: '--d:3.2s; --a:2deg' }, place(el('g', {}, objects), by))
        el('ellipse', { cx: bx + 8, cy: by + 12, rx: 60, ry: 10, fill: '#2e7a70', opacity: 0.4 }, boat)
        el('path', { d: `M${bx - 58} ${by - 14} Q ${bx} ${by - 30} ${bx + 56} ${by - 22} Q ${bx + 50} ${by + 6} ${bx - 4} ${by + 12} Q ${bx - 48} ${by + 8} ${bx - 58} ${by - 14} Z`, fill: '#f6f3ea' }, boat)
        el('path', { d: `M${bx - 52} ${by - 14} Q ${bx} ${by - 26} ${bx + 50} ${by - 20} Q ${bx + 44} ${by} ${bx - 4} ${by + 4} Q ${bx - 44} ${by + 2} ${bx - 52} ${by - 14} Z`, fill: '#d9d3c2' }, boat)
        for (const k of [-26, 2, 28]) el('path', { d: `M${bx + k - 2} ${by - 20} L ${bx + k + 6} ${by + 2}`, stroke: '#b98a52', 'stroke-width': 5, 'stroke-linecap': 'round' }, boat)
        el('path', { d: `M${bx + 56} ${by - 22} Q ${(bx + 56 + post[0]) / 2} ${by - 4} ${post[0]} ${post[1] - 6}`, stroke: '#d9c9a0', 'stroke-width': 1.2, fill: 'none' }, g)
        return { start: c(0.05, 0), end: c(0.9, 0) }
      }
      // ---------- compost heap = memory compaction
      const compost = (x, y) => {
        el('ellipse', { cx: x + 16, cy: y - 2, rx: 34, ry: 8, fill: SHADOW, opacity: 0.3 }, shadows)
        const g = place(el('g', {}, objects), y)
        el('path', { d: `M${x - 30} ${y} Q ${x - 22} ${y - 26} ${x} ${y - 28} Q ${x + 22} ${y - 26} ${x + 30} ${y} Z`, fill: '#7a5a3a' }, g)
        const rand = rng(8)
        for (let i = 0; i < 26; i++) {
          const a = rand() * 2 - 1, hx = x + a * 24, hy = y - 3 - rand() * (24 * (1 - a * a))
          el('ellipse', { cx: hx, cy: hy, rx: 3.6, ry: 1.8, fill: ['#a3b04a', '#c99a3f', '#6f8a35', '#9c6b3c'][i % 4], transform: `rotate(${(rand() * 180).toFixed(0)} ${hx.toFixed(1)} ${hy.toFixed(1)})` }, g)
        }
        for (const [dx, dl] of [[-6, 0], [6, -1.6]]) el('path', { d: `M${x + dx} ${y - 34} q -5 -6 0 -12 q 5 -6 0 -12`, stroke: '#ffffff', 'stroke-width': 1.6, fill: 'none', opacity: 0.8, 'stroke-linecap': 'round', class: 'pws-steam', style: `--delay:${dl}s` }, g)
        return { top: [x, y - 30] }
      }
      // ---------- notice board = the plan
      const board = (x, y) => {
        el('ellipse', { cx: x + 14, cy: y - 2, rx: 22, ry: 5, fill: SHADOW, opacity: 0.3 }, shadows)
        const g = place(el('g', {}, objects), y)
        for (const px of [x - 15, x + 15]) el('rect', { x: px - 1.5, y: y - 38, width: 3, height: 38, fill: C.post }, g)
        const box = el('rect', { x: x - 22, y: y - 44, width: 44, height: 28, rx: 2, fill: '#c99a5e', stroke: '#8a5a2c', 'stroke-width': 1, class: 'pws-signbox' }, g)
        const lines = []
        for (let i = 0; i < 4; i++) lines.push(el('rect', { x: x - 16, y: y - 39 + i * 6, width: 0, height: 3, rx: 1, fill: '#fbf5e4' }, g))
        el('path', { d: `M${x - 25} ${y - 44} L ${x} ${y - 52} L ${x + 25} ${y - 44} Z`, fill: '#a66f3c' }, g)
        return { g, box, lines }
      }
      // ---------- tool shed + vine = an app on this computer and its connector
      const shed = (sx, sy) => {
        const [x1, y1] = planAt(sx, sy), dx = 34, dy = 42, h = 30, x0 = x1 - dx, y0 = y1 - dy
        el('ellipse', { cx: sx + 30, cy: sy - 14, rx: 36, ry: 10, fill: SHADOW, opacity: 0.3 }, shadows)
        const g = place(el('g', {}, objects), sy)
        el('path', { d: poly([P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h + 12)]), fill: '#d39b5c' }, g)
        el('path', { d: poly([P(x1, y0), P(x1, y1), P(x1, y1, h), P(x1, y0, h)]), fill: '#b07a43' }, g)
        for (let i = 1; i < 6; i++) {
          const k = i / 6
          el('path', { d: 'M' + P(lerp(x0, x1, k), y1, 0).join(' ') + 'L' + P(lerp(x0, x1, k), y1, lerp(h + 12, h, k)).join(' '), stroke: '#8a5a2c', 'stroke-width': 0.8, opacity: 0.5 }, g)
          el('path', { d: 'M' + P(x1, lerp(y0, y1, k), 0).join(' ') + 'L' + P(x1, lerp(y0, y1, k), h).join(' '), stroke: '#7a4e26', 'stroke-width': 0.8, opacity: 0.45 }, g)
        }
        const ya = y0 + dy * 0.3, yb = ya + 15
        const doorPoly = poly([P(x1, ya, 0), P(x1, yb, 0), P(x1, yb, 23), P(x1, ya, 23)])
        el('path', { d: doorPoly, fill: '#6e4a2a' }, g)
        const glow = el('path', { d: doorPoly, fill: '#ffe9a8', opacity: 0 }, g)
        const [wx, wy] = P(x1, y0 + dy * 0.78, 19)
        el('circle', { cx: wx, cy: wy, r: 5, fill: '#efe2bf', stroke: '#8a5a2c', 'stroke-width': 0.8 }, g)
        el('path', { d: `M${wx - 2.6} ${wy + 2.6} L ${wx + 1.6} ${wy - 1.6} m -1.2 -1.6 a 2 2 0 1 0 2.8 2.8`, stroke: '#6e4a2a', 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' }, g)
        el('path', { d: poly([P(x0 - 4, y1 + 5, h + 14), P(x1 + 5, y1 + 5, h - 1), P(x1 + 5, y1 + 5, h - 4), P(x0 - 4, y1 + 5, h + 11)]), fill: '#5f7a48' }, g)
        el('path', { d: poly([P(x0 - 4, y0 - 4, h + 14), P(x1 + 5, y0 - 4, h - 1), P(x1 + 5, y1 + 5, h - 1), P(x0 - 4, y1 + 5, h + 14)]), fill: '#7f9a63' }, g)
        leafMarks(g, ...P((x0 + x1) / 2, (y0 + y1) / 2, h + 8), 20, 8, 16, 61, [{ c: '#a5c06f', o: 0.7 }, { c: '#4d6a39', o: 0.5 }])
        const door = P(x1, (ya + yb) / 2, 0)
        const signLayer = place(el('g', {}, objects), sy + 1)
        const sign = makeSign(signLayer, sx - 34, sy + 6, 14)
        sign.set(t('localApp'))
        return { glow, sign, spot: { x: door[0] + 24, y: door[1] + 10, face: -1 }, doorTop: [door[0], door[1] - 16] }
      }
      const vine = (pts) => {
        const g = el('g', {}, groundLayer)
        const path = el('path', { d: smooth(pts, false), stroke: '#4d7a2a', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' }, g)
        const len = path.getTotalLength(), rand = rng(44)
        for (let s = 6, i = 0; s < len; s += 8 + rand() * 5, i++) {
          const p = path.getPointAtLength(s), q = path.getPointAtLength(Math.min(len, s + 1))
          const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + (i % 2 ? 60 : -60)
          el('ellipse', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), rx: 3.6, ry: 1.7, fill: i % 3 ? '#6e9c3e' : '#8bb354', transform: `rotate(${ang.toFixed(0)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}) translate(2.8 0)` }, g)
          if (i % 4 === 2) el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 1.7, fill: '#f6e3a0' }, g)
        }
        return { path, len, g }
      }
      // ---------- far islet = a cloud service
      const islet = (x, y) => {
        const g = el('g', { class: 'pws-bob' }, sea)
        el('ellipse', { cx: x + 8, cy: y + 24, rx: 58, ry: 16, fill: '#2f7d74', opacity: 0.5, filter: url('soft8') }, g)
        el('ellipse', { cx: x, cy: y + 15, rx: 51, ry: 28, fill: 'none', stroke: '#f2faf5', 'stroke-width': 1.4, 'stroke-dasharray': '14 10', opacity: 0.7, class: 'pws-foam' }, g)
        el('ellipse', { cx: x, cy: y + 12, rx: 46, ry: 25, fill: url('wallGrad') }, g)
        el('ellipse', { cx: x, cy: y, rx: 46, ry: 25, fill: C.grass }, g)
        el('ellipse', { cx: x - 10, cy: y - 6, rx: 26, ry: 12, fill: C.grassLight, opacity: 0.7, filter: url('soft3') }, g)
        el('rect', { x: x - 24, y: y - 12, width: 3, height: 14, fill: C.trunk }, g)
        for (const [px, py, r, col] of [[-27, -18, 8, C.crownDark], [-18, -20, 8, C.crownDark], [-24, -24, 9, C.crown], [-28, -18, 6, C.crown], [-18, -20, 6.5, C.crown], [-26, -27, 4.5, C.crownLight]]) el('circle', { cx: x + px, cy: y + py, r, fill: col }, g)
        el('path', { d: `M${x + 22} ${y - 14} L ${x + 31} ${y - 18} L ${x + 31} ${y - 1} L ${x + 22} ${y + 4} Z`, fill: C.houseShade }, g)
        el('rect', { x: x + 2, y: y - 14, width: 20, height: 18, fill: C.houseWall }, g)
        el('path', { d: `M${x} ${y - 13} L ${x + 12} ${y - 26} L ${x + 24} ${y - 13} Z`, fill: '#5f8fb0' }, g)
        el('path', { d: `M${x + 12} ${y - 26} L ${x + 21} ${y - 30} L ${x + 33} ${y - 17} L ${x + 24} ${y - 13} Z`, fill: '#4b7898' }, g)
        el('rect', { x: x + 9, y: y - 6, width: 6, height: 10, fill: C.door }, g)
        el('path', { d: `M${x + 26} ${y - 22} L ${x + 26} ${y - 40}`, stroke: '#6b6f6a', 'stroke-width': 1.2 }, g)
        const light = el('circle', { cx: x + 26, cy: y - 41, r: 2.6, fill: '#ffd84d', opacity: 0.35 }, g)
        for (const [px, py, r] of [[34, -56, 10], [46, -60, 13], [60, -55, 9], [42, -50, 10], [54, -50, 10]]) el('circle', { cx: x + px, cy: y + py, r, fill: '#f7f4ec', opacity: 0.95 }, g)
        const sign = makeSign(g, x - 4, y + 42, 0)
        sign.set(t('zone.cloud'))
        label(sea, x + 80, y - 44, t('label.cloud'), 15, 'start').setAttribute('opacity', 0.85)
        return { light, sign, home: [x + 26, y - 50] }
      }
      // ---------- buoys = web places the mail boat visits
      const buoy = (x, y, index) => {
        const g = el('g', { style: 'display:none' }, sea)
        const bob = el('g', { class: 'pws-bob', style: `--delay:${-index * 1.3}s` }, g)
        el('ellipse', { cx: x, cy: y + 6, rx: 13, ry: 4, fill: '#2e7a70', opacity: 0.5 }, bob)
        el('path', { d: `M${x - 9} ${y + 4} Q ${x} ${y - 16} ${x + 9} ${y + 4} Z`, fill: '#f6f3ea' }, bob)
        el('path', { d: `M${x - 6} ${y - 4} L ${x + 6} ${y - 4} L ${x + 4.5} ${y - 9} L ${x - 4.5} ${y - 9} Z`, fill: C.roof }, bob)
        el('rect', { x: x - 1, y: y - 22, width: 2, height: 12, fill: '#6b6f6a' }, bob)
        const sign = makeSign(bob, x, y - 20, 0)
        return { g, sign, point: [x - 26, y + 4] }
      }
      // ---------- paper cards on the sea: the chat with you, and the plan
      const card = (x, y, w, h, title) => {
        const g = el('g', { class: 'pws-card', style: 'display:none' }, ui)
        el('rect', { x: x + 3, y: y + 4, width: w, height: h, rx: 10, fill: '#2f6b62', opacity: 0.35 }, g)
        el('rect', { x, y, width: w, height: h, rx: 10, fill: '#fbf6e9', stroke: '#c9b98f', 'stroke-width': 1.2 }, g)
        const head = el('text', { x: x + 14, y: y + 22, 'font-size': 14, 'font-weight': 700, fill: '#7a6a45' }, g)
        head.textContent = title
        return g
      }
      const chatCard = (() => {
        const x = 14, y = 676, w = 340, h = 112
        const g = card(x, y, w, h, t('chat'))
        const rows = [0, 1, 2].map((i) => {
          const row = el('g', { style: 'display:none' }, g)
          const tag = el('rect', { x: x + 12, y: y + 31 + i * 26, width: 34, height: 20, rx: 6 }, row)
          const who = el('text', { x: x + 29, y: y + 45.5 + i * 26, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#ffffff' }, row)
          const text = el('text', { x: x + 54, y: y + 46.5 + i * 26, 'font-size': 15, fill: '#2c3a2e' }, row)
          return { row, tag, who, text }
        })
        const lines = []
        return {
          push(kind, value) {
            lines.push({ kind, value: clipText(value, 19) })
            while (lines.length > 3) lines.shift()
            g.style.display = ''
            rows.forEach((row, i) => {
              const line = lines[i]
              row.row.style.display = line ? '' : 'none'
              if (!line) return
              row.tag.setAttribute('fill', line.kind === 'me' ? '#4a8fc0' : '#e0974a')
              row.who.textContent = line.kind === 'me' ? t('you') : 'AI'
              row.text.textContent = line.value
            })
          },
        }
      })()
      const planCard = (() => {
        const x = 930, y = 22, w = 330, h = 176
        const g = card(x, y, w, h, t('board'))
        const rows = [0, 1, 2, 3, 4].map((i) => {
          const row = el('g', {}, g)
          const box = el('rect', { x: x + 14, y: y + 34 + i * 27, width: 14, height: 14, rx: 3, fill: 'none', stroke: '#9c875b', 'stroke-width': 1.4 }, row)
          const tick = el('path', { d: `M${x + 17} ${y + 41 + i * 27} l 3 4 l 6 -8`, stroke: '#5f8a35', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, row)
          const text = el('text', { x: x + 36, y: y + 46 + i * 27, 'font-size': 15, fill: '#2c3a2e' }, row)
          return { row, box, tick, text }
        })
        return {
          set(todos) {
            const list = (todos ?? []).slice(0, 5)
            g.style.display = list.length ? '' : 'none'
            rows.forEach((row, i) => {
              const todo = list[i]
              row.row.style.display = todo ? '' : 'none'
              if (!todo) return
              row.text.textContent = clipText(todo.content, 18)
              const done = todo.status === 'completed', now = todo.status === 'in_progress'
              row.tick.setAttribute('opacity', done ? 1 : 0)
              row.text.setAttribute('fill', done ? '#9a9483' : now ? '#c0392b' : '#2c3a2e')
              row.text.setAttribute('font-weight', now ? 700 : 400)
              row.text.setAttribute('text-decoration', done ? 'line-through' : 'none')
            })
          },
        }
      })()

      // ---------- build the island
      for (const [x, y, h, w, s] of [
        [137, 464, 250, 32, 1], [173, 428, 190, 28, 2], [355, 212, 150, 26, 3], [383, 214, 195, 28, 4],
        [549, 485, 165, 25, 5], [581, 488, 195, 27, 6], [750, 232, 135, 26, 7], [718, 238, 80, 20, 8], [96, 380, 120, 22, 9],
      ]) cypress(x, y, h, w, s)
      for (const [x, y, h, r, s] of [[245, 262, 92, 70, 21], [483, 205, 84, 64, 22], [790, 372, 92, 70, 23], [476, 480, 58, 44, 24]]) roundTree(x, y, h, r, s)
      for (const [x, y, r, s] of [[405, 418, 15, 2], [300, 600, 17, 5], [345, 606, 13, 6], [560, 585, 12, 7], [692, 252, 11, 8], [560, 214, 13, 9], [704, 326, 10, 10]]) bush(x, y, r, s)
      const HOUSE = house(290, 395, 75, 115, 74, 44)
      const MILL = windmill(638, 262)
      const beds = BEDS.map(flowerBed)
      const PIER = pier([660, 548], [846, 596], [14, -13])
      const COMPOST = compost(184, 392)
      const BOARD = board(515, 456)
      const SHED = shed(140, 530)
      const VINE = vine([[124, 503], [140, 478], [170, 462], [196, 440], [214, 418], [228, 398]])
      const ISLET = islet(118, 104)
      const buoys = BUOYS.map(([x, y], i) => buoy(x, y, i))
      label(sea, 1092, 786, t('label.net'), 15, 'middle').setAttribute('opacity', 0.85)
      const moreText = el('text', { x: 590, y: 716, 'text-anchor': 'middle', 'font-size': 14, class: 'pws-note' }, ui)
      const sleepText = el('text', { x: 620, y: 616, 'text-anchor': 'middle', 'font-size': 13, class: 'pws-note' }, ui)
      {
        const rand = rng(99)
        const inIsland = (x, y) => ((x - CX) / 380) ** 2 + ((y - CY) / 215) ** 2 < 1
        const inPond = (x, y) => ((x - 390) / 190) ** 2 + ((y - 525) / 75) ** 2 < 1
        for (let i = 0, n = 0; i < 600 && n < 110; i++) {
          const x = 50 + rand() * 780, y = 175 + rand() * 440
          if (!inIsland(x, y) || inPond(x, y)) continue
          n++
          const h = 4 + rand() * 5
          el('path', { d: `M${x - 2.5} ${y} q 0.5 ${-h * 0.6} -1.5 ${-h} M${x} ${y} q 0 ${-h * 0.7} 1 ${-h * 1.2} M${x + 2.5} ${y} q 0 ${-h * 0.5} 2 ${-h * 0.9}`, stroke: rand() > 0.5 ? C.grassDark : C.rim, 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round', class: 'pws-sway', style: `--d:${(1.8 + rand() * 1.4).toFixed(1)}s; --delay:${(-rand() * 3).toFixed(1)}s; --a:${(5 + rand() * 6).toFixed(0)}deg` }, tufts)
        }
      }
      for (const [delay, r] of [[0, 150], [-26, 110]]) {
        const g = el('g', { class: 'pws-cloudshade', style: `--delay:${delay}s` }, clouds)
        el('ellipse', { cx: 0, cy: 0, rx: r * 1.6, ry: r * 0.7, fill: '#2c5a4a', opacity: 0.13, filter: url('soft') }, g)
      }

      // ---------- walking: a small path graph + shortest route
      const NODES = [], EDGES = new Map()
      const nodeId = (p) => {
        const key = Math.round(p[0]) + ',' + Math.round(p[1])
        let i = NODES.findIndex((n) => n.key === key)
        if (i < 0) { NODES.push({ key, p }); i = NODES.length - 1; EDGES.set(i, []) }
        return i
      }
      const link = (a, b) => { const i = nodeId(a), j = nodeId(b); if (i !== j) { EDGES.get(i).push(j); EDGES.get(j).push(i) } }
      for (const pts of Object.values(PATHS)) for (let i = 1; i < pts.length; i++) link(pts[i - 1], pts[i])
      link(PATHS.A[PATHS.A.length - 1], PIER.start); link(PIER.start, PIER.end)
      const pathNodes = NODES.length
      const spot = (p, face) => {
        let best = 0, bd = Infinity
        for (let i = 0; i < pathNodes; i++) { const d = Math.hypot(NODES[i].p[0] - p[0], NODES[i].p[1] - p[1]); if (d < bd) { bd = d; best = i } }
        link(p, NODES[best].p)
        return { x: p[0], y: p[1], face }
      }
      link(HOUSE.door, PATHS.A[0])
      const spots = {
        door: { x: HOUSE.door[0], y: HOUSE.door[1], face: -1 },
        pier: { x: PIER.end[0], y: PIER.end[1], face: 1 },
        mill: spot([660, 284], -1),
        shed: spot([SHED.spot.x, SHED.spot.y], -1),
        compost: spot([222, 404], -1),
        board: spot([486, 440], 1),
        split: spot([566, 352], 1),
        wait: spot([590, 470], -1),
        desk: spot([408, 398], 1),
        cloud: spot([430, 290], -1),
        spawn: { x: 622, y: 322, face: -1 },
      }
      for (const bed of beds) spot([bed.spot.x, bed.spot.y], 1)
      for (const [x, y] of SLEEP) spot([x, y], 1)
      const route = (from, to) => {
        const near = (p) => { let best = 0, bd = Infinity; NODES.forEach((n, i) => { const d = Math.hypot(n.p[0] - p[0], n.p[1] - p[1]); if (d < bd) { bd = d; best = i } }); return best }
        const s = near(from), e = near(to)
        const dist = NODES.map(() => Infinity), prev = NODES.map(() => -1), done = NODES.map(() => false)
        dist[s] = 0
        for (;;) {
          let v = -1
          dist.forEach((d, i) => { if (!done[i] && d < Infinity && (v < 0 || d < dist[v])) v = i })
          if (v < 0 || v === e) break
          done[v] = true
          for (const w of EDGES.get(v)) {
            const nd = dist[v] + Math.hypot(NODES[v].p[0] - NODES[w].p[0], NODES[v].p[1] - NODES[w].p[1])
            if (nd < dist[w]) { dist[w] = nd; prev[w] = v }
          }
        }
        if (e !== s && prev[e] < 0) return [to]
        const out = []
        for (let v = e; v >= 0; v = prev[v]) { out.unshift(NODES[v].p); if (v === s) break }
        if (out.length > 1 && Math.hypot(out[1][0] - from[0], out[1][1] - from[1]) < Math.hypot(out[1][0] - out[0][0], out[1][1] - out[0][1])) out.shift()
        out.push(to)
        return out
      }

      // ---------- dogs (after the character sheet)
      let dogCount = 0
      const furSpecks = (parent, x0, y0, w, h, n, seed, c) => {
        const rand = rng(seed)
        for (let i = 0; i < n; i++) {
          const x = x0 + rand() * w, y = y0 + rand() * h, dark = rand() < 0.5
          el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.35 + rand() * 0.55).toFixed(2), fill: dark ? c.shade : c.light, opacity: dark ? 0.55 : 0.45 }, parent)
        }
      }
      const makeDog = (kind, scale, density) => {
        const n = ++dogCount
        const id = u + 'd' + n
        const c = COATS[kind]
        const root = place(el('g', { class: 'pws-dog', role: 'button', tabindex: 0 }, objects), 0)
        const title = el('title', {}, root)
        const ring = el('ellipse', { cx: 2, cy: 1, rx: 26, ry: 7, fill: 'none', stroke: '#ffcf3f', 'stroke-width': 3, opacity: 0 }, root)
        const shadow = el('ellipse', { cx: 2, cy: 0, rx: 20, ry: 4, fill: '#2f4d24', opacity: 0.3 }, root)
        const flip = el('g', {}, root)
        const breath = el('g', {}, flip)
        const furry = el('g', { filter: url('fuzz') }, breath)
        const legs = {}
        const leg = (name, x, col) => {
          const g = el('g', {}, furry)
          el('rect', { x: x - 3, y: -13, width: 6.4, height: 13.5, rx: 3, fill: col }, g)
          if (c.socks && col === c.coat) el('rect', { x: x - 3, y: -4, width: 6.4, height: 4.5, rx: 2.2, fill: c.light }, g)
          legs[name] = { g, x }
          return g
        }
        leg('bf', -8, c.shade); leg('ff', 12, c.shade)
        const haunch = el('ellipse', { cx: -8, cy: -7, rx: 10, ry: 7.5, fill: c.coat, opacity: 0 }, furry)
        const upper = el('g', {}, furry)
        const tail = el('g', {}, upper)
        if (c.tail === 'curl') {
          el('path', { d: 'M-13 -21 C -22 -24 -25 -35 -18 -39 C -11 -42 -7 -35 -12 -31', stroke: c.coat, 'stroke-width': 6.5, fill: 'none', 'stroke-linecap': 'round' }, tail)
          el('path', { d: 'M-16 -36 C -13 -38 -10 -36 -11 -33', stroke: c.light, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, tail)
        } else {
          el('path', { d: 'M-13 -20 C -20 -23 -24 -30 -22 -38', stroke: c.coat, 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, tail)
        }
        const BODY_D = 'M-16 -15 C -18 -27 -8 -31 3 -30 C 13 -29 19 -25 19 -16 C 19 -9 13 -6 3 -6 L -8 -6 C -14 -6 -16 -9 -16 -15 Z'
        el('path', { d: BODY_D, fill: c.coat }, upper)
        el('clipPath', { id: id + 'b' }, upper).append(el('path', { d: BODY_D }))
        const bodyFur = el('g', { 'clip-path': url('d' + n + 'b') }, upper)
        el('path', { d: 'M-16 -12 C -8 -6 10 -5 19 -12 L 19 -4 L -16 -4 Z', fill: c.shade, opacity: 0.35 }, bodyFur)
        furSpecks(bodyFur, -17, -31, 37, 26, Math.round(140 * density), n * 17, c)
        if (kind === 'shiba') el('path', { d: 'M-6 -9 C 0 -6 10 -6 16 -10 C 14 -6 8 -5 2 -5 C -2 -5 -5 -6 -6 -9 Z', fill: c.light }, upper)
        const sprouts = []
        const basket = el('g', {}, upper)
        for (const [sx, type, rot] of [[-8, 'leaf', -14], [-1, 'flower', 6], [-5, 'leaf', 18], [4, 'flower', -10], [-11, 'flower', 12], [1, 'leaf', -24]]) {
          const s = el('g', { transform: `translate(${sx} -41) rotate(${rot})`, opacity: 0 }, basket)
          el('path', { d: 'M0 0 q 1 -7 0 -13', stroke: '#5d7a3c', 'stroke-width': 1.2, fill: 'none' }, s)
          if (type === 'leaf') { el('ellipse', { cx: -2.6, cy: -8, rx: 3.2, ry: 1.5, fill: '#7aa04a', transform: 'rotate(-35 -2.6 -8)' }, s); el('ellipse', { cx: 2.6, cy: -11, rx: 3, ry: 1.4, fill: '#8db35a', transform: 'rotate(35 2.6 -11)' }, s) }
          else { for (let k = 0; k < 5; k++) el('circle', { cx: Math.cos(k * 1.257) * 1.8, cy: -14 + Math.sin(k * 1.257) * 1.8, r: 1.5, fill: '#f3c94a' }, s); el('circle', { cx: 0, cy: -14, r: 0.9, fill: '#d58a2a' }, s) }
          sprouts.push(s)
        }
        el('path', { d: 'M-12 -27 L 5 -27 L 7.5 -42 L -14.5 -42 Z', fill: '#c9a866' }, basket)
        el('path', { d: 'M-12 -27 L 5 -27 L 7.5 -42 L -14.5 -42 Z', fill: url('weave'), opacity: 0.8 }, basket)
        el('ellipse', { cx: -3.5, cy: -42, rx: 11.2, ry: 2.4, fill: '#b28f50' }, basket)
        el('path', { d: 'M4 -29 C 9 -26 13 -22 16 -17', stroke: '#5d7a3c', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round' }, upper)
        const head = el('g', {}, upper)
        if (c.ear === 'pointy') { const e = el('g', {}, head); el('path', { d: 'M10 -36 L 12 -50 L 19 -41 Z', fill: c.shade }, e); el('path', { d: 'M16 -40 L 21 -51 L 26 -39 Z', fill: c.earColor }, e); el('path', { d: 'M18 -41 L 21 -48 L 24 -40 Z', fill: c.inner }, e) }
        el('circle', { cx: 19, cy: -33, r: 10.5, fill: c.coat }, head)
        el('clipPath', { id: id + 'h' }, head).append(el('circle', { cx: 19, cy: -33, r: 10.5 }))
        furSpecks(el('g', { 'clip-path': url('d' + n + 'h') }, head), 8, -44, 22, 22, Math.round(70 * density), n * 31, c)
        if (kind === 'shiba') el('path', { d: 'M12 -27 C 16 -23 24 -22 30 -26 L 26 -32 Z', fill: c.light }, head)
        el('ellipse', { cx: 28, cy: -30, rx: 6.4, ry: 4.6, fill: c.muzzle }, head)
        el('circle', { cx: 33.6, cy: -31.4, r: 1.8, fill: '#2d2625' }, head)
        el('circle', { cx: 22, cy: -27.5, r: 2.2, fill: '#ee9a8a', opacity: 0.45 }, head)
        const eye = el('circle', { cx: 22.5, cy: -35.5, r: 1.4, fill: '#2d2625' }, head)
        const eyeClosed = el('path', { d: 'M20.6 -35 q 1.9 -2 3.8 0', stroke: '#2d2625', 'stroke-width': 1.1, fill: 'none', 'stroke-linecap': 'round', opacity: 0 }, head)
        const mouth = el('ellipse', { cx: 29, cy: -26.4, rx: 2.2, ry: 2.8, fill: '#b5534a', opacity: 0 }, head)
        const carryFlower = el('g', { opacity: 0 }, head)
        el('path', { d: 'M30 -27 q 6 1 9 -6', stroke: '#5d7a3c', 'stroke-width': 1.3, fill: 'none' }, carryFlower)
        for (let k = 0; k < 5; k++) el('circle', { cx: 39 + Math.cos(k * 1.257) * 2.8, cy: -35 + Math.sin(k * 1.257) * 2.8, r: 2.2, fill: C.pink }, carryFlower)
        el('circle', { cx: 39, cy: -35, r: 1.3, fill: '#e3a33b' }, carryFlower)
        const carryBundle = el('g', { opacity: 0 }, head)
        el('circle', { cx: 35, cy: -22, r: 5.5, fill: '#8fae5c' }, carryBundle)
        el('path', { d: 'M32 -26 L 33 -30 L 35 -26.5 L 37 -30 L 38 -26', fill: '#7a9a4c' }, carryBundle)
        if (c.ear === 'floppy') el('path', { d: 'M12 -41 C 6 -40 4 -32 7 -25 C 9 -21 13 -23 14 -28 C 15 -33 15 -38 12 -41 Z', fill: c.earColor }, head)
        leg('bn', -4, c.coat); leg('fn', 15, c.coat)
        furry.append(legs.bn.g, legs.fn.g)
        // back view, used when walking away from the viewer
        const back = el('g', { opacity: 0 }, root)
        const backFur = el('g', { filter: url('fuzz') }, back)
        const backFeet = [el('ellipse', { cx: -7, cy: -1.5, rx: 4.2, ry: 2.6, fill: c.shade }, backFur), el('ellipse', { cx: 7, cy: -1.5, rx: 4.2, ry: 2.6, fill: c.shade }, backFur)]
        if (c.ear === 'pointy') for (const m of [1, -1]) { el('path', { d: `M${-9.5 * m} -38 L ${-7 * m} -51 L ${-1.5 * m} -41 Z`, fill: c.coat }, backFur); el('path', { d: `M${-8 * m} -40 L ${-6.6 * m} -48 L ${-3.5 * m} -41 Z`, fill: c.shade, opacity: 0.5 }, backFur) }
        el('circle', { cx: 0, cy: -33, r: 10.5, fill: c.coat }, backFur)
        const BACK_D = 'M-13 -4 C -16 -14 -12 -26 0 -27 C 12 -26 16 -14 13 -4 C 8 -1 -8 -1 -13 -4 Z'
        el('path', { d: BACK_D, fill: c.coat }, backFur)
        el('clipPath', { id: id + 'bb' }, back).append(el('path', { d: BACK_D }))
        furSpecks(el('g', { 'clip-path': url('d' + n + 'bb') }, backFur), -14, -28, 28, 28, Math.round(110 * density), n * 23, c)
        if (c.ear === 'floppy') for (const m of [1, -1]) el('ellipse', { cx: -10.5 * m, cy: -31, rx: 4.2, ry: 8, fill: c.earColor, transform: `rotate(${12 * m} ${-10.5 * m} -31)` }, backFur)
        el('circle', { cx: 0, cy: -5, r: 4.4, fill: c.light }, backFur)
        const backSprouts = []
        for (const [sx, rot] of [[-4, -14], [1, 8], [5, 20]]) {
          const s = el('g', { transform: `translate(${sx} -27) rotate(${rot})`, opacity: 0 }, back)
          el('path', { d: 'M0 0 q 1 -6 0 -11', stroke: '#5d7a3c', 'stroke-width': 1.2, fill: 'none' }, s)
          el('ellipse', { cx: -2.4, cy: -7, rx: 3, ry: 1.4, fill: '#7aa04a', transform: 'rotate(-35 -2.4 -7)' }, s)
          el('ellipse', { cx: 2.4, cy: -9.5, rx: 2.8, ry: 1.3, fill: '#8db35a', transform: 'rotate(35 2.4 -9.5)' }, s)
          backSprouts.push(s)
        }
        el('path', { d: 'M-8 -12 L 8 -12 L 9.5 -26 L -9.5 -26 Z', fill: '#c9a866' }, back)
        el('path', { d: 'M-8 -12 L 8 -12 L 9.5 -26 L -9.5 -26 Z', fill: url('weave'), opacity: 0.8 }, back)
        el('ellipse', { cx: 0, cy: -26, rx: 10, ry: 2.2, fill: '#b28f50' }, back)
        el('path', { d: 'M-8 -24 C -10 -28 -9 -31 -6 -32 M8 -24 C 10 -28 9 -31 6 -32', stroke: '#5d7a3c', 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' }, back)
        const zzz = el('g', { opacity: 0 }, root)
        ;['z', 'z', 'Z'].forEach((ch, i) => { const z = el('text', { x: 24 + i * 7, y: -40 - i * 9, 'font-size': 9 + i * 2, fill: '#3f5a36', class: 'pws-zzz', style: `--delay:${-i * 0.9}s`, 'font-family': 'Georgia, serif' }, zzz); z.textContent = ch })
        // label + speech bubble in screen units (undo the dog's scale)
        const over = el('g', { transform: `scale(${(1 / scale).toFixed(3)})` }, root)
        const top = -58 * scale
        const tag = el('g', { class: 'pws-tag' }, over)
        const tagBox = el('rect', { x: -20, y: 8, width: 40, height: 19, rx: 9.5 }, tag)
        const tagText = el('text', { x: 0, y: 22, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }, tag)
        const bubble = el('g', { opacity: 0, class: 'pws-bubble' }, over)
        const bubbleBox = el('rect', { x: -40, y: top - 36, width: 80, height: 30, rx: 15, fill: '#fffdf6', stroke: '#9bb08f', 'stroke-width': 1.4 }, bubble)
        el('path', { d: `M-6 ${top - 7} L 0 ${top + 2} L 6 ${top - 7} Z`, fill: '#fffdf6', stroke: '#9bb08f', 'stroke-width': 1.4 }, bubble)
        el('rect', { x: -7, y: top - 9, width: 14, height: 4, fill: '#fffdf6' }, bubble)
        const bubbleText = el('text', { x: 0, y: top - 15.5, 'text-anchor': 'middle', 'font-size': 17, fill: '#2c3a2e' }, bubble)
        return {
          root, title, ring, flip, breath, upper, head, legs, haunch, shadow, sprouts, eye, eyeClosed, mouth, zzz, tail, scale,
          back, backFeet, backSprouts, carryFlower, carryBundle, tag, tagBox, tagText, bubble, bubbleBox, bubbleText,
          x: 0, y: 0, face: 1, phase: 0, hop: 0, pose: '', reads: 0, view: 'side', carry: null, alpha: 1, dozing: false,
        }
      }
      // ---------- small props that fly between places
      const prop = (kind, color) => {
        const g = el('g', {}, fx)
        if (kind === 'envelope' || kind === 'letter') {
          el('rect', { x: -9, y: -6, width: 18, height: 12, rx: 1.4, fill: '#fffaf0', stroke: '#c9b98f', 'stroke-width': 1 }, g)
          el('path', { d: 'M-9 -6 L 0 1 L 9 -6', stroke: '#c9b98f', 'stroke-width': 1, fill: 'none' }, g)
          el('circle', { cx: 0, cy: 1, r: 2, fill: C.roof }, g)
        } else if (kind === 'petal') {
          el('path', { d: 'M0 -8 C 7 -7 9 2 0 8 C -9 2 -7 -7 0 -8 Z', fill: C.pink }, g)
          el('path', { d: 'M0 -6 L 0 6', stroke: '#d77f86', 'stroke-width': 0.8 }, g)
        } else if (kind === 'flower') {
          el('path', { d: 'M0 9 q 1 -4 0 -9', stroke: '#5d7a3c', 'stroke-width': 1.4, fill: 'none' }, g)
          for (let k = 0; k < 5; k++) el('circle', { cx: Math.cos(k * 1.257) * 3, cy: Math.sin(k * 1.257) * 3, r: 2.4, fill: color || C.pink }, g)
          el('circle', { r: 1.4, fill: '#e3a33b' }, g)
        } else if (kind === 'bundle') {
          el('circle', { r: 6.5, fill: '#8fae5c' }, g)
          el('path', { d: 'M-3.5 -5 L -1.2 -9.5 L 0 -5 L 1.2 -9.5 L 3.5 -5', fill: '#7a9a4c' }, g)
        } else if (kind === 'seed') {
          el('ellipse', { rx: 4.5, ry: 6.5, fill: '#c88c3c', transform: 'rotate(30)' }, g)
          el('path', { d: 'M0 -6 q 3 -6 8 -6', stroke: '#5d9a45', 'stroke-width': 1.5, fill: 'none' }, g)
        } else if (kind === 'fluff') {
          el('path', { d: 'M0 0 L 0 -7', stroke: '#8a7a5a', 'stroke-width': 0.9 }, g)
          for (let k = -2; k <= 2; k++) el('path', { d: `M0 -7 L ${k * 2.4} -12`, stroke: '#ffffff', 'stroke-width': 1 }, g)
        } else if (kind === 'leaf') {
          el('ellipse', { rx: 4, ry: 2, fill: color || '#7aa04a' }, g)
        } else if (kind === 'boot') {
          el('path', { d: 'M-6 -9 L 2 -9 L 2 0 L 9 1 L 9 6 L -6 6 Z', fill: '#7a4b2a', stroke: '#4a2e1a', 'stroke-width': 1 }, g)
        } else if (kind === 'bubble') {
          el('circle', { r: 8, fill: '#ffffff', opacity: 0.35, stroke: '#ffffff', 'stroke-width': 1.4 }, g)
          el('circle', { cx: -2.5, cy: -2.5, r: 2, fill: '#ffffff' }, g)
        } else if (kind === 'heart') {
          el('path', { d: 'M0 4 C -9 -2 -7 -9 -2.5 -9 C -1 -9 0 -8 0 -6.5 C 0 -8 1 -9 2.5 -9 C 7 -9 9 -2 0 4 Z', fill: '#e8737a' }, g)
        } else if (kind === 'puff') {
          el('circle', { r: 6, fill: color || '#ffffff', opacity: 0.85 }, g)
        }
        return g
      }
      const makeBoat = (cargo) => {
        const g = el('g', {}, whaleLayer)
        el('ellipse', { cx: 4, cy: 9, rx: 36, ry: 6, fill: '#2e7a70', opacity: 0.45 }, g)
        el('path', { d: 'M-30 0 L 28 0 Q 22 12 0 13 Q -22 12 -30 0 Z', fill: '#f6f3ea' }, g)
        el('path', { d: 'M-28 3.5 L 26 3.5', stroke: C.roof, 'stroke-width': 2.4 }, g)
        el('rect', { x: -1, y: -48, width: 2, height: 48, fill: '#7a5532' }, g)
        el('path', { d: 'M2 -46 L 2 -4 L 27 -6 Z', fill: C.sail }, g)
        el('path', { d: 'M-2 -44 L -2 -6 L -21 -6 Z', fill: '#f3e9cf' }, g)
        el('path', { d: 'M1 -48 L 11 -45 L 1 -42 Z', fill: C.roof }, g)
        if (cargo) { const c = prop(cargo); c.setAttribute('transform', 'translate(12 -18)'); g.append(c) }
        return g
      }
      const makeGull = (letter) => {
        const g = el('g', {}, fx)
        const wingB = el('path', { fill: '#dfe3dc' }, g)
        el('ellipse', { cx: 0, cy: 0, rx: 7.5, ry: 3.2, fill: '#fbfaf5' }, g)
        el('path', { d: 'M-7 0 L -11 -2 L -10 1.5 Z', fill: '#cfd4cc' }, g)
        el('circle', { cx: 6.5, cy: -2.2, r: 2.8, fill: '#fbfaf5' }, g)
        el('path', { d: 'M9 -2.4 L 12.5 -1.6 L 9 -0.8 Z', fill: '#e8a33b' }, g)
        el('circle', { cx: 7.2, cy: -2.9, r: 0.7, fill: '#2d2625' }, g)
        const wingA = el('path', { fill: '#ffffff', stroke: '#b9c0ba', 'stroke-width': 0.5 }, g)
        if (letter) { const env = prop('envelope'); env.setAttribute('transform', 'translate(-1 7) scale(0.55)'); g.append(env) }
        return { g, wingA, wingB }
      }

      return {
        svg, objects, fx, flows, whale: W, drawWhale, wpt, sails: MILL.sails, millTop: MILL.top,
        house: HOUSE, beds, buoys, shed: SHED, vine: VINE, islet: ISLET, board: BOARD, compost: COMPOST,
        chatCard, planCard, moreText, sleepText, spots, route, makeDog, prop, makeBoat, makeGull,
        // the 3D stage keeps only the words and drops the drawn scenery
        layers: { bg, sea, whaleLayer, island, groundLayer, shadows, tufts, clouds, grain, speck, ui },
      }
    }

    class Stage {
      constructor(host, hooks) {
        this.host = host
        this.hooks = hooks
        this.alive = true
        this.started = false
        this.seen = new Set()
        this.dogs = new Map()
        this.stations = new Map()
        this.actorRows = new Map()
        this.slots = { cab: [null, null, null, null], app: [null], cloud: [null], buoy: [null, null, null, null] }
        this.used = new Map()
        this.busy = new Set()
        this.failedSet = new Set()
        this.running = 0
        this.flowsOn = false
        this.flowTime = 0
        this.selected = null
        this.whaleTarget = 0.45
        this.lastSeed = 0
        this.reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false
        this.uid = 'pw' + Math.random().toString(36).slice(2, 8)
        host.innerHTML = ''
        this.svg = svgEl('svg', { class: 'pws-svg', role: 'img', 'aria-label': fmt('sceneLabel') }, host)
        this.isl = buildIsland(this.svg, this.uid, fmt)
        this.fx = this.isl.fx
        this.isl.drawWhale()
        this.tick = (time) => {
          if (!this.alive) return
          const W = this.isl.whale
          W.t = time
          // asked by a dog, the whale comes right up out of the water
          W.rise += ((performance.now() < (this.whaleUntil ?? 0) ? 1.6 : this.whaleTarget) - W.rise) * 0.04
          this.isl.drawWhale()
          const now = performance.now()
          for (const dog of this.dogs.values()) if (!dog.hidden && (dog.pose === 'happy' || dog.pose === 'walk')) this.wagTail(dog, now)
          this.raf = requestAnimationFrame(this.tick)
        }
        if (!this.reduced) this.raf = requestAnimationFrame(this.tick)
        // idle play: a dog with nothing to do sniffs, scratches, looks at the whale...
        if (!this.reduced) this.idleTimer = setInterval(() => this.idleTick(), 500)
      }

      dispose() {
        this.alive = false
        cancelAnimationFrame(this.raf)
        clearInterval(this.idleTimer)
        this.host.innerHTML = ''
        this.dogs.clear()
      }

      // ---- timing
      async tween(ms, fn) {
        if (!this.alive) throw CANCEL
        if (ms <= 0 || this.reduced) { fn(1); return }
        const start = performance.now()
        for (;;) {
          await frame()
          if (!this.alive) throw CANCEL
          const p = Math.min(1, (performance.now() - start) / ms)
          fn(p)
          if (p >= 1) return
        }
      }
      wait(ms, dog) { return this.tween(dog?.rush ? ms * 0.3 : ms, () => {}) }

      // ---- context for plain sentences
      context() {
        return {
          who: (id) => this.whoOf(id),
          whoByName: (name) => {
            for (const row of this.actorRows.values()) if (row.id === name || row.name === name) return this.whoOf(row.id)
            return clipText(name, 16) || fmt('helper')
          },
          station: (id) => this.stations.get(id),
          isLead: (id) => this.actorRows.get(id)?.role === 'lead',
        }
      }
      whoOf(id) {
        const row = this.actorRows.get(id)
        if (!row) return fmt('helper')
        if (row.role === 'lead') return fmt('lead')
        return clipText(row.name, 10) || fmt('helper')
      }
      isLead(id) { return this.actorRows.get(id)?.role === 'lead' }

      // ---- stations and slots
      station(id) {
        const known = this.stations.get(id)
        if (known) return known
        const text = String(id ?? '')
        if (text.startsWith('dir:') || text === 'parts' || text === 'skill') return { id: text, kind: 'file', name: lastSegment(text) }
        if (text.startsWith('web:')) return { id: text, kind: 'web', name: text.slice(4) }
        if (text.startsWith('mcp:')) return { id: text, kind: 'mcp', name: text.slice(4), place: 'local' }
        if (text === 'shell') return { id: text, kind: 'shell' }
        if (text === 'front') return { id: text, kind: 'front' }
        return { id: text || 'desk', kind: text ? 'tool' : 'desk' }
      }
      slotKind(station) {
        if (station.kind === 'file') return 'cab'
        if (station.kind === 'web') return 'buoy'
        if (station.kind === 'mcp') return station.place === 'cloud' ? 'cloud' : 'app'
        return null
      }
      slotFor(kind, id) {
        const list = this.slots[kind]
        let index = list.indexOf(id)
        if (index < 0) {
          index = list.indexOf(null)
          if (index < 0) {
            let best = Infinity
            list.forEach((other, at) => {
              const time = this.used.get(other) ?? 0
              if (!this.busy.has(other) && time < best) { best = time; index = at }
            })
            if (index < 0) index = 0
          }
          list[index] = id
          this.renderSlot(kind, index, true)
        }
        this.used.set(id, performance.now())
        return index
      }
      renderSlot(kind, index, pop) {
        const id = this.slots[kind][index]
        const station = id ? this.station(id) : null
        const name = id ? placeName(station, id) : ''
        const mark = (node) => { if (id) node.dataset.station = id; else delete node.dataset.station }
        if (kind === 'cab') {
          const bed = this.isl.beds[index]
          bed.show(!!id)
          mark(bed.sign.g)
          if (!id) return
          bed.sign.set(name, station.detail || name)
          bed.setBuds(0)
          bed.count.textContent = ''
          if (pop) this.pop(bed.g, bed.cx, bed.cy)
        } else if (kind === 'buoy') {
          const buoy = this.isl.buoys[index]
          buoy.g.style.display = id ? '' : 'none'
          mark(buoy.sign.g)
          if (id) buoy.sign.set(name, station.name)
          if (id && pop) this.pop(buoy.g, buoy.point[0] + 26, buoy.point[1])
        } else if (kind === 'app') {
          mark(this.isl.shed.sign.g)
          this.isl.shed.sign.set(id ? name : fmt('localApp'))
        } else if (kind === 'cloud') {
          mark(this.isl.islet.sign.g)
          this.isl.islet.sign.set(id ? name : fmt('zone.cloud'))
        }
      }
      pop(node, cx, cy) {
        if (this.reduced) return
        this.tween(380, (p) => {
          const s = p < 1 ? 0.4 + 0.6 * (1 - (1 - p) ** 3) + Math.sin(p * Math.PI) * 0.12 : 1
          node.setAttribute('transform', `translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})`)
        }).then(() => node.removeAttribute('transform')).catch(() => {})
      }
      slotEl(id) {
        if (!id) return null
        return this.svg.querySelector('[data-station="' + window.CSS.escape(String(id)) + '"]')
      }
      bedOf(id) {
        const index = this.slots.cab.indexOf(id)
        return index >= 0 ? this.isl.beds[index] : null
      }
      buoyPoint(id) {
        const index = this.slots.buoy.indexOf(id)
        return index >= 0 ? this.isl.buoys[index].point : [1080, 720]
      }

      /** Where a dog stands for this item. */
      spotFor(item) {
        const S = this.isl.spots
        const id = item.station || 'desk'
        if (id === 'front' || item.type === 'deliver' || item.type === 'approval.ask' || item.action === 'ask' ||
          (item.type === 'task.open' && this.isLead(item.actor))) return { ...S.door, key: 'front' }
        if (id === 'desk' || id === 'toolbox') {
          if (item.type === 'agent.wait' || item.type === 'message.send') return { ...S.wait, key: 'wait' }
          if (item.action === 'dispatch' || item.type === 'actor.spawn') return { ...S.split, key: 'split' }
          if (item.type === 'plan' || item.action === 'board') return { ...S.board, key: 'board' }
          return { ...S.desk, key: 'desk' }
        }
        const station = this.station(id)
        if (station.kind === 'shell') return { ...S.mill, key: 'mill' }
        const kind = this.slotKind(station)
        if (kind === 'cab') return { ...this.isl.beds[this.slotFor('cab', id)].spot, key: 'cab:' + id }
        if (kind === 'app') { this.slotFor('app', id); return { ...S.shed, key: 'shed' } }
        if (kind === 'cloud') { this.slotFor('cloud', id); return { ...S.cloud, key: 'cloud' } }
        if (kind === 'buoy') { this.slotFor('buoy', id); return { ...S.pier, key: 'pier' } }
        return { ...S.desk, key: 'desk' }
      }

      // ---- dogs
      makeDog(row, index) {
        const lead = row.role === 'lead'
        const kind = lead ? 'shiba' : ['brown', 'cream'][index % 2]
        const parts = this.isl.makeDog(kind, lead ? 0.84 : 0.74, lead ? 1 : 0.5)
        const desk = this.isl.spots.desk
        const dog = Object.assign(parts, {
          id: row.id, kind, x: desk.x, y: desk.y, face: 1, spot: 'desk', queue: [], running: false, rush: false,
          call: null, asleep: false, hidden: false, tools: 0, now: '', signText: '', bubbleToken: 0,
        })
        const select = () => this.hooks.onSelect(row.id)
        dog.root.addEventListener('click', select)
        dog.root.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select() }
        })
        this.dogs.set(row.id, dog)
        this.drawDog(dog)
        return dog
      }
      setHidden(dog, hidden) {
        dog.hidden = hidden
        dog.root.style.display = hidden ? 'none' : ''
      }
      setTag(dog, text) {
        dog.tagText.textContent = text
        const w = Math.max(28, textWidth(text, 13) + 14)
        dog.tagBox.setAttribute('x', -w / 2)
        dog.tagBox.setAttribute('width', w)
      }
      wagTail(dog, now) {
        const wag = Math.sin(now / 90) * 10
        dog.tail.setAttribute('transform', `rotate(${wag.toFixed(1)} -13 -20)`)
      }
      drawDog(dog) {
        const objects = this.isl.objects
        dog.root.dataset.y = dog.y
        dog.root.setAttribute('transform', `translate(${dog.x.toFixed(1)} ${dog.y.toFixed(1)}) scale(${dog.scale})`)
        const p = dog.pose
        dog.flip.setAttribute('transform', `translate(0 ${(-dog.hop).toFixed(1)}) scale(${dog.face} 1)`)
        const swing = p === 'walk' ? Math.sin(dog.phase) * 24 : 0
        const showBack = !(p === 'sit' || p === 'sleep'), showFront = p !== 'sleep'
        for (const [name, sgn, front] of [['bf', 1, false], ['bn', -1, false], ['ff', -1, true], ['fn', 1, true]]) {
          const L = dog.legs[name]
          L.g.setAttribute('opacity', (front ? showFront : showBack) ? 1 : 0)
          const stretch = p === 'sit' && front ? ' translate(-4 0) scale(1 1.55)' : ''
          L.g.setAttribute('transform', `rotate(${(swing * sgn).toFixed(1)} ${L.x} -12)${stretch}`)
        }
        dog.haunch.setAttribute('opacity', p === 'sit' ? 1 : 0)
        dog.upper.setAttribute('transform', { sit: 'rotate(-20 -12 -6)', sleep: 'translate(0 8) scale(1.04 .9)', push: 'rotate(8 14 -6)', jump: 'rotate(-8 0 -10)', shrug: 'rotate(-7 0 -6)' }[p] || '')
        dog.head.setAttribute('transform', { sniff: 'rotate(30 15 -26)', yawn: 'rotate(-24 15 -26)', sleep: 'rotate(14 15 -26) translate(0 3)', sit: 'rotate(14 15 -26)', shrug: 'rotate(-12 15 -26)' }[p] || '')
        const closed = p === 'yawn' || p === 'sleep' || p === 'happy' || p === 'jump'
        dog.eye.setAttribute('opacity', closed ? 0 : 1)
        dog.eyeClosed.setAttribute('opacity', closed ? 1 : 0)
        dog.mouth.setAttribute('opacity', p === 'yawn' ? 1 : 0)
        dog.zzz.setAttribute('opacity', p === 'sleep' || dog.dozing ? 1 : 0)
        if (p !== 'walk' && p !== 'happy') dog.tail.setAttribute('transform', '')
        const reads = Math.min(6, dog.reads)
        dog.sprouts.forEach((s, i) => s.setAttribute('opacity', i < reads ? 1 : 0))
        dog.shadow.setAttribute('rx', (p === 'sleep' ? 24 : 20) - dog.hop * 0.4)
        const back = dog.view === 'back'
        dog.flip.setAttribute('opacity', back ? 0 : 1)
        dog.back.setAttribute('opacity', back ? 1 : 0)
        if (back) {
          dog.back.setAttribute('transform', `translate(0 ${(-dog.hop).toFixed(1)})`)
          dog.backFeet[0].setAttribute('transform', `translate(0 ${(-Math.max(0, Math.sin(dog.phase)) * 2.5).toFixed(1)})`)
          dog.backFeet[1].setAttribute('transform', `translate(0 ${(-Math.max(0, -Math.sin(dog.phase)) * 2.5).toFixed(1)})`)
        }
        dog.backSprouts.forEach((s, i) => s.setAttribute('opacity', i < Math.ceil(reads / 2) ? 1 : 0))
        dog.carryFlower.setAttribute('opacity', dog.carry === 'flower' ? 1 : 0)
        dog.carryBundle.setAttribute('opacity', dog.carry === 'bundle' ? 1 : 0)
        dog.root.setAttribute('opacity', dog.alpha)
        dog.breath.classList.toggle('pws-breathe', p === 'sleep')
        let next = null
        for (const node of objects.children) if (node !== dog.root && +node.dataset.y > dog.y) { next = node; break }
        if (next) { if (dog.root.nextSibling !== next) objects.insertBefore(dog.root, next) } else if (objects.lastChild !== dog.root) objects.append(dog.root)
      }
      setPose(dog, pose) { dog.pose = pose || ''; this.drawDog(dog) }
      setBubble(dog, text) {
        if (!text) { dog.bubble.setAttribute('opacity', 0); return }
        dog.bubbleText.textContent = text
        const w = Math.max(44, textWidth(text, 17) + 26)
        dog.bubbleBox.setAttribute('x', -w / 2)
        dog.bubbleBox.setAttribute('width', w)
        dog.bubble.setAttribute('opacity', 1)
      }
      sign(dog, text) {
        dog.signText = text || ''
        this.setBubble(dog, dog.signText)
      }
      clear(dog) {
        dog.carry = null
        dog.dozing = false
        dog.view = 'side'
        dog.hop = 0
        dog.signText = ''
        this.setBubble(dog, '')
        this.setPose(dog, '')
      }
      doing(dog, text) {
        dog.now = text
        dog.root.setAttribute('aria-label', this.whoOf(dog.id) + '：' + text)
        dog.title.textContent = this.whoOf(dog.id) + '：' + text
        this.hooks.onCaption(dog.id, text)
      }
      offsetFor(dog, key) {
        let n = 0
        for (const other of this.dogs.values()) if (other !== dog && !other.hidden && !other.asleep && other.spot === key) n++
        return OFFSETS[n % OFFSETS.length]
      }
      place(dog, spot) {
        const off = this.offsetFor(dog, spot.key)
        dog.spot = spot.key
        dog.x = spot.x + off
        dog.y = spot.y + Math.abs(off) * 0.2
        if (spot.face) dog.face = spot.face
        dog.hop = 0
        dog.view = 'side'
        this.drawDog(dog)
      }
      async walk(dog, spot) {
        const off = this.offsetFor(dog, spot.key)
        const tx = spot.x + off, ty = spot.y + Math.abs(off) * 0.2
        const far = Math.hypot(tx - dog.x, ty - dog.y)
        dog.spot = spot.key
        // Far behind the log: hop there instead of walking, so the picture
        // never shows a step the story bar has long moved past.
        if (this.reduced || (dog.queue.length > 3 && far > 160)) {
          this.poof(dog.x, dog.y - 14)
          dog.x = tx; dog.y = ty
          if (spot.face) dog.face = spot.face
          this.drawDog(dog)
          this.poof(dog.x, dog.y - 14)
          return
        }
        if (far < 1) { if (spot.face) dog.face = spot.face; this.drawDog(dog); return }
        const speed = dog.rush ? 340 : 125
        dog.pose = 'walk'
        try {
          for (const [px, py] of this.isl.route([dog.x, dog.y], [tx, ty])) {
            const x0 = dog.x, y0 = dog.y, dist = Math.hypot(px - x0, py - y0)
            if (dist < 0.5) continue
            if (Math.abs(px - x0) > 0.5) dog.face = px > x0 ? 1 : -1
            dog.view = py - y0 < -Math.abs(px - x0) * 0.8 ? 'back' : 'side'
            const ph0 = dog.phase
            await this.tween(dist / (dog.rush ? 340 : speed) * 1000, (p) => {
              dog.x = x0 + (px - x0) * p
              dog.y = y0 + (py - y0) * p
              dog.phase = ph0 + (dist * p) / 5
              dog.hop = Math.abs(Math.sin(dog.phase)) * 1.6
              this.drawDog(dog)
            })
          }
        } finally {
          dog.pose = ''
          dog.hop = 0
          dog.view = 'side'
          if (spot.face) dog.face = spot.face
          this.drawDog(dog)
        }
      }
      async say(dog, text, ms = 1100) {
        if (!text) return
        const token = ++dog.bubbleToken
        this.setBubble(dog, text)
        try { await this.wait(ms, dog) } finally { if (dog.bubbleToken === token) this.setBubble(dog, dog.signText) }
      }
      bark(dog, key, ms) { this.say(dog, fmt(key), ms).catch(() => {}) }
      async hop(dog, ms = 700, times = 2, height = 6) {
        dog.pose = 'happy'
        try {
          await this.tween(dog.rush ? ms * 0.4 : ms, (p) => { dog.hop = Math.abs(Math.sin(p * Math.PI * times)) * height; this.drawDog(dog) })
        } finally { dog.hop = 0; dog.pose = ''; this.drawDog(dog) }
      }
      async happy(dog, key) {
        if (key) this.bark(dog, key, 900)
        await this.hop(dog, 800, 2, 7)
      }
      async shrug(dog) {
        this.setPose(dog, 'shrug')
        await this.wait(900, dog)
        this.setPose(dog, '')
      }
      /** A failed step: head down a moment, then a shake of the head. */
      async sad(dog) {
        this.setPose(dog, 'sad')
        await this.wait(750, dog)
        try {
          await this.tween(dog.rush ? 250 : 650, (p) => { dog.shake = 1 - p; dog.shakeT = p; this.drawDog(dog) })
        } finally { dog.shake = 0 }
        this.setPose(dog, '')
      }
      /** A step went well: a short, quick wag. */
      async wag(dog, ms = 320) {
        this.setPose(dog, 'happy')
        await this.wait(ms, dog)
        this.setPose(dog, '')
      }
      /**
       * Before a step the AI asks the model: the dog looks up at the whale, the
       * whale thinks (more bubbles the longer the model really took, ms) and
       * tosses a seed, which the dog jumps to catch.
       */
      async askWhale(dog, ms) {
        if (ms == null || this.reduced || this.snap || dog.hidden || dog.asleep || dog.queue.length > 3) return
        this.lastSeed = performance.now()
        dog.face = 1
        this.setPose(dog, 'gaze')
        const n = Math.max(1, Math.min(6, Math.round(1 + Math.log2(1 + ms / 1500) * 1.4)))
        // stays up until the seed has landed, then sinks back slowly
        this.whaleUntil = Math.max(this.whaleUntil ?? 0, performance.now() + (dog.rush ? 1400 : 3000 + n * 220))
        await this.wait(dog.rush ? 150 : 450, dog)
        this.thinkBubbles(dog.rush ? Math.min(2, n) : n)
        await this.wait(380 + n * 220, dog)
        if (!this.isl.whale.spouting) this.spout().catch(() => {})
        await this.wait(350, dog)
        await this.toss('seed', this.isl.wpt(92, -70), this.mouthOf(dog), 900, 120, dog)
        this.setPose(dog, '')
        await this.hop(dog, 380, 1, 7)
      }
      /** The whale thinking: bubbles rise from it, one after another. */
      thinkBubbles(n) {
        const [wx, wy] = this.isl.wpt(92, -66)
        this.puffs(wx, wy - 6, '#e2f3f7', n, 70)
      }
      /** The final answer: the whale's spout is a rainbow (the flat island just spouts). */
      async rainbow() { return this.spout() }
      /** Two dogs touch noses (a helper hands its result back). */
      async boop(dog, other) {
        const free = !other.running && !other.hidden
        dog.face = other.x > dog.x ? 1 : -1
        this.setPose(dog, 'boop')
        if (free) { other.face = -dog.face; this.setPose(other, 'boop') }
        this.heart((dog.x + other.x) / 2, Math.min(dog.y, other.y) - 36).catch(() => {})
        await this.wait(650, dog)
        this.setPose(dog, '')
        if (free && other.pose === 'boop') this.setPose(other, '')
      }

      // ---- idle play (decoration: it does not stand for anything the AI does)
      idleTick() {
        if (!this.alive || this.snap || this.reduced || document.hidden) return
        const now = performance.now()
        for (const dog of this.dogs.values()) {
          if (dog.idling || dog.hidden || dog.asleep || dog.dozing || dog.running || dog.queue.length) continue
          if (dog.signText || dog.carry || dog.alpha < 1 || dog.pose) continue
          if (!dog.idleAt) { dog.idleAt = now + 2500 + Math.random() * 4000; continue }
          if (now < dog.idleAt) continue
          dog.idleAt = now + 5000 + Math.random() * 7000
          this.idleBit(dog).catch(() => {})
        }
      }
      endIdle(dog) {
        dog.idleAt = performance.now() + 4000 + Math.random() * 4000
        if (!dog.idling) return
        dog.idling = false
        dog.idleToken = (dog.idleToken ?? 0) + 1
        this.setPose(dog, '')
      }
      async idleBit(dog) {
        const token = dog.idleToken = (dog.idleToken ?? 0) + 1
        dog.idling = true
        const live = () => dog.idleToken === token && this.alive
        const hold = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
        const bits = ['sniff', 'scratch', 'gaze', 'yawn', 'bow', 'butterfly', 'butterfly']
        let bit = bits[Math.floor(Math.random() * bits.length)]
        if (bit === 'butterfly' && !this.butterfly) bit = 'sniff'
        try {
          if (bit === 'butterfly') {
            this.butterfly(dog)
            for (const [pose, ms] of [['gaze', 900], ['jump', 320], ['gaze', 700], ['jump', 320], ['happy', 700]]) {
              this.setPose(dog, pose)
              await hold(ms)
              if (!live()) return
            }
            return
          }
          if (bit === 'gaze') { dog.face = 1; this.drawDog(dog) }
          this.setPose(dog, bit)
          await hold({ sniff: 1500, scratch: 1300, gaze: 1600, yawn: 1000, bow: 1100 }[bit])
        } finally {
          if (dog.idleToken === token) {
            dog.idling = false
            if (this.alive && !dog.running) this.setPose(dog, '')
          }
        }
      }
      mouthOf(dog) { return [dog.x + 30 * dog.scale * dog.face, dog.y - 28 * dog.scale] }
      basketOf(dog) { return [dog.x - 3 * dog.scale * dog.face, dog.y - 44 * dog.scale] }

      // ---- effects
      async arc(node, from, to, ms, height) {
        try {
          await this.tween(ms, (p) => {
            const x = from[0] + (to[0] - from[0]) * p
            const y = from[1] + (to[1] - from[1]) * p - height * 4 * p * (1 - p)
            node.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')')
          })
        } finally { node.remove() }
      }
      async toss(kind, from, to, ms, height, dog, color) {
        if (this.reduced) return
        await this.arc(this.isl.prop(kind, color), from, to, dog?.rush ? ms * 0.4 : ms, height)
      }
      poof(x, y) {
        if (this.reduced) return
        const g = svgEl('g', { transform: `translate(${x} ${y})` }, this.fx)
        const ring = svgEl('circle', { r: 2, fill: 'none', stroke: '#fffaf0', 'stroke-width': 3 }, g)
        const dots = [...Array(8)].map(() => svgEl('circle', { r: 2.2, fill: '#fffaf0' }, g))
        this.tween(500, (p) => {
          ring.setAttribute('r', (4 + p * 18).toFixed(1)); ring.setAttribute('opacity', (1 - p).toFixed(2))
          dots.forEach((d, i) => { const a = i * Math.PI / 4; d.setAttribute('cx', (Math.cos(a) * p * 24).toFixed(1)); d.setAttribute('cy', (Math.sin(a) * p * 15 - p * 6).toFixed(1)); d.setAttribute('opacity', (1 - p).toFixed(2)) })
        }).catch(() => {}).finally(() => g.remove())
      }
      async heart(x, y) {
        if (this.reduced) return
        const g = this.isl.prop('heart')
        try {
          await this.tween(1000, (p) => g.setAttribute('transform', `translate(${x} ${(y - p * 30).toFixed(1)}) scale(${(0.6 + Math.min(1, p * 3) * 0.9).toFixed(2)})`))
        } finally { g.remove() }
      }
      puffs(x, y, color, n = 3, rise = 34) {
        if (this.reduced) return
        for (let i = 0; i < n; i++) {
          const g = this.isl.prop('puff', color)
          const dx = (i - (n - 1) / 2) * 6
          setTimeout(() => {
            this.tween(1200, (p) => {
              g.setAttribute('transform', `translate(${(x + dx + p * 8).toFixed(1)} ${(y - p * rise).toFixed(1)}) scale(${(1 + p).toFixed(2)})`)
              g.setAttribute('opacity', (0.9 * (1 - p)).toFixed(2))
            }).catch(() => {}).finally(() => g.remove())
          }, i * 220)
        }
      }
      petals(bed, n) {
        if (this.reduced) return
        for (let i = 0; i < n; i++) {
          const from = [bed.cx + (Math.random() - 0.5) * bed.rx, bed.cy - 6]
          const to = [from[0] + (Math.random() - 0.5) * 90, bed.cy + 10 + Math.random() * 20]
          this.toss('leaf', from, to, 700 + Math.random() * 300, 30 + Math.random() * 30, null, ['#f3c94a', C.pink, '#7aa04a'][i % 3]).catch(() => {})
        }
      }
      wiggle(node) {
        if (this.reduced || !node) return
        this.tween(700, (p) => node.setAttribute('transform', `translate(${(Math.sin(p * 40) * 1.6 * (1 - p)).toFixed(2)} 0)`))
          .then(() => node.removeAttribute('transform')).catch(() => {})
      }
      async grow(bed) {
        if (bed.buds.every((bud) => bud.grown)) bed.setBuds(0)
        const bud = bed.buds.find((b) => !b.grown)
        bud.grown = true
        await this.tween(700, (p) => bud.node.setAttribute('transform', `translate(${bud.x.toFixed(1)} ${bud.y.toFixed(1)}) scale(${(p * 1.6).toFixed(2)})`))
      }
      async spout() {
        if (this.reduced) return
        const W = this.isl.whale
        W.spouting = true
        const [x, y] = this.isl.wpt(92, -66)
        const g = svgEl('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(0.1)` }, this.fx)
        for (let i = 0; i < 7; i++) {
          const a = -75 + i * 25, len = 30 + (i % 2 ? 6 : 14)
          svgEl('path', { d: `M0 0 C -6 ${-len * 0.4} -9 ${-len * 0.8} 0 ${-len} C 9 ${-len * 0.8} 6 ${-len * 0.4} 0 0 Z`, fill: '#cfe8ec', opacity: 0.92, transform: `rotate(${a})` }, g)
        }
        for (let i = 0; i < 9; i++) { const a = (-80 + i * 20) * Math.PI / 180; svgEl('circle', { cx: Math.sin(a) * 52, cy: -Math.cos(a) * 52, r: 2 + (i % 3), fill: '#cfe8ec' }, g) }
        try {
          await this.tween(300, (p) => { W.lift = p })
          await this.tween(420, (p) => g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.1 + 0.9 * p).toFixed(2)})`))
          await this.tween(500, () => {})
          await this.tween(380, (p) => { g.setAttribute('opacity', (1 - p).toFixed(2)); W.lift = 1 - p })
        } finally {
          g.remove()
          W.spouting = false
          W.lift = 0
        }
      }
      /** The whale was up thinking and a new step starts: a seed (the decision) flies to the dog. */
      maybeSeed(dog) {
        if (this.reduced || dog.hidden || dog.rush) return
        const now = performance.now()
        if (now - this.lastSeed < 2600 || this.isl.whale.rise < 0.75) return
        this.lastSeed = now
        ;(async () => {
          this.spout().catch(() => {})
          await this.wait(500)
          await this.toss('seed', this.isl.wpt(92, -70), this.basketOf(dog), 1100, 110)
        })().catch(() => {})
      }
      async boatTrip(from, to, cargo, dog) {
        if (this.reduced) return
        const boat = this.isl.makeBoat(cargo)
        try {
          await this.tween(dog?.rush ? 600 : 1800, (p) => {
            const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2
            const x = lerp(from[0], to[0], e), y = lerp(from[1], to[1], e)
            boat.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${to[0] < from[0] ? -1 : 1} 1) rotate(${(Math.sin(performance.now() / 420) * 3).toFixed(1)})`)
          })
        } finally { boat.remove() }
      }
      async gullTrip(from, to, letter, dog) {
        if (this.reduced) return
        const gull = this.isl.makeGull(letter)
        const face = to[0] > from[0] ? 1 : -1
        try {
          await this.tween(dog?.rush ? 500 : 1500, (p) => {
            const a = Math.sin(performance.now() / 60)
            gull.wingA.setAttribute('d', `M-3 -1 Q 1 ${(-2 - 11 * a).toFixed(1)} 7 ${(-1 - 13 * a).toFixed(1)} Q 4 -1 -3 -1 Z`)
            gull.wingB.setAttribute('d', `M-1 -1 Q 3 ${(-2 - 8 * a).toFixed(1)} 8 ${(-1 - 9 * a).toFixed(1)} Q 5 -1 -1 -1 Z`)
            const x = lerp(from[0], to[0], p), y = lerp(from[1], to[1], p) - 50 * Math.sin(p * Math.PI)
            gull.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${face * 1.5} 1.5)`)
          })
        } finally { gull.g.remove() }
      }
      async vinePulse(ms = 1300) {
        if (this.reduced) return
        const vine = this.isl.vine
        const dots = [0, 1, 2].map(() => { const c = svgEl('g', { opacity: 0 }, vine.g); svgEl('circle', { r: 5, fill: '#fff3b0', opacity: 0.5 }, c); svgEl('circle', { r: 2.2, fill: '#fffbe0' }, c); return c })
        try {
          await this.tween(ms, (p) => dots.forEach((dot, i) => {
            const k = p * 1.5 - i * 0.25
            if (k < 0 || k > 1) { dot.setAttribute('opacity', 0); return }
            const pt = vine.path.getPointAtLength(vine.len * (1 - k))
            dot.setAttribute('opacity', 1)
            dot.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`)
          }))
        } finally { dots.forEach((dot) => dot.remove()) }
      }
      windmill() {
        const fast = this.running > 0 || this.busy.has('shell')
        if (fast !== this.millFast) {
          this.millFast = fast
          this.isl.sails.style.setProperty('--spin', fast ? '1.6s' : '10s')
        }
      }
      lit(node, ms = 1600) {
        if (!node) return
        node.classList.add('pws-lit')
        setTimeout(() => node.classList.remove('pws-lit'), ms)
      }
      plan(todos) { this.isl.planCard.set(todos) }
      chat(kind, text) { if (text) this.isl.chatCard.push(kind, text) }

      // ---- sync with the host snapshot
      sync(data) {
        this.data = data
        this.stations = new Map((data.stations ?? []).map((station) => [station.id, station]))
        this.actorRows = new Map((data.actors ?? []).map((row) => [row.id, row]))
        const first = !this.started
        this.started = true

        const open = new Map()
        this.failedSet = new Set()
        for (const item of data.items ?? []) {
          const call = item.session + ':' + item.call
          if (item.type === 'call.start') open.set(call, item.station)
          if (item.type === 'call.end') {
            open.delete(call)
            if (item.status === 'failed') this.failedSet.add(item.station)
            else this.failedSet.delete(item.station)
          }
        }
        this.busy = new Set(open.values())
        // The whale comes up while some dog is working but no tool is running:
        // that gap is the model thinking about the next step.
        const working = (data.actors ?? []).some((row) => row.state === 'working')
        this.whaleTarget = working && open.size === 0 ? 1 : working ? 0.7 : 0.45
        if (this.reduced) { this.isl.whale.rise = this.whaleTarget; this.isl.drawWhale() }

        ;(data.actors ?? []).forEach((row, index) => {
          let dog = this.dogs.get(row.id)
          if (!dog) {
            dog = this.makeDog(row, index)
            this.setHidden(dog, !first && row.role !== 'lead')
          }
          this.setTag(dog, this.whoOf(row.id))
        })
        for (const [id, dog] of this.dogs) {
          if (this.actorRows.has(id)) continue
          dog.root.remove()
          this.dogs.delete(id)
        }

        if (first) this.restore(data)
        else {
          for (const item of data.items ?? []) {
            if (this.seen.has(item.id)) continue
            this.seen.add(item.id)
            this.apply(item)
          }
          for (const row of data.actors ?? []) {
            const dog = this.dogs.get(row.id)
            if (dog && row.state === 'done' && !dog.asleep && !dog.goingToSleep) {
              dog.goingToSleep = true
              this.enqueue(dog, () => this.sleep(dog))
            }
            if (dog && row.state !== 'done' && dog.asleep) {
              dog.asleep = false
              dog.goingToSleep = false
              this.clear(dog)
            }
          }
        }
        this.decorate()
      }

      /** First open: put everything where it is now, no replay. */
      restore(data) {
        const items = data.items ?? []
        for (const item of items) this.seen.add(item.id)
        const lastUse = new Map()
        for (const item of items) if (item.type === 'call.start') lastUse.set(item.station, item.time)
        const order = [...lastUse.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
        for (const id of order) {
          const kind = this.slotKind(this.station(id))
          if (kind) this.slotFor(kind, id)
        }
        // flowers already planted in each bed
        const writes = new Map()
        for (const item of items) if (item.type === 'call.end' && item.status === 'ok' && item.action === 'write') writes.set(item.station, (writes.get(item.station) ?? 0) + 1)
        this.slots.cab.forEach((id, index) => { if (id) this.isl.beds[index].setBuds(Math.min(6, writes.get(id) ?? 0)) })
        const plan = [...items].reverse().find((item) => item.type === 'plan' && this.isLead(item.actor)) ??
          [...items].reverse().find((item) => item.type === 'plan')
        if (plan) this.plan(plan.todos)
        const ask = [...items].reverse().find((item) => item.type === 'task.open' && this.isLead(item.actor))
        if (ask) this.chat('me', ask.label)
        const end = [...items].reverse().find((item) => item.type === 'task.end' && this.isLead(item.actor))
        if (end && ask && end.time >= ask.time && end.reply) this.chat('ai', end.reply)
        for (const item of items) {
          const dog = this.dogs.get(item.actor)
          if (!dog) continue
          if (item.type === 'call.end' && item.status === 'ok' && (item.action === 'read' || item.action === 'web-fetch')) dog.reads++
          if (item.type === 'compact') dog.reads = 0
          if (item.type === 'call.start') dog.tools++
        }
        let sleeper = 0
        for (const row of data.actors ?? []) {
          const dog = this.dogs.get(row.id)
          if (!dog) continue
          if (row.state === 'done' && row.role !== 'lead') {
            this.layDown(dog, sleeper++)
            continue
          }
          const last = row.last ?? {}
          const item = { type: last.type, action: last.action, station: row.station, actor: row.id, tool: last.tool, target: last.target, detail: '' }
          const finished = row.role === 'lead' && (row.state === 'done' || last.type === 'task.end' || !last.type)
          this.place(dog, finished ? { ...this.isl.spots.door, key: 'front' } : this.spotFor(item))
          this.doing(dog, row.state === 'waiting' ? fmt('waitingNow') : row.state === 'asking' ? fmt('askingNow') : (last.type ? plainOf(item, this.context()) : fmt('idle')))
          if (row.state === 'working' && last.type === 'call.start') this.holdPose(dog, item)
          if (row.state === 'waiting') { dog.dozing = true; this.setPose(dog, 'sit') }
          if (row.state === 'asking') { dog.carry = 'flower'; this.setPose(dog, 'beg'); this.sign(dog, fmt('bark.ask')) }
          this.drawDog(dog)
        }
        this.isl.whale.rise = this.whaleTarget
        this.isl.drawWhale()
        this.updateSleepers()
      }

      layDown(dog, index) {
        dog.asleep = true
        dog.goingToSleep = false
        if (index >= SLEEP.length) { this.setHidden(dog, true); return }
        this.setHidden(dog, false)
        dog.spot = 'sleep'
        dog.x = SLEEP[index][0]
        dog.y = SLEEP[index][1]
        dog.face = 1
        this.clear(dog)
        this.setPose(dog, 'sleep')
        this.doing(dog, fmt('sleeping'))
      }
      updateSleepers() {
        const asleep = [...this.dogs.values()].filter((dog) => dog.asleep)
        const extra = asleep.length - SLEEP.length
        this.isl.sleepText.textContent = extra > 0 ? fmt('more', { n: extra }) : ''
      }

      /** Busy/failed marks, bed counters, flows, the "other folders" note. */
      decorate() {
        for (const node of this.svg.querySelectorAll('[data-station]')) {
          const id = node.dataset.station
          node.classList.toggle('pws-busy', this.busy.has(id))
          node.classList.toggle('pws-err', this.failedSet.has(id) && !this.busy.has(id))
        }
        const counts = new Map()
        for (const item of this.data.items ?? []) {
          if (item.type !== 'call.end' || item.status !== 'ok') continue
          const entry = counts.get(item.station) ?? { read: 0, write: 0 }
          if (item.action === 'write') entry.write++
          else if (item.action === 'read' || item.action === 'search') entry.read++
          counts.set(item.station, entry)
        }
        this.slots.cab.forEach((id, index) => {
          if (!id) return
          const entry = counts.get(id)
          const parts = []
          if (entry?.read) parts.push(fmt('count.read', { n: entry.read }))
          if (entry?.write) parts.push(fmt('count.write', { n: entry.write }))
          this.isl.beds[index].count.textContent = parts.join(' · ')
        })
        const folders = (this.data.stations ?? []).filter((station) => station.kind === 'file').length
        const hidden = folders - this.slots.cab.filter(Boolean).length
        this.isl.moreText.textContent = hidden > 0 ? fmt('otherFolders', { n: hidden }) : ''
        let localBusy = false, cloudBusy = false
        for (const id of this.busy) {
          const station = this.station(id)
          if (station.kind === 'mcp') { if (station.place === 'cloud') cloudBusy = true; else localBusy = true }
        }
        this.isl.shed.glow.setAttribute('opacity', localBusy ? 0.85 : 0)
        this.isl.islet.light.setAttribute('opacity', cloudBusy ? 1 : 0.35)
        this.windmill()
        const newest = Math.max(0, ...(this.data.flows ?? []).map((flow) => flow.time))
        const fresh = this.flowTime && newest > this.flowTime
        this.flowTime = Math.max(this.flowTime, newest)
        this.drawFlows(this.flowsOn || (fresh && !this.quiet))
        if (fresh && !this.flowsOn && !this.quiet) {
          clearTimeout(this.flowTimer)
          this.flowTimer = setTimeout(() => { if (this.alive) this.drawFlows(this.flowsOn) }, 3200)
        }
      }

      anchorOf(id) {
        const S = this.isl.spots
        if (id === 'shell') return { x: this.isl.millTop[0], y: this.isl.millTop[1] + 40 }
        if (id === 'front') return { x: this.isl.house.doorTop[0], y: this.isl.house.doorTop[1] }
        if (id === 'desk' || id === 'toolbox') return { x: S.desk.x, y: S.desk.y - 20 }
        const station = this.station(id)
        const kind = this.slotKind(station)
        if (kind === 'cab') {
          const bed = this.bedOf(id)
          return bed ? { x: bed.cx, y: bed.cy - 6 } : { x: 300, y: 250 }
        }
        if (kind === 'buoy') { const [x, y] = this.buoyPoint(id); return { x: x + 26, y: y - 10 } }
        if (kind === 'app') return { x: this.isl.shed.doorTop[0], y: this.isl.shed.doorTop[1] }
        if (kind === 'cloud') return { x: this.isl.islet.home[0], y: this.isl.islet.home[1] + 30 }
        return { x: S.desk.x, y: S.desk.y - 20 }
      }
      drawFlows(show) {
        const group = this.isl.flows
        group.innerHTML = ''
        group.classList.toggle('pws-show', !!show)
        if (!show) return
        const seen = new Set()
        const boxes = []
        const colors = ['#c0392b', '#2a6fb3', '#2f7a3c', '#8d4fd0', '#c46a12']
        ;(this.data?.flows ?? []).forEach((flow, index) => {
          const a = this.anchorOf(flow.from)
          const b = this.anchorOf(flow.to)
          const key = Math.round(a.x) + ',' + Math.round(a.y) + '>' + Math.round(b.x) + ',' + Math.round(b.y)
          if (seen.has(key) || (Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2)) return
          seen.add(key)
          const mx = (a.x + b.x) / 2
          const my = Math.min(a.y, b.y) - 50 - Math.abs(a.x - b.x) * 0.12
          svgEl('path', { d: 'M' + a.x + ' ' + a.y + ' Q ' + mx + ' ' + my + ' ' + b.x + ' ' + b.y, class: 'pws-flow', stroke: colors[index % colors.length], 'marker-end': 'url(#' + this.uid + 'arrow)' }, group)
          let ly = (my + Math.min(a.y, b.y)) / 2
          while (boxes.some((box) => Math.abs(box.x - mx) < 120 && Math.abs(box.y - ly) < 18)) ly += 19
          boxes.push({ x: mx, y: ly })
          const text = svgEl('text', { x: mx, y: ly, class: 'pws-flow-label' }, group)
          text.textContent = placeName(this.station(flow.from), flow.from) + ' → ' + placeName(this.station(flow.to), flow.to) + (flow.count > 1 ? ' ×' + flow.count : '')
        })
      }
      showFlows(on) {
        this.flowsOn = on
        if (this.data) this.drawFlows(on)
      }
      /** Labels on/off: signs, counts, name tags and cards fade; speech bubbles and every animation stay. */
      showWords(on) {
        const first = this.quiet === undefined
        this.quiet = !on
        // the first call sets the state as it is (no fade on opening); later switches fade
        if (first) this.svg.classList.add('pws-still')
        this.svg.classList.toggle('pws-quiet', !on)
        if (first) setTimeout(() => this.svg.classList.remove('pws-still'), 80)
      }
      select(id) {
        this.selected = id
        for (const dog of this.dogs.values()) dog.ring.setAttribute('opacity', dog.id === id ? 1 : 0)
      }
      flash(item) {
        const dog = this.dogs.get(item.actor)
        if (dog && !dog.hidden) {
          dog.root.classList.remove('pws-flash')
          void dog.root.getBoundingClientRect()
          dog.root.classList.add('pws-flash')
        }
        if (item.station) this.lit(this.slotEl(item.station))
      }

      // ---- live events
      enqueue(dog, job) {
        dog.queue.push(job)
        // A burst of calls must not queue minutes of walking: keep the newest.
        if (dog.queue.length > 6) dog.queue.splice(0, dog.queue.length - 6)
        if (!dog.running) this.run(dog)
      }
      async run(dog) {
        dog.running = true
        try {
          while (dog.queue.length && this.alive) {
            dog.rush = dog.queue.length > 2
            const job = dog.queue.shift()
            this.endIdle(dog)
            try {
              await job()
            } catch (error) {
              if (error === CANCEL) return
              console.warn('[puppy-workflow]', error)
            }
          }
        } finally {
          dog.running = false
          dog.rush = false
        }
      }

      apply(item) {
        const dog = this.dogs.get(item.actor)
        if (!dog) return
        const say = plainOf(item, this.context())
        this.hooks.onStory(say)
        // Reserve the bed/buoy now: a burst may drop this dog's walk, but the
        // place it touched should still appear on the island.
        if (item.type === 'call.start' && item.station) {
          const kind = this.slotKind(this.station(item.station))
          if (kind) this.slotFor(kind, item.station)
        }
        switch (item.type) {
          case 'task.open': return this.enqueue(dog, () => this.taskOpen(dog, item, say))
          case 'task.end': return this.enqueue(dog, () => this.taskEnd(dog, item, say))
          case 'plan': return this.enqueue(dog, () => this.planJob(dog, item, say))
          case 'actor.spawn': return this.spawn(dog, item, say)
          case 'call.start': dog.tools++; return this.enqueue(dog, () => this.callStart(dog, item, say))
          case 'call.end': return this.enqueue(dog, () => this.callEnd(dog, item, say))
          case 'message.send': return this.enqueue(dog, () => this.message(dog, item, say))
          case 'agent.wait': return this.enqueue(dog, () => this.waitJob(dog, item, say))
          case 'approval.ask': return this.enqueue(dog, () => this.approvalAsk(dog, item, say))
          case 'approval.done': return this.enqueue(dog, () => this.approvalDone(dog, item, say))
          case 'compact': return this.enqueue(dog, () => this.compact(dog, say))
          case 'deliver': return this.enqueue(dog, () => this.deliver(dog, item, say))
          default: return undefined
        }
      }

      async taskOpen(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        if (!this.isLead(item.actor)) return
        this.chat('me', item.label)
        await this.walk(dog, { ...this.isl.spots.door, key: 'front' })
        const top = this.isl.house.doorTop
        await this.toss('envelope', top, this.basketOf(dog), 800, 30, dog)
        this.bark(dog, 'bark.got', 1000)
        await this.hop(dog, 600, 2, 6)
      }
      async taskEnd(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        await this.askWhale(dog, item.think)
        if (!this.isLead(item.actor)) {
          const parent = this.dogs.get(this.actorRows.get(item.actor)?.parent)
          if (parent && !parent.hidden && !parent.asleep) {
            await this.walk(dog, { x: parent.x + 44 * (parent.x > 640 ? -1 : 1), y: parent.y + 6, face: parent.x > 640 ? 1 : -1, key: 'report' })
            dog.face = parent.x > dog.x ? 1 : -1
            this.drawDog(dog)
            await this.boop(dog, parent)
            this.bark(dog, 'bark.take', 800)
            await this.toss('petal', this.mouthOf(dog), this.basketOf(parent), 800, 40, dog)
            parent.reads++
            this.drawDog(parent)
            this.hop(parent, 500, 1, 5).catch(() => {})
          }
          return
        }
        await this.walk(dog, { ...this.isl.spots.door, key: 'front' })
        const door = this.isl.house.doorTop
        for (const color of [C.pink, C.yellow, '#ffffff']) await this.toss('flower', this.mouthOf(dog), [door[0] - 4, door[1] + 20], 450, 24, dog, color)
        if (item.reply) this.chat('ai', item.reply)
        if (item.status === 'ok') {
          this.rainbow().catch(() => {})
          this.heart(door[0], door[1]).catch(() => {})
          await this.happy(dog, 'bark.done')
        } else {
          this.bark(dog, 'bark.stop', 900)
        }
      }
      async planJob(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        if (!this.isLead(item.actor)) { await this.say(dog, fmt('board') + ' ✎', 700); return }
        await this.walk(dog, { ...this.isl.spots.board, key: 'board' })
        this.setPose(dog, 'sniff')
        this.plan(item.todos)
        const lines = this.isl.board.lines
        const todos = item.todos ?? []
        lines.forEach((line, i) => line.setAttribute('width', i < todos.length ? 18 + ((i * 7) % 14) : 0))
        this.lit(this.isl.board.g, 1200)
        this.spout().catch(() => {})
        await this.wait(1000, dog)
        this.setPose(dog, '')
      }
      spawn(child, item, say) {
        const parent = this.dogs.get(item.parent)
        this.enqueue(child, async () => {
          child.asleep = false
          this.setHidden(child, false)
          child.reads = 0
          this.clear(child)
          this.place(child, { ...this.isl.spots.spawn, key: 'spawn' })
          this.doing(child, say)
          const showParent = parent && !parent.hidden && !this.reduced
          if (showParent && !child.rush) {
            child.alpha = 0
            this.drawDog(child)
            await this.toss('fluff', this.mouthOf(parent), [child.x, child.y - 10], 1300, 40, child)
          }
          this.poof(child.x, child.y - 14)
          child.alpha = 1
          this.drawDog(child)
          await this.hop(child, 600, 2, 7)
          if (showParent) {
            parent.carry = 'bundle'
            this.drawDog(parent)
            await this.wait(300, child)
            parent.carry = null
            this.drawDog(parent)
            await this.toss('bundle', this.mouthOf(parent), [child.x, child.y - 30], 700, 40, child)
            child.reads = 1
            this.bark(child, 'bark.catch', 800)
            await this.hop(child, 400, 1, 5)
          }
        })
      }
      holdPose(dog, item) {
        const action = item.action
        if (action === 'search' || action === 'read' || action === 'write' || action === 'board') this.setPose(dog, 'sniff')
        else if (action === 'run') { dog.face = -1; this.setPose(dog, 'push') }
        else if (action === 'web-search' || action === 'web-fetch') { dog.face = 1; this.setPose(dog, 'sit') }
        else if (action === 'plug') this.setPose(dog, 'sit')
        else if (action === 'ask') { dog.carry = 'flower'; this.setPose(dog, 'sit'); this.sign(dog, fmt('bark.question')) }
      }
      async callStart(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        dog.call = item.call
        if (item.think != null) await this.askWhale(dog, item.think)
        else this.maybeSeed(dog)
        await this.walk(dog, this.spotFor(item))
        this.holdPose(dog, item)
        const station = this.station(item.station)
        switch (item.action) {
          case 'search': {
            const bed = this.bedOf(item.station)
            this.bark(dog, 'bark.dig', 900)
            if (bed) { this.wiggle(bed.body); this.petals(bed, 5) }
            await this.wait(900, dog)
            break
          }
          case 'run':
            this.running++
            this.windmill()
            break
          case 'web-search':
          case 'web-fetch':
            await this.boatTrip(DOCK, this.buoyPoint(item.station), null, dog)
            break
          case 'plug':
            if (station.place === 'cloud') {
              this.bark(dog, 'bark.whistle', 700)
              const near = [dog.x + 16, dog.y - 60]
              await this.gullTrip(this.isl.islet.home, near, false, dog)
              await this.gullTrip(near, this.isl.islet.home, true, dog)
              this.isl.islet.light.setAttribute('opacity', 1)
            } else {
              await this.vinePulse()
              this.isl.shed.glow.setAttribute('opacity', 0.85)
            }
            this.bark(dog, 'bark.plugged', 700)
            break
          case 'dispatch':
            this.bark(dog, 'bark.help', 900)
            break
          case 'other':
            this.bark(dog, 'bark.tool', 700)
            break
          default:
            break
        }
        this.lit(this.slotEl(item.station))
        await this.wait(400, dog)
      }
      async callEnd(dog, item, say) {
        const matched = dog.call === item.call
        dog.call = null
        if (item.action === 'run' && this.running > 0) { this.running--; this.windmill() }
        this.doing(dog, say)
        const web = item.action === 'web-fetch' || item.action === 'web-search'
        const cloud = item.action === 'plug' && this.station(item.station).place === 'cloud'
        if (item.status === 'failed') {
          if (web && matched) {
            await this.boatTrip(this.buoyPoint(item.station), DOCK, 'boot', dog)
            await this.toss('boot', [DOCK[0] - 10, DOCK[1] - 20], this.mouthOf(dog), 600, 40, dog)
          }
          this.clear(dog)
          if (item.action === 'run') {
            this.puffs(this.isl.millTop[0], this.isl.millTop[1] + 10, '#5b5650', 4, 40)
            this.bark(dog, 'bark.cough', 1000)
          } else {
            this.bark(dog, web ? 'bark.boot' : 'bark.ugh', 1000)
          }
          await this.sad(dog)
          return
        }
        if (item.status === 'stopped') {
          this.clear(dog)
          await this.say(dog, fmt('bark.stop'), 700)
          return
        }
        if (web && matched) {
          await this.boatTrip(this.buoyPoint(item.station), DOCK, 'envelope', dog)
          await this.toss('envelope', [DOCK[0] - 10, DOCK[1] - 20], this.basketOf(dog), 600, 40, dog)
        }
        if (cloud && matched) {
          await this.gullTrip(this.isl.islet.home, [dog.x + 16, dog.y - 60], true, dog)
          this.setPose(dog, 'gaze')
          await this.toss('letter', [dog.x + 16, dog.y - 60], this.mouthOf(dog), 450, 14, dog)
          this.setPose(dog, '')
        }
        this.clear(dog)
        if (item.action === 'read' || item.action === 'web-fetch') {
          dog.reads++
          this.drawDog(dog)
          if (item.action === 'read' && matched) await this.wag(dog)
        }
        if (item.action === 'write') {
          const bed = this.bedOf(item.station)
          if (bed) await this.grow(bed)
          this.bark(dog, 'bark.stamp', 700)
          this.lit(this.slotEl(item.station), 1200)
        } else if (item.action === 'run' && matched) {
          await this.hop(dog, 500, 1, 5)
        } else if ((item.action === 'web-fetch' || cloud) && matched) {
          await this.happy(dog, 'bark.caught')
        } else if (item.action === 'search' && matched) {
          this.bark(dog, 'bark.found', 700)
          await this.wait(300, dog)
        }
      }
      async message(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        await this.askWhale(dog, item.think)
        let target = null
        for (const row of this.actorRows.values()) {
          if (row.id === item.to || row.name === item.to) target = this.dogs.get(row.id)
        }
        if (!target && !this.isLead(dog.id)) target = this.dogs.get(this.actorRows.get(dog.id)?.parent)
        const to = target && !target.hidden ? this.basketOf(target) : [this.isl.spots.wait.x, this.isl.spots.wait.y - 30]
        await this.toss('petal', this.mouthOf(dog), to, 900, 60, dog)
        if (target && !target.hidden && item.carry) this.say(target, clipText(item.carry, 12), 1000).catch(() => {})
      }
      async waitJob(dog, item, say) {
        this.clear(dog)
        this.doing(dog, fmt('waitingNow'))
        await this.askWhale(dog, item.think)
        await this.walk(dog, { ...this.isl.spots.wait, key: 'wait' })
        dog.dozing = true
        this.setPose(dog, 'sit')
      }
      async approvalAsk(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        this.hooks.onStory(say)
        dog.carry = 'flower'
        await this.walk(dog, { ...this.isl.spots.door, key: 'front' })
        dog.carry = 'flower'
        this.setPose(dog, 'beg')
        this.sign(dog, fmt('bark.ask'))
        this.isl.house.glow.setAttribute('opacity', 0.6)
      }
      async approvalDone(dog, item, say) {
        this.sign(dog, '')
        dog.carry = null
        this.isl.house.glow.setAttribute('opacity', 0)
        this.doing(dog, say)
        if (/allow|approve|accept/i.test(item.outcome)) {
          const door = this.isl.house.doorTop
          this.heart(door[0], door[1]).catch(() => {})
          await this.happy(dog, 'bark.thanks')
        } else {
          this.bark(dog, 'bark.fine', 900)
          await this.shrug(dog)
        }
      }
      async compact(dog, say) {
        this.clear(dog)
        this.doing(dog, say)
        await this.walk(dog, { ...this.isl.spots.compost, key: 'compost' })
        this.bark(dog, 'bark.squish', 900)
        const top = this.isl.compost.top
        const n = Math.max(2, Math.min(5, dog.reads))
        for (let i = 0; i < n; i++) {
          if (dog.reads > 1) dog.reads--
          this.drawDog(dog)
          await this.toss('leaf', this.basketOf(dog), [top[0] + (Math.random() - 0.5) * 20, top[1] + 4], 420, 25, dog, ['#7aa04a', '#f3c94a', '#8db35a'][i % 3])
        }
        dog.reads = 0
        this.drawDog(dog)
        this.puffs(top[0], top[1] - 4, '#ffffff', 3, 30)
        await this.wait(500, dog)
      }
      async deliver(dog, item, say) {
        this.clear(dog)
        this.doing(dog, say)
        await this.walk(dog, { ...this.isl.spots.door, key: 'front' })
        const door = this.isl.house.doorTop
        await this.toss('flower', this.mouthOf(dog), [door[0] - 4, door[1] + 20], 500, 24, dog, C.yellow)
        this.chat('ai', (item.files ?? []).join(' · '))
        this.lit(this.isl.house.g)
      }
      async sleep(dog) {
        this.clear(dog)
        const index = [...this.dogs.values()].filter((other) => other.asleep).length
        if (index < SLEEP.length) await this.walk(dog, { x: SLEEP[index][0], y: SLEEP[index][1], face: 1, key: 'sleep' })
        this.layDown(dog, index)
        this.updateSleepers()
      }
    }

    // -------------------------------------------------------- round summary

    function roundOf(data) {
      const items = data?.items ?? []
      const leadId = data?.actors?.find((row) => row.role === 'lead')?.id ?? data?.root
      let start = -1
      for (let index = items.length - 1; index >= 0; index--) {
        if (items[index].type === 'task.open' && items[index].actor === leadId) { start = index; break }
      }
      const round = start >= 0 ? items.slice(start) : items
      const reached = new Set()
      if (start >= 0) reached.add('open')
      const stats = { helpers: 0, folders: new Set(), web: 0, runs: 0, plugs: 0, fails: 0, asks: 0 }
      for (const item of round) {
        if (item.type === 'plan') reached.add('plan')
        if (item.type === 'actor.spawn') { reached.add('split'); stats.helpers++ }
        if (item.type === 'call.start' && item.action !== 'dispatch') reached.add('work')
        if (item.type === 'task.end' && item.actor === leadId) reached.add('done')
        if (item.type === 'approval.ask') stats.asks++
        if (item.type !== 'call.end') continue
        if (item.status === 'failed') stats.fails++
        if (item.action === 'read' || item.action === 'write' || item.action === 'search') stats.folders.add(item.station)
        if (item.action === 'web-search' || item.action === 'web-fetch') stats.web++
        if (item.action === 'run') stats.runs++
        if (item.action === 'plug') stats.plugs++
      }
      return { reached, stats: { ...stats, folders: stats.folders.size }, hasRound: start >= 0 }
    }

    // -------------------------------------------------------------- styles

    const CSS = `
.pw { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0; color: var(--dsw-alias-label-primary); font: 14px/1.5 "Microsoft YaHei UI", system-ui, sans-serif; }
.pw * { box-sizing: border-box; }
.pw [hidden] { display: none !important; }
.pw button { color: inherit; font: inherit; cursor: pointer; }
.pw button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 3px; }
.pw-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.pw-identity { min-width: 0; flex: 1; }
.pw-identity h2 { margin: 0; font-size: 16px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pw-identity span { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.pw-chip { font-size: 11px; padding: 2px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; color: var(--dsw-alias-label-secondary); white-space: nowrap; background: transparent; }
.pw-chip[data-live=true] { color: var(--dsw-alias-state-success-primary); border-color: currentColor; }
.pw-chip[aria-pressed=true] { background: #ffcf3f; color: #3d3a4f; border-color: #3d3a4f; }
.pw-close { border: 1px solid var(--dsw-alias-border-l2); background: transparent; border-radius: 8px; padding: 2px 9px; font-size: 12px; }
.pw-story { padding: 8px 14px; border-bottom: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2); display: grid; gap: 4px; }
.pw-phases { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; font-size: 11px; }
.pw-phases li { padding: 0 9px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-secondary) 18%, transparent); color: var(--dsw-alias-label-secondary); }
.pw-phases li[data-state=done] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 22%, transparent); color: var(--dsw-alias-state-success-primary); }
.pw-phases li[data-state=now] { background: #ff6b6b; color: #fff; }
.pw-say { margin: 0; font-size: 15px; font-weight: 650; min-height: 1.5em; overflow-wrap: anywhere; }
.pw-stats { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.pw-stats b { color: var(--dsw-alias-state-error-primary); font-weight: 600; }
.pw-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 28%); grid-template-rows: minmax(0, 1fr); flex: 1; min-height: 0; }
.pw-world { min-width: 0; min-height: 0; overflow: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.pw-tools { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.pw-stage-wrap { position: relative; width: 100%; aspect-ratio: 1280 / 800; overflow: hidden; border-radius: 12px; flex: none; background: #4a9f95; }
.pw-stage { position: absolute; inset: 0; overflow: hidden; }
.pw-ledger { border-left: 1px solid var(--dsw-alias-border-l1); padding: 9px 12px; min-width: 0; display: flex; flex-direction: column; min-height: 0; }
.pw-ledger h3 { margin: 0; font-size: 13px; font-weight: 650; }
.pw-ledger > p { margin: 0 0 6px; font-size: 11px; color: var(--dsw-alias-label-secondary); padding-bottom: 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.pw-inspect { background: var(--dsw-alias-bg-layer-2); border-radius: 8px; margin-bottom: 8px; padding: 6px 9px; font-size: 12px; overflow-wrap: anywhere; }
.pw-inspect b { font-size: 13px; }
.pw-inspect p { margin: 1px 0; color: var(--dsw-alias-label-secondary); }
.pw-events { list-style: none; margin: 0; padding: 0; overflow: auto; flex: 1; min-height: 0; }
.pw-events li { border-bottom: 1px solid var(--dsw-alias-border-l1); }
.pw-note { width: 100%; display: block; text-align: left; border: 0; background: transparent; padding: 5px 2px; font-size: 12px; overflow-wrap: anywhere; }
.pw-note:hover { background: var(--dsw-alias-bg-layer-2); }
.pw-note time { color: var(--dsw-alias-label-secondary); margin-right: 5px; font: 600 10px "Courier New", monospace; }
.pw-who { display: inline-block; font-size: 10px; font-weight: 700; padding: 0 5px; border-radius: 5px; color: #fff; margin-right: 5px; }
.pw-events li[data-status=failed] .pw-note { color: var(--dsw-alias-state-error-primary); }
.pw-raw { margin: 0 0 6px; padding: 5px 7px; border-radius: 6px; background: var(--dsw-alias-bg-layer-2); font: 11px/1.45 Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 180px; overflow: auto; }
.pw-empty { color: var(--dsw-alias-label-secondary); font-size: 12px; padding: 8px 0; }
.pw-dex { position: absolute; z-index: 5; right: 12px; top: 12px; width: min(560px, calc(100% - 24px)); max-height: calc(100% - 24px); overflow: auto; background: #fffaf2; color: #2c2936; border: 3px solid #3d3a4f; border-radius: 14px; padding: 12px 14px; box-shadow: 0 6px 0 #3d3a4f; }
.pw-dex h3 { margin: 0 0 6px; font-size: 14px; }
.pw-dex table { border-collapse: collapse; width: 100%; font-size: 12px; }
.pw-dex td { padding: 3px 6px; border-bottom: 1px solid #e0d7c8; vertical-align: top; }
.pw-dex td:last-child { font: 11px Consolas, monospace; color: #6e687c; }
.pw-dex button { margin-top: 8px; border: 2px solid #3d3a4f; background: #ffcf3f; border-radius: 10px; font-weight: 700; padding: 2px 12px; color: #3d3a4f; }
.pw-page button { color: inherit; font: inherit; cursor: pointer; }
.pw-page { color: var(--dsw-alias-label-primary); flex: 1; min-height: 0; display: flex; gap: 12px; padding: 12px; padding-top: calc(var(--dsh-frame-top-clearance, 0px) + 12px); }
.pw-page-list { width: 250px; flex: none; display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.pw-page-list header { padding: 9px 11px; font-size: 12px; font-weight: 650; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.pw-page-list ul { list-style: none; margin: 0; padding: 5px; overflow: auto; flex: 1; min-height: 0; }
.pw-page-list button { width: 100%; text-align: left; border: 0; background: transparent; border-radius: 7px; padding: 6px 8px; display: block; }
.pw-page-list button:hover { background: var(--dsw-alias-bg-layer-2); }
.pw-page-list button[aria-pressed=true] { background: var(--dsw-alias-bg-layer-2); box-shadow: inset 2px 0 var(--dsw-alias-brand-primary); }
.pw-page-list button span { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pw-page-list button b { display: block; font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pw-page-main { position: relative; flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); overflow: hidden; }
.pw-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); margin-right: 4px; vertical-align: 1px; }
@media (max-width: 760px) {
  .pw-layout { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(160px, 1fr); }
  .pw-world { overflow: visible; }
  .pw-ledger { border-left: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
  .pw-page-list { display: none; }
}

/* ---- stage: island garden (its own palette, like a picture book) */
.pws-svg { display: block; width: 100%; height: 100%; font-family: "Microsoft YaHei UI", system-ui, sans-serif; }
.pws-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: pws-sway var(--d, 4s) ease-in-out infinite alternate; animation-delay: var(--delay, 0s); }
@keyframes pws-sway { from { transform: rotate(calc(var(--a, 1.4deg) * -1)); } to { transform: rotate(var(--a, 1.4deg)); } }
.pws-foam { animation: pws-foam 9s linear infinite; }
@keyframes pws-foam { to { stroke-dashoffset: -160; } }
.pws-swirl { animation: pws-foam var(--d, 14s) linear infinite; }
.pws-glint { animation: pws-glint var(--d, 4s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
@keyframes pws-glint { 0%, 100% { opacity: 0; transform: translateX(-6px); } 50% { opacity: .9; transform: translateX(6px); } }
.pws-shimmer { animation: pws-shimmer var(--d, 3s) ease-in-out infinite alternate; }
@keyframes pws-shimmer { to { transform: translateX(3px) scaleY(.97); opacity: .6; } }
.pws-cloudshade { animation: pws-drift 52s linear infinite; animation-delay: var(--delay, 0s); }
@keyframes pws-drift { from { transform: translate(-500px, -140px); } to { transform: translate(1600px, 260px); } }
.pws-sails { transform-box: fill-box; transform-origin: 50% 50%; animation: pws-spin var(--spin, 10s) linear infinite; }
@keyframes pws-spin { to { transform: rotate(360deg); } }
.pws-steam { animation: pws-steam 3.6s ease-in-out infinite; animation-delay: var(--delay, 0s); }
@keyframes pws-steam { 0% { opacity: 0; transform: translateY(6px); } 40% { opacity: .8; } 100% { opacity: 0; transform: translateY(-16px); } }
.pws-zzz { animation: pws-zzz 3s ease-in-out infinite; animation-delay: var(--delay, 0s); }
@keyframes pws-zzz { 0% { opacity: 0; transform: translate(0, 4px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(8px, -14px); } }
.pws-breathe { transform-box: fill-box; transform-origin: 50% 100%; animation: pws-breathe 3s ease-in-out infinite; }
@keyframes pws-breathe { 50% { transform: scale(1.03, .96); } }
.pws-bob { animation: pws-bob 5s ease-in-out infinite; animation-delay: var(--delay, 0s); }
@keyframes pws-bob { 50% { transform: translateY(-4px); } }
.pws-place { font-weight: 700; paint-order: stroke; stroke: #2f6b62; stroke-width: 3px; stroke-opacity: .4; letter-spacing: .06em; pointer-events: none; }
.pws-count { font-weight: 700; fill: #2f5a22; paint-order: stroke; stroke: #f4f1dc; stroke-width: 3px; pointer-events: none; }
.pws-note { font-weight: 700; fill: #ffffff; paint-order: stroke; stroke: #2f6b62; stroke-width: 3px; }
.pws-busy .pws-signbox { stroke: #4f9a3c; stroke-width: 2.6; fill: #f1f7d6; }
.pws-err .pws-signbox { stroke: #c0392b; stroke-width: 2.4; stroke-dasharray: 4 3; }
.pws-lit .pws-signbox { stroke: #f0b400; stroke-width: 3.4; }
.pws-dog { cursor: pointer; outline: none; }
.pws-dog:focus-visible .pws-tag rect { stroke: #2c3a2e; stroke-width: 2; }
.pws-tag rect { fill: #fffdf6; opacity: .92; }
.pws-tag text { fill: #2c3a2e; }
.pws-flash .pws-tag rect { animation: pws-flash .5s 3; }
@keyframes pws-flash { 50% { fill: #e0974a; } }
.pws-bubble text { font-weight: 700; }
.pws-sign3 { transform-box: fill-box; transform-origin: 50% 100%; }
.pws-3d .pws-bubble { transform-box: fill-box; transform-origin: 50% 100%; }
.pws-3d .pws-signbox { transition: stroke .3s, fill .3s, stroke-width .3s; }
.pws-3d .pws-count, .pws-3d .pws-note { transform-box: fill-box; transform-origin: 50% 50%; }
.pws-ui { pointer-events: none; }
.pws-svg :is(.pws-words, .pws-wall, .pws-signpost, .pws-place, .pws-count, .pws-note, .pws-card, .pws-tag) { transition: fill-opacity .5s ease, stroke-opacity .5s ease; }
.pws-quiet :is(.pws-words, .pws-wall, .pws-signpost, .pws-place, .pws-count, .pws-note, .pws-card, .pws-tag) { fill-opacity: 0; stroke-opacity: 0; }
.pws-quiet .pws-signpost title { display: none; }
.pws-still :is(.pws-words, .pws-wall, .pws-signpost, .pws-place, .pws-count, .pws-note, .pws-card, .pws-tag) { transition: none; }
.pws-flows { opacity: 0; transition: opacity .3s; pointer-events: none; }
.pws-flows.pws-show { opacity: 1; }
.pws-flow { fill: none; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 12 9; animation: pws-flow 1s linear infinite; }
@keyframes pws-flow { to { stroke-dashoffset: -21; } }
.pws-flow-label { font: 800 15px "Microsoft YaHei UI", sans-serif; fill: #2c3a2e; paint-order: stroke; stroke: #fffdf6; stroke-width: 5px; text-anchor: middle; }
@media (prefers-reduced-motion: reduce) {
  .pw-stage *, .pw-stage *::before { animation: none !important; transition: none !important; }
}
`

    // -------------------------------------------------------------- components

    const DEX_COUNT = 23

    function HeadIcon() {
      return h('svg', { width: 34, height: 30, viewBox: '0 0 34 30', 'aria-hidden': 'true', style: { flex: 'none' } },
        h('path', { d: 'M5 13 L8 1 L15 8 Z', fill: '#c47a36' }),
        h('path', { d: 'M19 8 L26 1 L29 13 Z', fill: '#e0974a' }),
        h('circle', { cx: 17, cy: 17, r: 12, fill: '#e0974a' }),
        h('ellipse', { cx: 17, cy: 22, rx: 7.5, ry: 5.5, fill: '#f6ead6' }),
        h('circle', { cx: 12, cy: 15, r: 1.6, fill: '#2d2625' }),
        h('circle', { cx: 22, cy: 15, r: 1.6, fill: '#2d2625' }),
        h('ellipse', { cx: 17, cy: 19.5, rx: 2.2, ry: 1.6, fill: '#2d2625' }))
    }

    const PANEL_TOP = 'max(48px, var(--dsh-frame-top-clearance, 0px))'
    const WHO_COLORS = ['#de872f', '#a65a32', '#3a9aa0', '#8d6be8', '#5bbf6a', '#d77a12']

    function timeText(time) {
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return ''
      const clock = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      const today = new Date()
      const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      if (sameDay) return clock
      return date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) + ' ' + clock
    }

    // ------------------------------------------------------- 3D stage (v0.4)
    // The island as a real 3D model (stage3d.js + assets/island.glb, three.js).
    // Loaded the first time a workbench opens; the drawn island above stays as
    // the fallback when WebGL or the files are not available.
    let stage3d = null        // null: not tried yet · false: unavailable · { Stage3D, assets }
    let stage3dLoading = null
    function load3D() {
      if (stage3d !== null) return Promise.resolve(stage3d)
      if (!stage3dLoading) {
        const base = '/puppy-workflow/'
        const work = (async () => {
          const mod = await import(base + 'stage3d.js')
          if (!mod.webglAvailable()) throw new Error('WebGL 2 is not available')
          const assets = await mod.loadAssets(base)
          return { Stage3D: mod.createStage3D({ Stage, planAt, P, C, svgEl }), assets }
        })()
        const timeout = new Promise((resolve, reject) => setTimeout(() => reject(new Error('timed out')), 20000))
        stage3dLoading = Promise.race([work, timeout]).then(
          (ready) => (stage3d = ready),
          (error) => {
            console.warn('[puppy-workflow] 3D island unavailable, drawing the flat one:', error)
            return (stage3d = false)
          })
      }
      return stage3dLoading
    }

    function Workbench({ root, onClose }) {
      const t = useT()
      const { data, error, retry } = useWorkbenchData(root)
      const [selected, setSelected] = useState(null)
      const [noteId, setNoteId] = useState(null)
      const [flowsOn, setFlowsOn] = useState(false)
      const [wordsOn, setWordsOn] = useState(() => { try { return localStorage.getItem('puppy-workflow.words') !== 'off' } catch { return true } })
      const [dexOpen, setDexOpen] = useState(false)
      const [story, setStory] = useState('')
      const [captions, setCaptions] = useState({})
      const wrapRef = useRef(null)
      const stageRef = useRef(null)
      const sceneRef = useRef(null)
      const latest = useRef({})
      latest.current = { data, flowsOn, wordsOn, selected }
      const lang = localeVersion
      const [engine, setEngine] = useState(() => (stage3d === null ? 'wait' : stage3d ? '3d' : 'flat'))
      useEffect(() => {
        if (engine !== 'wait') return undefined
        let live = true
        load3D().then((ready) => { if (live) setEngine(ready ? '3d' : 'flat') })
        return () => { live = false }
      }, [engine])

      // the island's labels are drawn once, so a language change rebuilds it (restored quietly, no replay)
      useEffect(() => {
        if (engine === 'wait') return undefined
        const hooks = {
          onSelect: (id) => setSelected((prev) => (prev === id ? null : id)),
          onCaption: (id, text) => setCaptions((prev) => (prev[id] === text ? prev : { ...prev, [id]: text })),
          onStory: (text) => setStory(text),
        }
        let scene
        if (engine === '3d') {
          try {
            scene = new stage3d.Stage3D(stageRef.current, hooks, stage3d.assets)
          } catch (error) {
            console.warn('[puppy-workflow] 3D island failed to start, drawing the flat one:', error)
            stage3d = false
            setEngine('flat')
            return undefined
          }
        } else {
          scene = new Stage(stageRef.current, hooks)
        }
        sceneRef.current = scene
        const now = latest.current
        scene.showWords(now.wordsOn)
        if (now.data) scene.sync(now.data)
        scene.showFlows(now.flowsOn)
        scene.select(now.selected)
        return () => {
          scene.dispose()
          sceneRef.current = null
        }
      }, [lang, engine])

      useIsoLayout(() => {
        if (data && sceneRef.current) sceneRef.current.sync(data)
      }, [data])
      useEffect(() => { sceneRef.current?.showFlows(flowsOn) }, [flowsOn])
      useEffect(() => {
        sceneRef.current?.showWords(wordsOn)
        try { localStorage.setItem('puppy-workflow.words', wordsOn ? 'on' : 'off') } catch {}
      }, [wordsOn])
      useEffect(() => { sceneRef.current?.select(selected) }, [selected])

      const actors = data?.actors ?? []
      const items = data?.items ?? []
      const scene = sceneRef.current
      const ctx = scene && data ? scene.context() : null
      const colorOf = (id) => WHO_COLORS[Math.max(0, actors.findIndex((row) => row.id === id)) % WHO_COLORS.length]
      const round = roundOf(data)
      const lastSay = story || (ctx && items.length ? plainOf(items[items.length - 1], ctx) : '')
      const ledger = items.slice(-60).reverse()
      const inspect = selected ? actors.find((row) => row.id === selected) : null
      const dog = inspect ? scene?.dogs.get(inspect.id) : null
      const phases = ['open', 'plan', 'split', 'work', 'done']
      const nowPhase = [...phases].reverse().find((phase) => round.reached.has(phase))
      const stats = round.stats

      return h(
        'div',
        { className: 'pw' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'pw-head' },
          h(HeadIcon),
          h('div', { className: 'pw-identity' },
            h('h2', null, data?.title || t('title')),
            h('span', null, data ? t('subtitle') : t('loading'))),
          actors.some((row) => row.state === 'working')
            ? h('span', { className: 'pw-chip', 'data-live': 'true' }, t('live'))
            : null,
          error && data
            ? h('button', { type: 'button', className: 'pw-chip', onClick: retry, title: t('retry') }, t('reconnect'))
            : null,
          onClose ? h('button', { type: 'button', className: 'pw-close', onClick: onClose }, t('close')) : null,
        ),
        h(
          'div',
          { className: 'pw-story', 'aria-live': 'polite' },
          h('ol', { className: 'pw-phases', 'aria-label': 'phases' }, phases.map((phase) =>
            h('li', {
              key: phase,
              'data-state': !round.hasRound ? '' : phase === nowPhase ? 'now' : round.reached.has(phase) ? 'done' : '',
            }, t('phase.' + phase)))),
          h('p', { className: 'pw-say' }, lastSay || (data ? t('empty') : t('loading'))),
          h('div', { className: 'pw-stats' },
            h('span', null, t('stat.helpers', { n: stats.helpers })),
            h('span', null, t('stat.folders', { n: stats.folders })),
            h('span', null, t('stat.web', { n: stats.web })),
            h('span', null, t('stat.runs', { n: stats.runs })),
            h('span', null, t('stat.plugs', { n: stats.plugs })),
            stats.asks ? h('span', null, t('stat.asks', { n: stats.asks })) : null,
            stats.fails ? h('b', null, t('stat.fails', { n: stats.fails })) : null),
        ),
        h(
          'div',
          { className: 'pw-layout' },
          h(
            'section',
            { className: 'pw-world', 'aria-label': t('panel'), style: { position: 'relative' } },
            h('div', { className: 'pw-tools' },
              h('button', { type: 'button', className: 'pw-chip', 'aria-pressed': wordsOn, onClick: () => setWordsOn((on) => !on), title: t('wordsHint') }, t('words')),
              h('button', { type: 'button', className: 'pw-chip', 'aria-pressed': flowsOn, onClick: () => setFlowsOn((on) => !on), title: t('flowsHint') }, t('flows')),
              h('button', { type: 'button', className: 'pw-chip', 'aria-pressed': dexOpen, onClick: () => setDexOpen((on) => !on) }, t('dex')),
              flowsOn ? h('span', null, t('flowsHint')) : null),
            h('div', { className: 'pw-stage-wrap', ref: wrapRef }, h('div', { className: 'pw-stage', ref: stageRef })),
            dexOpen
              ? h('div', { className: 'pw-dex', role: 'dialog', 'aria-label': t('dexTitle') },
                  h('h3', null, t('dexTitle')),
                  h('table', null, h('tbody', null, Array.from({ length: DEX_COUNT }, (_, index) => {
                    const cells = String(t('dex.' + (index + 1))).split('|')
                    return h('tr', { key: index }, cells.map((cell, at) => h('td', { key: at }, cell)))
                  }))),
                  h('button', { type: 'button', onClick: () => setDexOpen(false) }, t('dexClose')))
              : null,
          ),
          h(
            'aside',
            { className: 'pw-ledger', 'aria-label': t('ledger') },
            h('h3', null, t('ledger')),
            h('p', null, t('ledgerHint')),
            inspect
              ? h('div', { className: 'pw-inspect', 'aria-live': 'polite' },
                  h('b', null, ctx ? ctx.who(inspect.id) : ''),
                  h('p', null, inspect.role === 'lead' ? t('roleLead') : t('roleHelper')),
                  inspect.name ? h('p', null, t('taskLabel') + inspect.name) : null,
                  h('p', null, t('nowLabel') + (captions[inspect.id] || t('idle'))),
                  dog ? h('p', null, t('packLabel', { n: dog.reads })) : null,
                  dog ? h('p', null, t('toolsLabel', { n: dog.tools })) : null)
              : null,
            error && !data
              ? h('div', { className: 'pw-empty' },
                  t('failed'),
                  h('button', { type: 'button', className: 'pw-close', onClick: retry, style: { marginLeft: 8 } }, t('retry')))
              : null,
            !data && !error ? h('div', { className: 'pw-empty' }, t('loading')) : null,
            data && !ledger.length ? h('div', { className: 'pw-empty' }, t('empty')) : null,
            h('ol', { className: 'pw-events' }, ctx ? ledger.map((item) =>
              h(
                'li',
                { key: item.id, 'data-status': item.status },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'pw-note',
                    'aria-expanded': noteId === item.id,
                    onClick: () => {
                      setNoteId((prev) => (prev === item.id ? null : item.id))
                      scene?.flash(item)
                    },
                  },
                  h('time', { dateTime: new Date(item.time).toISOString() }, timeText(item.time)),
                  item.actor ? h('span', { className: 'pw-who', style: { background: colorOf(item.actor) } }, ctx.who(item.actor)) : null,
                  plainOf(item, ctx),
                ),
                noteId === item.id ? h('pre', { className: 'pw-raw', 'aria-label': t('raw') }, rawOf(item)) : null,
              )) : null),
          ),
        ),
      )
    }

    // Overlay state shared by the composer button and the overlay slot.
    const overlay = { open: false, session: null }
    const overlayListeners = new Set()
    const updateOverlay = (patch) => {
      Object.assign(overlay, patch)
      for (const listener of overlayListeners) listener()
    }
    function useOverlay() {
      const [, render] = useState(0)
      useEffect(() => {
        const listener = () => render((value) => value + 1)
        overlayListeners.add(listener)
        return () => overlayListeners.delete(listener)
      }, [])
      return overlay
    }

    let launcher = null

    function closePanel() {
      updateOverlay({ open: false })
      launcher?.focus()
    }

    function Panel() {
      const current = useOverlay()
      const section = useRef(null)
      useEffect(() => {
        if (current.open) section.current?.focus()
      }, [current.open])
      useEffect(() => {
        if (!current.open) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') {
            closePanel()
            return
          }
          if (event.key !== 'Tab') return
          const root = section.current
          if (!root) return
          const focusable = [...root.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          if (!focusable.length) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [current.open])
      if (!current.open || !current.session) return null
      return h(
        React.Fragment,
        null,
        h('div', {
          'aria-hidden': true,
          style: { position: 'fixed', zIndex: 90, inset: 'var(--dsh-frame-top-clearance, 0px) 0 0', pointerEvents: 'auto' },
          onClick: closePanel,
        }),
        h(
          'section',
          {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': tr('panel'),
            tabIndex: -1,
            ref: section,
            style: {
              position: 'fixed',
              zIndex: 90,
              inset: PANEL_TOP + ' 16px 24px auto',
              width: 'min(1180px, calc(100vw - 32px))',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              pointerEvents: 'auto',
              borderRadius: 16,
              border: '1px solid var(--dsw-alias-border-l2)',
              background: 'var(--dsw-alias-bg-layer-1)',
              boxShadow: '0 20px 70px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent)',
            },
          },
          h(Workbench, { key: current.session, root: current.session, onClose: closePanel }),
        ),
      )
    }

    function Launcher({ sessionId }) {
      const current = useOverlay()
      const ref = useRef(null)
      const open = current.open && current.session === sessionId
      useEffect(() => {
        if (overlay.open && sessionId && overlay.session !== sessionId) updateOverlay({ session: sessionId })
      }, [sessionId])
      return h(
        'button',
        {
          type: 'button',
          'aria-pressed': open,
          disabled: !sessionId,
          ref,
          title: tr('openFull'),
          'aria-label': tr('openFull'),
          style: {
            border: '1px solid currentColor',
            background: 'transparent',
            borderRadius: 8,
            padding: '2px 8px',
            font: 'inherit',
            fontSize: 12,
            color: open ? 'var(--dsw-alias-brand-primary, #2f62d8)' : 'inherit',
            cursor: sessionId ? 'pointer' : 'default',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          },
          onClick: () => {
            launcher = ref.current
            if (open) closePanel()
            else updateOverlay({ open: true, session: sessionId })
          },
        },
        h(PanelIcon, { size: 14 }),
        tr('open'),
      )
    }

    function PanelIcon({ size }) {
      const edge = typeof size === 'number' ? size : 18
      return h(
        'svg',
        { width: edge, height: edge, viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false', style: { display: 'block' } },
        h('path', { d: 'M5 9h5v10H5z', fill: 'currentColor', opacity: 0.55 }),
        h('path', { d: 'M22 9h5v10h-5z', fill: 'currentColor', opacity: 0.55 }),
        h('path', { d: 'M8 7h16v16H8z', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' }),
        h('rect', { x: 12, y: 12, width: 2.4, height: 3, fill: 'currentColor' }),
        h('rect', { x: 18, y: 12, width: 2.4, height: 3, fill: 'currentColor' }),
        h('rect', { x: 15, y: 18, width: 3, height: 2, fill: 'currentColor' }),
      )
    }

    function Page() {
      const t = useT()
      const [list, setList] = useState(null)
      const [failed, setFailed] = useState(false)
      const [selected, setSelected] = useState(null)
      const [attempt, setAttempt] = useState(0)

      useEffect(() => {
        let stopped = false
        let timer = 0
        const load = () => {
          getJson('/puppy-workflow/sessions')
            .then((data) => {
              if (stopped) return
              const sessions = data.sessions ?? []
              setList(sessions)
              setFailed(false)
              setSelected((prev) => prev ?? sessions.find((row) => row.live)?.id ?? sessions[0]?.id ?? null)
            })
            .catch(() => { if (!stopped) setFailed(true) })
        }
        load()
        // The list is a live snapshot: a session that starts while the page is
        // open appears without a reload.
        timer = window.setInterval(() => { if (!document.hidden) load() }, 10000)
        return () => {
          stopped = true
          window.clearInterval(timer)
        }
      }, [attempt])

      return h(
        'div',
        { className: 'pw-page' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'pw-page-list' },
          h('header', null, t('sessions')),
          failed
            ? h('div', { className: 'pw-empty', style: { padding: 10 } },
                t('failed'),
                h('button', {
                  type: 'button',
                  className: 'pw-close',
                  style: { marginLeft: 8 },
                  onClick: () => setAttempt((value) => value + 1),
                }, t('retry')))
            : null,
          !list && !failed ? h('div', { className: 'pw-empty', style: { padding: 10 } }, t('loading')) : null,
          list && !list.length ? h('div', { className: 'pw-empty', style: { padding: 10 } }, t('noSessions')) : null,
          h('ul', null, (list ?? []).map((row) =>
            h('li', { key: row.id },
              h('button', {
                type: 'button',
                'aria-pressed': selected === row.id,
                onClick: () => setSelected(row.id),
              },
                h('b', null,
                  row.live ? h('span', { className: 'pw-dot', 'aria-label': t('live') }) : null,
                  row.title || lastSegment(row.cwd) || row.id.slice(0, 12)),
                h('span', null, row.cwd || ''),
              )))),
        ),
        h(
          'div',
          { className: 'pw-page-main' },
          selected
            ? h(Workbench, { key: selected, root: selected })
            : h('div', { className: 'pw-empty', style: { padding: 16 } },
                failed ? t('failed') : list ? t('noSessions') : t('loading')),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        translate = ctx.locale.bind(NS)
        for (const [id, dict] of Object.entries(DICTS)) ctx.effect(() => ctx.locale.register(NS, id, dict))
        ctx.effect(() => ctx.locale.subscribe(() => {
          localeVersion++
          for (const listener of localeListeners) listener()
        }))

        ctx.slots.inject('conversation.input.right', () =>
          ctx.slots.register(
            { name: 'conversation.input.right', id: 'puppy-workflow', order: 41, label: () => tr('open') },
            Launcher,
          ))
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register({ name: 'shell.overlay', id: 'puppy-workflow', order: 410 }, Panel))
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'puppy-workflow', order: 30, label: () => tr('panel') },
            PanelIcon,
          ))
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'puppy-workflow' }, Page))
      },
    }
  },
})
