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
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const gemojies = require('gemoji');
            this._emojiMap = new Map<string, Emoji>();
            for (const gemoji of gemojies) {
                for (const name of gemoji.names) {
                    if (!this._emojiMap.has(name)) {
                        this._emojiMap.set(name, { name, emoji: gemoji.emoji });
                    }
                }
            }
        }
        return this._emojiMap;
    }
}
