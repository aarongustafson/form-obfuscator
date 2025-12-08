# Form Field Obfuscation Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-obfuscator.svg)](https://www.npmjs.com/package/@aarongustafson/form-obfuscator) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-obfuscator/ci.yml?branch=main)](https://github.com/aarongustafson/form-obfuscator/actions)

There is no standard way to have a field's contents be readable while editing and obfuscated while at rest. The closest we get is the ["password reveal" pattern](https://github.com/sunnywalker/show-password-toggle), but that isn't as customizable for regular fields. The `form-obfuscator` web component enables that.

## Demo

[Live Demo](https://aarongustafson.github.io/form-obfuscator/demo/) ([Source](./demo/index.html))

## Installation

```bash
npm install @aarongustafson/form-obfuscator
```

## Usage

### Option 1: Import the class and define manually

Import the class and define the custom element with your preferred tag name:

```javascript
import { FormObfuscatorElement } from '@aarongustafson/form-obfuscator';

// Define with default name
customElements.define('form-obfuscator', FormObfuscatorElement);

// Or define with a custom name
customElements.define('my-field-obfuscator', FormObfuscatorElement);
```

### Option 2: Auto-define the custom element (browser environments only)

Use the guarded definition helper to register the element when `customElements` is available:

```javascript
import '@aarongustafson/form-obfuscator/define.js';
```

If you prefer to control when the element is registered, call the helper directly:

```javascript
import { defineFormObfuscator } from '@aarongustafson/form-obfuscator/define.js';

defineFormObfuscator();
```

You can also include the guarded script from HTML:

```html
<script src="./node_modules/@aarongustafson/form-obfuscator/define.js" type="module"></script>
```

### CDN Usage

You can also use the component directly from a CDN:

```html
<script src="https://unpkg.com/@aarongustafson/form-obfuscator@latest/define.js" type="module"></script>
```

## API

* `character` - The text character to replace each obfuscated character with. Default: *
* `pattern` (optional) - Regular expression to manage replacement. Matched characters will be kept, all other characters will be replaced. If no match is found, the whole string will be replaced.
* `replacer` (optional) - A custom replacement function that will be used to replace the value. Requires `pattern` be set as well. The obfuscated value will be a result of `value.replace( pattern, replacer )` where _value_ is the original field value, _pattern_ is a Regular Expression conversion of `pattern`, and _replacer_ is this function. All components of the replacer will need to be addressed via `arguments`.
* `maxlength` (optional) - The maximum number of characters to display when obfuscating the text. This truncation is applied at the end of the replacement process.

## Events

This element will emit two custom JavaScript events:

* `form-obfuscator:hide` when a field is obfuscated
* `form-obfuscator:reveal` when a field is obfuscated

On either event you can access the obfuscated field through the reference `event.detail.field` and the hidden field through the reference `event.detail.hidden`.

## Markup Assumptions

This web component makes no assumptions about markup. It will apply its logic to any text-style `input` elements it contains.

## Implementation notes

All field values will be duplicated into a hidden field, which is the field that will actually be submitted with the form. The source order will be such that the hidden field will be the one whose value is submitted.

## Example

```html
<form-obfuscator>
	<label for="my-field">Field Label</label>
	<input id="my-field" name="foo" />
</form-obfuscator>
```

## Browser Support

This web component works in all modern browsers that support:

- Custom Elements v1
- ES Modules (for module usage)

For older browsers, you may need polyfills for Custom Elements.

## Development

### Testing

```bash
# Run tests
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```
