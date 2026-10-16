import { createElement } from 'react';
import moreDetailsCss from './panel/side-chat.css';
import { selectionReferenceSource } from './parent-composer/add-to-conversation.js';
import { mountParentConversationAnnotations } from './parent-composer/ParentConversationAnnotations.js';
import { moreDetailsConversationReferenceSource } from './parent-composer/referenced-conversation.js';
import { createWebChatReferenceSource } from './parent-composer/webchat-reference.js';
import webChatReferenceCss from './parent-composer/webchat-reference.css';
import { WebChatController } from './webchat/controller.js';
import { DeepSeekGuest } from './webchat/guest.js';
import { WebChatPanel } from './webchat/WebChatPanel.js';
import webChatCss from './webchat/webchat.css';
import { mountMoreDetailsSettings } from './dsh/MoreDetailsSettings.js';
import { SideChatController } from './side-chat-controller.js';
import { mountSideChatRemote } from './dsh/remote-adapter.js';
import { SideChatOverlay } from './dsh/SideChatOverlay.js';
import { DshSideChatSessions } from './dsh/sessions-adapter.js';
export const name = 'more-details-client';
export const inject = ['configForms', 'workspaces', 'conversation', 'inputTriggers', 'locale', 'modelDirectories', 'remote', 'sessions', 'slots', 'uiConversation', 'uiWorkspace'];
export async function apply(ctx) {
    const cleanups = [];
    let disposed = false;
    let cleanupOperation;
    const cleanup = () => {
        disposed = true;
        cleanupOperation ??= (async () => {
            for (const dispose of cleanups.splice(0).reverse()) {
                try {
                    await dispose();
                }
                catch (error) {
                    console.warn('[dsh-more-details] Cleanup failed', error);
                }
            }
        })();
        return cleanupOperation;
    };
    ctx.effect(() => cleanup, 'dsh-more-details.clientLifecycle');
    try {
        const stylesheet = document.createElement('style');
        stylesheet.textContent = moreDetailsCss + webChatCss + webChatReferenceCss;
        stylesheet.dataset.plugin = 'dsh-more-details';
        stylesheet.dataset['dshSideChat'] = 'styles';
        document.head.append(stylesheet);
        cleanups.push(() => { stylesheet.remove(); });
        const clientCtx = ctx;
        const mounted = await mountSideChatRemote(clientCtx);
        if (disposed) {
            await mounted.dispose();
            return;
        }
        cleanups.push(mounted.dispose);
        cleanups.push(clientCtx.inputTriggers.registerSource(selectionReferenceSource));
        cleanups.push(clientCtx.inputTriggers.registerSource(moreDetailsConversationReferenceSource));
        const sessions = new DshSideChatSessions(clientCtx);
        cleanups.push(mountMoreDetailsSettings(ctx));
        const guest = new DeepSeekGuest(mounted.loginStore);
        cleanups.push(() => guest.dispose());
        const details = new WebChatController(guest, mounted.prepareDetails, sessions, window.localStorage, mounted.saveWebChatReference);
        const openWebChatReference = (reference) => { void details.openHistory(reference.url); };
        cleanups.push(clientCtx.inputTriggers.registerSource(createWebChatReferenceSource(openWebChatReference)));
        cleanups.push(mountParentConversationAnnotations(clientCtx, sessionId => { sessions.removeConversationAnnotations(sessionId); }, openWebChatReference));
        guest.observe(page => details.observePage({ url: page.url, title: page.title }));
        cleanups.push(() => details.dispose());
        const form = ctx.configForms.get('more-details');
        cleanups.push(clientCtx.slots.inject('shell.overlay', () => clientCtx.slots.register({
            name: 'shell.overlay', id: 'dsh-more-details-webchat', order: 91,
        }, () => createElement(WebChatPanel, { controller: details, guest, form, locale: ctx.locale }))));
        cleanups.push(clientCtx.slots.inject('sidebar.footer.action', () => clientCtx.slots.register({
            name: 'sidebar.footer.action', id: 'dsh-more-details-new-chat', order: 10,
        }, ({ wide }) => createElement('button', {
            type: 'button', className: 'dsh-webchat-launcher', title: '新建 DeepSeek 网页聊天',
            'aria-label': '新建 Chat', onClick: () => { void details.newChat(); },
        }, wide ? '＋ 新建 Chat' : '＋'))));
        const controller = new SideChatController(mounted.remote, sessions);
        cleanups.push(() => controller.dispose());
        cleanups.push(clientCtx.slots.inject('shell.overlay', () => clientCtx.slots.register({
            name: 'shell.overlay', id: 'dsh-more-details', order: 90,
        }, () => createElement(SideChatOverlay, { controller, sessions, details, locale: ctx.locale }))));
    }
    catch (error) {
        await cleanup();
        throw error;
    }
}
