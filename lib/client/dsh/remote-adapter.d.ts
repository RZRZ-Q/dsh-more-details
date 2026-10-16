import type { SideChatRemote } from '../../shared/contracts.js';
import type { PrepareDetails } from './more-details-controller.js';
import type { DshClientContext } from './context.js';
import type { WebChatLoginStore } from '../../shared/webchat-login.js';
import type { SaveWebChatReference } from '../webchat/controller.js';
export declare function mountSideChatRemote(ctx: DshClientContext): Promise<{
    readonly prepareDetails: PrepareDetails;
    readonly remote: SideChatRemote;
    readonly loginStore: WebChatLoginStore;
    readonly saveWebChatReference: SaveWebChatReference;
    readonly dispose: () => Promise<void>;
}>;
