import { CompletionItem, TextDocument, Position, Range, CompletionItemKind, CompletionItemProvider, CancellationToken, ProviderResult } from "vscode"


export interface Emoji {
    name: string
    emoji: string
    documentation: string;
}

export class EmojiProvider {
    private _emojis: Array<Emoji> | null = null;

    public get emojis(): Emoji[] {
        if (!this._emojis) {
            const gemoji = require('gemoji')
            const names = new Set<string>()
            this._emojis = []
            for (const key of Object.keys(gemoji.name)) {
                const entry  = gemoji.name[key]
                if (!names.has(entry.name)) {
                    names.add(entry.name)
                    this._emojis.push(entry)
                }
            }
        }
        return this._emojis;
    }
}