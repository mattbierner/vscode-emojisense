import * as vscode from 'vscode'

interface LanguageConfig {
    readonly unicodeCompletionsEnabled?: boolean
    readonly markupCompletionsEnabled?: boolean
    readonly showOnColon?: boolean
}

export default class Configuration implements LanguageConfig {
    private languageConfigurations: Map<string, LanguageConfig>

    unicodeCompletionsEnabled: boolean
    markupCompletionsEnabled: boolean
    showOnColon: boolean

    constructor() {
        this.updateConfiguration()
    }

    public get languages(): Iterable<string> {
        return this.languageConfigurations.keys();
    }

    public areUnicodeCompletionsEnabled(forLanguage: string): boolean {
        return this.is('unicodeCompletionsEnabled', forLanguage)
    }

    public areMarkupCompletionsEnabled(forLanguage: string): boolean {
        return this.is('markupCompletionsEnabled', forLanguage)
    }

    public shouldShowOnColon(forLanguage: string): boolean {
        return this.is('showOnColon', forLanguage);
    }

    private is(setting: keyof LanguageConfig, forLanguage: string): boolean {
        const languageConfig = this.getLanguageConfig(forLanguage)
        if (languageConfig && typeof languageConfig[setting] !== 'undefined') {
            return !!languageConfig[setting]
        }
        return this[setting]
    }

    private getLanguageConfig(languageId: string): LanguageConfig {
        return this.languageConfigurations.get(languageId) || {}
    }

    public updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('emojisense')
        this.unicodeCompletionsEnabled = config.get<boolean>('unicodeCompletionsEnabled', true)
        this.markupCompletionsEnabled = config.get<boolean>('markupCompletionsEnabled', true)
        this.showOnColon = config.get<boolean>('showOnColon', true)

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