import * as vscode from 'vscode'

interface LanguageConfig {
    readonly unicodeCompletionsEnabled?: boolean
    readonly markupCompletionsEnabled?: boolean
}

export default class Configuration implements LanguageConfig {
    private languageConfigurations: Map<string, LanguageConfig>

    unicodeCompletionsEnabled: boolean
    markupCompletionsEnabled: boolean

    constructor() {
        this.updateConfiguration()
    }

    public get languages(): Iterable<string> {
        return this.languageConfigurations.keys();
    }

    public areUnicodeCompletionsEnabled(document: vscode.TextDocument): boolean {
        return this.are('unicodeCompletionsEnabled', document)
    }

    public areMarkupCompletionsEnabled(document: vscode.TextDocument): boolean {
        return this.are('markupCompletionsEnabled', document)
    }

    private are(setting: keyof LanguageConfig, document: vscode.TextDocument): boolean {
        const languageConfig = this.getLanguageConfig(document)
        if (languageConfig && typeof languageConfig[setting] !== 'undefined') {
            return !!languageConfig[setting]
        }
        return this[setting]
    }

    private getLanguageConfig(document: vscode.TextDocument): LanguageConfig {
        return this.languageConfigurations.get(document.languageId) || {}
    }

    public updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('emojisense')
        this.unicodeCompletionsEnabled = config.get<boolean>('unicodeCompletionsEnabled', true)
        this.markupCompletionsEnabled = config.get<boolean>('markupCompletionsEnabled', true)

        this.languageConfigurations = new Map()
        const languagesConfig = config.get<any>('languages', {})
        for (const language of Object.keys(languagesConfig || {})) {
            const config = languagesConfig[language]
            if (typeof config === 'boolean') {
                if (config) {
                    this.languageConfigurations.set(language, {})
                }
            } else {
                this.languageConfigurations.set(language, config)
            }
        }
    }
}