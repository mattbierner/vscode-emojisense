
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { Emoji, EmojiProvider } from './emoji';

export default class DecoratorProvider extends vscode.Disposable {

    private readonly disposables: vscode.Disposable[] = [];

    private readonly decorationType: vscode.TextEditorDecorationType;

    private activeEditor: vscode.TextEditor | undefined = undefined;
    private timeout: any;

    constructor(
        private readonly emojiProvider: EmojiProvider,
        private readonly config: Configuration,
    ) {
        super(() => this.dispose());
        this.decorationType = vscode.window.createTextEditorDecorationType({});

        this.activeEditor = vscode.window.activeTextEditor;
        this.setDecorators(this.activeEditor);

        vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.activeEditor = editor;
            if (editor) {
                this.triggerUpdateDecorations();
            }
        }, this, this.disposables);

        vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
            if (this.activeEditor && event.document === this.activeEditor.document) {
                this.triggerUpdateDecorations();
            }
        }, this, this.disposables);
    }

    public dispose() {
        let d: vscode.Disposable | undefined;
        while ((d = this.disposables.pop())) {
            d.dispose();
        }
    }

    private triggerUpdateDecorations(): void {
        if (this.timeout) {
            return;
        }
        this.timeout = setTimeout(() => {
            this.setDecorators(this.activeEditor);
            this.timeout = null;
        }, 300);
    }

    private setDecorators(activeEditor: vscode.TextEditor | undefined) {
        if (!activeEditor || !this.config.isInlineEnabled(activeEditor.document.languageId)) {
            return false;
        }

        const regEx = /:([\w\d_+-]+?):/g;
        const text = activeEditor.document.getText();
        let match;
        const d: vscode.DecorationOptions[] = [];
        while ((match = regEx.exec(text))) {
            const name = match[1];
            const emoji = this.emojiProvider.lookup(name);
            if (!emoji) {
                continue;
            }

            const startPos = activeEditor.document.positionAt(match.index + 1);
            const endPos = activeEditor.document.positionAt(match.index + match[0].length - 1);
            d.push({
                range: new vscode.Range(startPos, endPos),
                hoverMessage: this.hoverMessage(emoji),
                renderOptions: {
                    after: {
                        contentText: emoji.emoji,
                        margin: '0.2em',
                        color: 'rgba(255, 255, 255, 0.55)',
                    },
                },
            });
        }
        activeEditor.setDecorations(this.decorationType, d);
    }

    private hoverMessage(emoji: Emoji): string {
        const width = 160;
        const height = 160;
        const src = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}" xml:space="preserve">
     <text x="50%" y="50%" text-anchor="middle" alignment-baseline="central" font-size="120">${emoji.emoji}</text>
</svg>`;
        const dataUri = 'data:image/svg+xml;charset=UTF-8;base64,' + multibyteBtoa(src);
        return `![](${dataUri})`;
    }
}

/**
 * From https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa
 */
function multibyteBtoa(str: string): string {
    const encoder = new TextEncoder();
    let binary = '';
    const uint8array = encoder.encode(str);
    for (let i = 0; i < uint8array.length; i++) {
        binary += String.fromCharCode(uint8array[i]);
    }
    return btoa(binary);
}