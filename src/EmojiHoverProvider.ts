import { CompletionItem, TextDocument, Position, Range, CompletionItemKind, CompletionItemProvider, CancellationToken, ProviderResult, HoverProvider, Hover } from "vscode"
import { EmojiProvider, Emoji } from './emoji'
import Configuration from './configuration'
const Datauri = require('datauri')

export default class EmojiHoverProvider implements HoverProvider {
    constructor(
        private readonly emojiProvider: EmojiProvider
    ) { }

    provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover> {
        const line = document.lineAt(position.line)
        const pre = line.text.slice(0, position.character)
        const preMatch = pre.match(/:([\w\d_\+\-]+)$/)
        if (!preMatch) {
            return undefined
        }

        const post = line.text.slice(position.character)
        const postMatch = post.match(/([\w\d_\+\-]*?):/)
        if (!postMatch) {
            return undefined
        }

        const name = preMatch[1] + postMatch[1]
        const emoji = this.emojiProvider.lookup(name)
        if (!emoji) {
            return undefined
        }

        return new Hover(this.display(emoji))
    }


    private display(emoji: Emoji): string {
        const width = 160
        const height = 160
        const datauri = new Datauri();
        const src = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}" xml:space="preserve">
     <text x="50%" y="50%" text-anchor="middle" alignment-baseline="central" font-size="120">${emoji.emoji}</text>
</svg>`;
        datauri.format('.svg', src);
        return `![](${datauri.content})`
    }
}