import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { EmojiProvider } from './emoji';

export default class EmojiCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        private readonly emojiProvider: EmojiProvider,
        private readonly configuration: Configuration,
    ) { }

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        if (position.character === 0) {
            return [];
        }

        const line = document.lineAt(position.line);
        const pre = line.text.slice(0, position.character);

        // Handle case of: `:cat:|`
        const preExistingMatch = pre.match(/:[\w\d_+-]+:$/);

        // If there is a character before the colon, require at least one character after it
        const preMatch = preExistingMatch || pre.match(/(?:\s|^)(:(:?)$)|(:(:?)[\w\d_+-]+?)$/);
        if (!preMatch) {
            return [];
        }

        const post = line.text.slice(position.character);
        const postMatch = post.match(/[\w\d_+-]*?:?/);

        const replacementSpan: vscode.Range = new vscode.Range(
            position.translate(0, -(preMatch[1] || preMatch[3] || '').length),
            postMatch ? position.translate(0, postMatch[0].length) : position);

        if (pre.length >= 2 && (preMatch[2] || preMatch[4])) {
            return this.getMarkupEmojiCompletions(document, replacementSpan);
        }

        return this.getUnicodeEmojiCompletions(document, replacementSpan);
    }

    private getUnicodeEmojiCompletions(
        document: vscode.TextDocument,
        replacementSpan: vscode.Range,
    ): vscode.CompletionItem[] {
        if (!this.configuration.areUnicodeCompletionsEnabled(document)) {
            return [];
        }

        const kind = vscode.CompletionItemKind.Text;
        return this.emojiProvider.emojis.map((x) => {
            const item = new vscode.CompletionItem({
                label: `:${x.name}: ${x.emoji}`,
                description: x.tags.join(', '),
            }, kind);
            item.filterText = `:${x.tags.join(' ')} ${x.name} ${x.description} ${x.category}:`;
            item.documentation = new vscode.MarkdownString([
                `# ${x.emoji}`,
                `_${x.category}: ${x.tags.concat(x.description).join(', ')}_`,
            ].join('\n'));
            item.insertText = x.emoji;
            item.range = replacementSpan;
            return item;
        });
    }

    private getMarkupEmojiCompletions(
        document: vscode.TextDocument,
        replacementSpan: vscode.Range,
    ): vscode.CompletionItem[] {
        if (!this.configuration.areMarkupCompletionsEnabled(document)) {
            return [];
        }

        const kind = vscode.CompletionItemKind.Text;
        return this.emojiProvider.emojis.map((x) => {
            const item = new vscode.CompletionItem({
                label: `::${x.name} ${x.emoji}`,
                description: x.tags.join(',  ')
            }, kind);
            item.filterText = `::${x.tags.join(' ')} ${x.name} ${x.description} ${x.category}`;
            item.documentation = new vscode.MarkdownString([
                `# ${x.emoji}`,
                `_${x.category}: ${x.tags.concat(x.description).join(', ')}_`,
            ].join('\n'));
            item.insertText = `:${x.name}:`;
            item.range = replacementSpan;
            return item;
        });
    }
}
