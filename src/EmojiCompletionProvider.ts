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
        const preMatch = pre.match(/:(:?)[\w\d_\+\-]*$/)
        if (!preMatch) {
            return []
        }

        const post = line.text.slice(position.character)
        const postMatch = post.match(/[\w\d_\+\-]*:?/)

        let replacementSpan: Range;

        // Handle case of: `:cat:|`
        const preExistingMatch = pre.match(/:[\w\d_\+\-]+:$/);
        if (preExistingMatch) {
            replacementSpan = new Range(
                position.translate(0, -preExistingMatch[0].length),
                position)
        } else {
            replacementSpan = new Range(
                position.translate(0, -preMatch[0].length),
                postMatch ? position.translate(0, postMatch[0].length) : position)
        }

        if (pre.length >= 2 && preMatch[1] === ':') {
            return this.getMarkupEmojiCompletions(document, replacementSpan)
        }

        return this.getUnicodeEmojiCompletions(document, replacementSpan)
            .concat(this.getMarkupEmojiCompletions(document, replacementSpan))
    }

    private getUnicodeEmojiCompletions(document: TextDocument, replacementSpan: Range): CompletionItem[] {
        if (!this.configuration.areUnicodeCompletionsEnabled(document)) {
            return []
        }
        return this.emojiProvider.emojis.map(x => {
            const item = new CompletionItem(`:${x.name}:`, CompletionItemKind.Text)
            item.documentation = x.emoji
            item.insertText = x.emoji
            item.filterText = x.name
            item.range = replacementSpan
            return item
        })
    }

    private getMarkupEmojiCompletions(document: TextDocument, replacementSpan: Range): CompletionItem[] {
        if (!this.configuration.areMarkupCompletionsEnabled(document)) {
            return []
        }
        return this.emojiProvider.emojis.map(x => {
            const item = new CompletionItem(`::${x.name}`, CompletionItemKind.Text)
            item.detail = `:${x.name}:`
            item.documentation = x.emoji
            item.insertText = `:${x.name}:`
            item.filterText = x.name
            item.range = replacementSpan
            return item
        })
    }
}