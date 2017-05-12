import * as vscode from 'vscode'
import EmojiCompletionProvider from './EmojiCompletionProvider'
import { EmojiProvider } from './emoji'
import Configuration from './configuration'

function registerProvider(provider: EmojiCompletionProvider, config: Configuration): vscode.Disposable {
    return vscode.Disposable.from(
        ...Array.from(config.languages).map(language => {
            if (config.shouldShowOnColon(language)) {
                return vscode.languages.registerCompletionItemProvider(language, provider, ':');
            }
            return vscode.languages.registerCompletionItemProvider(language, provider)
        }))
}

export function activate(context: vscode.ExtensionContext) {
    const emoji = new EmojiProvider()
    const config = new Configuration()
    const provider = new EmojiCompletionProvider(emoji, config)

    let providerSub = registerProvider(provider, config)

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        config.updateConfiguration()
        providerSub.dispose()
        providerSub = registerProvider(provider, config)
    }))
}
