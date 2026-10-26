import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import moreDetailsCss from './panel/side-chat.css'
import { selectionReferenceSource } from './parent-composer/add-to-conversation.js'
import { mountParentConversationAnnotations } from './parent-composer/ParentConversationAnnotations.js'
import { moreDetailsConversationReferenceSource } from './parent-composer/referenced-conversation.js'
import { createWebChatReferenceSource } from './parent-composer/webchat-reference.js'
import webChatReferenceCss from './parent-composer/webchat-reference.css'
import { WebChatController } from './webchat/controller.js'
import { DeepSeekGuest, webChatBrowserBridge } from './webchat/guest.js'
import { WebChatPanel, WebChatLauncher, WebChatRestore, type WebChatPreferences } from './webchat/WebChatPanel.js'
import webChatCss from './webchat/webchat.css'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { mountMoreDetailsSettings } from './dsh/MoreDetailsSettings.js'
import { SideChatController } from './side-chat-controller.js'
import { mountSideChatRemote } from './dsh/remote-adapter.js'
import { SideChatOverlay } from './dsh/SideChatOverlay.js'
import { DshSideChatSessions } from './dsh/sessions-adapter.js'
import type { DshClientContext } from './dsh/context.js'

export const name = 'more-details-client'
export const inject = ['configForms', 'workspaces', 'conversation', 'inputTriggers', 'locale', 'modelDirectories', 'remote', 'sessions', 'slots', 'uiConversation', 'uiWorkspace']

export async function apply(ctx: Context): Promise<void> {
  const cleanups: Array<() => void | Promise<void>> = []
  let disposed = false
  let cleanupOperation: Promise<void> | undefined
  const cleanup = (): Promise<void> => {
    disposed = true
    cleanupOperation ??= (async () => {
      for (const dispose of cleanups.splice(0).reverse()) {
        try { await dispose() } catch (error) { console.warn('[dsh-more-details] Cleanup failed', error) }
      }
    })()
    return cleanupOperation
  }
  ctx.effect(() => cleanup, 'dsh-more-details.clientLifecycle')
  try {
    const stylesheet = document.createElement('style')
    stylesheet.textContent = moreDetailsCss + webChatCss + webChatReferenceCss
    stylesheet.dataset.plugin = 'dsh-more-details'
    stylesheet.dataset['dshSideChat'] = 'styles'
    document.head.append(stylesheet)
    cleanups.push(() => { stylesheet.remove() })

    const clientCtx = ctx as unknown as DshClientContext
    const mounted = await mountSideChatRemote(clientCtx)
    if (disposed) { await mounted.dispose(); return }
    cleanups.push(mounted.dispose)
    cleanups.push(clientCtx.inputTriggers.registerSource(selectionReferenceSource))
    cleanups.push(clientCtx.inputTriggers.registerSource(moreDetailsConversationReferenceSource))
    const sessions = new DshSideChatSessions(clientCtx)
    cleanups.push(mountMoreDetailsSettings(ctx))
    const webChatAvailable = webChatBrowserBridge() !== undefined
    const guest = new DeepSeekGuest(mounted.loginStore)
    cleanups.push(() => guest.dispose())
    const details = new WebChatController(guest, mounted.prepareDetails, sessions, window.localStorage, mounted.saveWebChatReference,
      (zh, en) => ctx.locale.resolveText({ zh, en }))
    const openWebChatReference = webChatAvailable
      ? (reference: { readonly url: string }): void => { void details.openHistory(reference.url) }
      : undefined
    cleanups.push(clientCtx.inputTriggers.registerSource(createWebChatReferenceSource(openWebChatReference, ctx.locale)))
    cleanups.push(mountParentConversationAnnotations(clientCtx,
      sessionId => { sessions.removeConversationAnnotations(sessionId) }, openWebChatReference))
    guest.observe(page => details.observePage({ url: page.url, title: page.title }))
    cleanups.push(() => details.dispose())
    if (webChatAvailable) {
      const form = ctx.configForms.get<WebChatPreferences>('more-details')
      cleanups.push(clientCtx.slots.inject('shell.overlay', () => clientCtx.slots.register({
        name: 'shell.overlay', id: 'dsh-more-details-webchat', order: 91,
      }, () => createElement(WebChatPanel, { controller: details, guest, form, locale: ctx.locale }))))
      cleanups.push(clientCtx.slots.inject('sidebar.footer.action', () => clientCtx.slots.register({
        name: 'sidebar.footer.action', id: 'dsh-more-details-new-chat', order: 10,
      }, ({ wide }) => createElement(WebChatLauncher, { controller: details, locale: ctx.locale, wide }))))
      cleanups.push(clientCtx.slots.inject('sidebar.footer.action', () => clientCtx.slots.register({
        name: 'sidebar.footer.action', id: 'dsh-more-details-continue-chat', order: 11,
      }, ({ wide }) => createElement(WebChatRestore, { controller: details, locale: ctx.locale, wide }))))
    }
    const controller = new SideChatController(mounted.remote, sessions)
    cleanups.push(() => controller.dispose())
    cleanups.push(clientCtx.slots.inject('shell.overlay', () => clientCtx.slots.register({
      name: 'shell.overlay', id: 'dsh-more-details', order: 90,
    }, () => createElement(SideChatOverlay, { controller, sessions, details, webChatAvailable, locale: ctx.locale }))))
  } catch (error) {
    await cleanup()
    throw error
  }
}
