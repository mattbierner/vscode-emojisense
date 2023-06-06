import * as vscode from 'vscode';
import DecoratorProvider from "./DecoratorProvider";
import EmojiCompletionProvider from './EmojiCompletionProvider';
import { Configuration } from './configuration';
import { EmojiProvider } from './emoji';
import { quickEmoji } from "./quickEmoji";

function registerProviders(
    provider: EmojiCompletionProvider,
    config: Configuration,
): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];

    for (const language of config.languages) {
        const triggerCharacters = config.shouldShowOnColon(language) ? [':'] : [];
        disposables.push(vscode.languages.registerCompletionItemProvider(language, provider, ...triggerCharacters));
    }

    return vscode.Disposable.from(...disposables);
}

export function activate(context: vscode.ExtensionContext) {
    const emoji = new EmojiProvider();
    const config = new Configuration();
    const provider = new EmojiCompletionProvider(emoji, config);

    config.updateConfiguration();

    let providerSub = registerProviders(provider, config);

    const emojiPicker = quickEmoji(emoji);
    context.subscriptions.push(
        vscode.commands.registerCommand('emojisense.quickEmoji', emojiPicker('emoji', 'editor')),
        vscode.commands.registerCommand('emojisense.quickEmojitext', emojiPicker('name', 'editor')),
        vscode.commands.registerCommand('emojisense.quickEmojiTerminal', emojiPicker('emoji', 'terminal')),
        vscode.commands.registerCommand('emojisense.quickEmojitextTerminal', emojiPicker('name', 'terminal')),
    );

    vscode.workspace.onDidChangeConfiguration(() => {
        config.updateConfiguration();
        providerSub.dispose();
        providerSub = registerProviders(provider, config);
    }, null, context.subscriptions);

    context.subscriptions.push(new DecoratorProvider(emoji, config));
}
