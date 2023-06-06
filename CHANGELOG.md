# Change Log

## 0.10.0 - June 5, 2023
- Turn on emoji completions in all languages using  `emojisense.languages: { "*": true }`. Thanks @RoccoCocco!
- Update gemoji package to bring in new emoji. Thanks @AdrieanKhisbe!

## 0.9.1 - May 4, 2022
- Use more specific activation events.
- Update gemoji package.

## 0.9.0 - September 7, 2021
- Update gemoji package.
- Add support for running in web environments

## 0.8.0 - September 15, 2020
- Update gemoji package. Thanks @AdrieanKhisbe!

## 0.7.0 - April 29, 2020
- For VS Code 1.45+, use `scminput` to identify commit message input instead of pseudo language id.
- Mark scm completions as plaintext.

## 0.6.1 - Feb 24, 2020
- Add pseudo language for scm input instead of sharing config with `plaintext`.

## 0.6.0 - Feb 24, 2020
- Enable in SCM (git) input.

## 0.5.3 - September 27, 2019
- Remove `out` dir from published extension.

## 0.5.2 - September 27, 2019
- Webpack extension. Thanks @usernamehw!

## 0.5.1 - April 18, 2019
- Set explicit `extensionKind` for VS Code compatibility.
- Use ctrl+alt+i as default linux keybinding.

## 0.4.1 - June 13, 2018
- Update gemoji
- Lowercase language keys

## 0.4.0 - February 2, 2018
- Also register alt names for all entries

## 0.3.0 - October 21, 2017
* Show emoji in completion list view
* Show large emoji in completion details view

## 0.2.3 - July 17, 2017
* Fix for VS Code 1.14 filterText changes

## 0.2.2 - May 13, 2017
* Increase opacity of inline emoji preview to work better across a range of themes.

## 0.2.1 - May 13, 2017
* Fix wrong `datauri` package listed in `package.json`

## 0.2.0 - May 13, 2017
* Continue tweaking when emojis are shown.
* Added support for showing emoji decorators inline for `:rocket:` syntax. Can also view large previews of the emojis by hovering

## 0.1.0 - May 12, 2017
- Tweak when completions are shown to not get in the way as much. They will no longer show when the colon is prefixed by a letter such as: `a:|`. In these cases, there must also be a letter after the colon before we show suggestions: `a:b|`
- Added `showOnColon` setting to disable automatically showing suggestions when you type a colon.

## 0.0.1 - May 11, 2017
- Initial release