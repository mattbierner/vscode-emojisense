import { CompletionItem, TextDocument, Position, Range, CompletionItemKind, CompletionItemProvider, CancellationToken, ProviderResult } from 'vscode'


export interface Emoji {
    readonly name: string
    readonly emoji: string
}

export class EmojiProvider {
    private _emojiMap: Map<string, Emoji> | null = null;

    public get emojis(): Iterable<Emoji> {
        return this.emojiMap.values()
    }

    public lookup(name: string): Emoji | undefined {
        return this.emojiMap.get(name.toLowerCase())
    }

    private get emojiMap(): Map<string, Emoji> {
        if (!this._emojiMap) {
            const gemoji = require('gemoji')
            this._emojiMap = new Map<string, Emoji>()
            for (const key of Object.keys(gemoji.name)) {
                const entry = gemoji.name[key]
                for (const name of entry.names) {
                    if (!this._emojiMap.has(name)) {
                        this._emojiMap.set(name, {name, emoji: entry.emoji })
                    }
                }
            }
        }
        return this._emojiMap;
    }
}