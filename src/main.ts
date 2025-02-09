import * as atprotoApi from '@atproto/api'
import type { ProfileViewDetailed } from '@atproto/api/dist/client/types/app/bsky/actor/defs'

const isScriptNode = (node: Element): node is HTMLScriptElement => node.tagName === 'SCRIPT'
const cloneScriptNode = (node: HTMLScriptElement) => {
    const script = document.createElement('script')

    script.text = node.innerHTML

    Array.from(node.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value)
    })

    return script
}
const parseNodes = (node: Element) => {
    if (isScriptNode(node)) {
        node.parentNode?.replaceChild(cloneScriptNode(node), node)
    } else {
        Array.from(node.children).forEach((child) => {
            parseNodes(child)
        })
    }

    return node
}

type Context = Record<string, unknown> & {
    profile?: ProfileViewDetailed
}
declare global {
    interface Window {
        context: Context
    }
}

const handleContext = async (context: Context) => {
    window.context = {
        atprotoApi,
        ...context,
    }

    const publicAgent = new atprotoApi.Agent('https://public.api.bsky.app')

    window.context.publicAgent = publicAgent

    const pds = context.pds

    if (!pds || typeof pds !== 'string') {
        return
    }

    const agent = new atprotoApi.Agent(pds)

    window.context.agent = agent

    const getRecord = async (options: Omit<atprotoApi.ComAtprotoRepoGetRecord.QueryParams, 'repo'>) => {
        const { data } = await agent.com.atproto.repo.getRecord({
            repo: context.profile?.did || '',
            ...options,
        })

        return data
    }

    const getRecords = async (options: Omit<atprotoApi.ComAtprotoRepoListRecords.QueryParams, 'repo'>) => {
        const { data } = await agent.com.atproto.repo.listRecords({
            repo: context.profile?.did || '',
            ...options,
        })

        return data.records
    }

    window.context.getRecord = getRecord
    window.context.getRecords = getRecords

    if (!Array.isArray(context.contextItems)) {
        return
    }

    await Promise.all(
        context.contextItems.map(async (item) => {
            const collection = item.collection
            const data = item.rkey
                ? getRecord({ collection, rkey: item.rkey })
                : getRecords({ collection, limit: item.limit || 50 })

            window.context[item.name] = await data
        }),
    )
}

const handleContent = (content: string) => {
    const $content = document.querySelector<HTMLDivElement>('#content')

    if (!$content) {
        return
    }

    if (window.context.newlinesToLinebreaks) {
        $content.style.whiteSpaceCollapse = 'preserve-breaks'
    }

    $content.innerHTML = content

    Array.from($content.querySelectorAll('a')).forEach((a) => {
        if (/^#/.test(a.getAttribute('href') || '')) {
            return
        }

        a.setAttribute('target', '_blank')
    })

    parseNodes($content)
}

window.addEventListener('message', async (event) => {
    if (!event.data.action || event.data.action !== 'setContent') {
        return
    }

    if (event.data.payload?.context) {
        await handleContext(event.data.payload.context)
    }

    if (event.data.payload?.content) {
        handleContent(event.data.payload.content)
    }
})
