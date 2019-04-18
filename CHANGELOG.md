# Change Log

## 0.5.1 - April 18, 2019
- Set explicit `extensionKind` for VS Code compatability.
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
* Fix wrong datauri package listed in package.json

## 0.2.0 - May 13, 2017
* Continue tweaking when emojis are shown.
* Added support for showing emoji decorators inline for `:rocket:` sytax. Can also view large previews of the emojis by hovering

## 0.1.0 - May 12, 2017
- Tweak when completions are shown to not get in the way as much. They will no longer show when the colon is prefixed by a letter such as: `a:|`. In these cases, there must also be a letter after the colon before we show suggestions: `a:b|`
- Added `showOnColon` setting to disable automatically showing suggestions when you type a colon.

## 0.0.1 - May 11, 2017
- Initial release