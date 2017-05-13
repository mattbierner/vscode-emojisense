import * as vscode from 'vscode'
import EmojiCompletionProvider from './EmojiCompletionProvider'
import EmojiHoverProvider from './EmojiHoverProvider';
import { EmojiProvider } from './emoji'
import Configuration from './configuration'

function registerProviders(
    provider: EmojiCompletionProvider,
    hoverProvider: EmojiHoverProvider,
    config: Configuration
): vscode.Disposable {
    const completions: vscode.Disposable[] = []
    const hovers: vscode.Disposable[] = []
    for (const language of config.languages) {
        if (config.shouldShowOnColon(language)) {
            completions.push(vscode.languages.registerCompletionItemProvider(language, provider, ':'))
        } else {
            completions.push(vscode.languages.registerCompletionItemProvider(language, provider))
        }

        if (config.isHoverEnabled(language)) {
            completions.push(vscode.languages.registerHoverProvider(language, hoverProvider))
        }
    }

    return vscode.Disposable.from(...completions, ...hovers);
}


export function activate(context: vscode.ExtensionContext) {
    const emoji = new EmojiProvider()
    const config = new Configuration()
    const provider = new EmojiCompletionProvider(emoji, config)
    const hoverProvider = new EmojiHoverProvider(emoji)

    let providerSub = registerProviders(provider, hoverProvider, config)

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        config.updateConfiguration()
        providerSub.dispose()
        providerSub = registerProviders(provider, hoverProvider, config)
    }))
}
