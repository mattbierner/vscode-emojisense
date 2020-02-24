export interface Emoji {
    readonly name: string;
    readonly emoji: string;
}

export class EmojiProvider {
    private _emojiMap?: Map<string, Emoji>;
    private _emojis?: ReadonlyArray<Emoji>;

    public get emojis(): ReadonlyArray<Emoji> {
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
            const gemoji = require('gemoji');
            this._emojiMap = new Map<string, Emoji>();
            for (const key of Object.keys(gemoji.name)) {
                const entry = gemoji.name[key];
                for (const name of entry.names) {
                    if (!this._emojiMap.has(name)) {
                        this._emojiMap.set(name, { name, emoji: entry.emoji });
                    }
                }
            }
        }
        return this._emojiMap;
    }
}
