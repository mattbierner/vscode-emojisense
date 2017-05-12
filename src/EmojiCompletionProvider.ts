import { CompletionItem, TextDocument, Position, Range, CompletionItemKind, CompletionItemProvider, CancellationToken, ProviderResult } from "vscode"
import { EmojiProvider } from './emoji'
import Configuration from './configuration'

export default class EmojiCompletionProvider implements CompletionItemProvider {
    constructor(
        private readonly emojiProvider: EmojiProvider,
        private readonly configuration: Configuration
    ) { }

    provideCompletionItems(
        document: TextDocument,
        position: Position,
        _token: CancellationToken
    ): ProviderResult<CompletionItem[]> {
        if (position.character === 0) {
            return []
        }

        const line = document.lineAt(position.line)
        const pre = line.text.slice(0, position.character)

        // Handle case of: `:cat:|`
        const preExistingMatch = pre.match(/:[\w\d_\+\-]+:$/)

        // If there is a character before the color, require at least one character after it
        const preMatch = preExistingMatch || pre.match(/\B:(:?)$|:(:?)([\w\d_\+\-]+?)$/)
        if (!preMatch) {
            return []
        }

        const post = line.text.slice(position.character)
        const postMatch = post.match(/[\w\d_\+\-]*?:?/)

        const replacementSpan: Range = new Range(
            position.translate(0, -preMatch[0].length),
            postMatch ? position.translate(0, postMatch[0].length) : position)

        if (pre.length >= 2 && (preMatch[1] || preMatch[2])) {
            return this.getMarkupEmojiCompletions(document, replacementSpan)
        }

        return this.getUnicodeEmojiCompletions(document, replacementSpan)
            .concat(this.getMarkupEmojiCompletions(document, replacementSpan))
    }

    private getUnicodeEmojiCompletions(document: TextDocument, replacementSpan: Range): CompletionItem[] {
        if (!this.configuration.areUnicodeCompletionsEnabled(document.languageId)) {
            return []
        }
        return this.emojiProvider.emojis.map(x => {
            const item = new CompletionItem(`:${x.name}: — ${x.emoji}`, CompletionItemKind.Text)
            item.detail = x.emoji
            item.insertText = x.emoji
            item.filterText = x.name
            item.range = replacementSpan
            return item
        })
    }

    private getMarkupEmojiCompletions(document: TextDocument, replacementSpan: Range): CompletionItem[] {
        if (!this.configuration.areMarkupCompletionsEnabled(document.languageId)) {
            return []
        }
        return this.emojiProvider.emojis.map(x => {
            const item = new CompletionItem(`::${x.name} — ${x.emoji}`, CompletionItemKind.Text)
            item.detail = `:${x.name}:`
            item.insertText = `:${x.name}:`
            item.filterText = x.name
            item.range = replacementSpan
            return item
        })
    }
}