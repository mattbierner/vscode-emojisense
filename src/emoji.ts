import { gemoji } from 'gemoji';

export interface Emoji {
    readonly name: string;
    readonly emoji: string;
    readonly tags: string[];
    readonly description: string;
    readonly category: string;
}

export class EmojiProvider {
    private _emojiMap?: Map<string, Emoji>;
    private _emojis?: readonly Emoji[];

    public get emojis(): readonly Emoji[] {
        if (!this._emojis) {
            this._emojis = Array.from(this.emojiMap.values());
        }
        return this._emojis;
    }

    public lookup(name: string): Emoji | undefined {
        return this.emojiMap.get(name.toLowerCase());
    }

    private get emojiMap(): Map<string, Emoji> {
        if (!this._emojiMap) {
            this._emojiMap = new Map<string, Emoji>();
            for (const g of gemoji) {
                for (const name of g.names) {
                    if (!this._emojiMap.has(name)) {
                        this._emojiMap.set(name, { 
                            name, 
                            emoji: g.emoji,
                            tags: g.tags,
                            description: g.description,
                            category: g.category
                         });
                    }
                }
            }
        }
        return this._emojiMap;
    }
}
