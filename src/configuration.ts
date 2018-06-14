import * as vscode from 'vscode'

interface LanguageConfig {
    readonly unicodeCompletionsEnabled?: boolean
    readonly markupCompletionsEnabled?: boolean
    readonly showOnColon?: boolean
    readonly emojiDecoratorsEnabled?: boolean
}

export default class Configuration implements LanguageConfig {
    private languageConfigurations = new Map<string, LanguageConfig>();

    unicodeCompletionsEnabled: boolean = true
    markupCompletionsEnabled: boolean = true
    showOnColon: boolean = true
    emojiDecoratorsEnabled: boolean = true

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

    public isInlineEnabled(forLanguage: string): boolean {
        return this.is('emojiDecoratorsEnabled', forLanguage);
    }

    private is(setting: keyof LanguageConfig, forLanguage: string): boolean {
        const languageConfig = this.getLanguageConfig(forLanguage)
        if (!languageConfig) {
            return false
        }

        return typeof languageConfig[setting] !== 'undefined' ? !!languageConfig[setting] : this[setting];
    }

    private getLanguageConfig(languageId: string): LanguageConfig | undefined {
        return this.languageConfigurations.get(languageId.toLowerCase())
    }

    public updateConfiguration(): void {
        const config = vscode.workspace.getConfiguration('emojisense')
        this.unicodeCompletionsEnabled = config.get<boolean>('unicodeCompletionsEnabled', true)
        this.markupCompletionsEnabled = config.get<boolean>('markupCompletionsEnabled', true)
        this.showOnColon = config.get<boolean>('showOnColon', true)
        this.emojiDecoratorsEnabled = config.get<boolean>('emojiDecoratorsEnabled', true)

        this.languageConfigurations = new Map()
        const languagesConfig = config.get<any>('languages', {})
        for (const language of Object.keys(languagesConfig || {})) {
            const config = languagesConfig[language]
            const languageName = language.toLowerCase();
            if (typeof config === 'boolean') {
                if (config) {
                    this.languageConfigurations.set(languageName, {})
                }
            } else {
                this.languageConfigurations.set(languageName, config)
            }
        }
    }
}