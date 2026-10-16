import type { ConversationSelection } from '../../shared/contracts.js';
import type { Localize } from '../dsh/locale.js';
export interface SelectionActionsProps {
    readonly text: Localize;
    readonly selection: ConversationSelection;
    readonly touchInteraction?: boolean;
    readonly askDisabledReason?: string;
    readonly moreDetailsDisabledReason?: string;
    readonly annotationNumber?: number;
    /** Opens only the comment editor, used when an existing marker is clicked. */
    readonly annotationEditor?: {
        readonly initialComment?: string;
        readonly dialogLabel?: string;
    };
    readonly onAddToChat: (selection: ConversationSelection, comment?: string) => void;
    readonly onMoreDetails: (selection: ConversationSelection) => void;
    readonly onAskInSideChat: (selection: ConversationSelection) => void;
    readonly onAnnotationEditorChange?: (open: boolean) => void;
    /** Explicit destructive action offered only while editing a persisted annotation. */
    readonly onRemoveAnnotation?: () => void;
    readonly onDismiss: () => void;
}
export declare function calculateSelectionActionsPosition(rect: ConversationSelection['rect'], size: {
    readonly width: number;
    readonly height: number;
}, touch: boolean, viewport?: {
    readonly width: number;
    readonly height: number;
    readonly offsetLeft?: number;
    readonly offsetTop?: number;
}): {
    readonly left: number;
    readonly top: number;
};
export declare function SelectionActions({ text, selection, touchInteraction, askDisabledReason, moreDetailsDisabledReason, annotationNumber, annotationEditor, onAddToChat, onMoreDetails, onAskInSideChat, onAnnotationEditorChange, onRemoveAnnotation, onDismiss, }: SelectionActionsProps): import("react/jsx-runtime").JSX.Element;
