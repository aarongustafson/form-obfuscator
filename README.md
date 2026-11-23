# Form Field Obfuscation Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-obfuscator.svg)](https://www.npmjs.com/package/@aarongustafson/form-obfuscator)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-obfuscator/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/form-obfuscator/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/form-obfuscator?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/form-obfuscator)
[![License](https://img.shields.io/npm/l/@aarongustafson/form-obfuscator)](https://github.com/aarongustafson/form-obfuscator/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/form-obfuscator)](https://github.com/aarongustafson/form-obfuscator/blob/main/form-obfuscator.d.ts)

`<form-obfuscator>` masks input values when fields lose focus and reveals them
for editing when they receive focus. It also masks initial values on setup.
This is display masking, not encryption: scripts and form submission can still
access the actual values. Without JavaScript, the native fields stay readable
and editable.

## Demos

- [Live Demo](https://aarongustafson.github.io/form-obfuscator/demo/) ([Source](./demo/index.html))
- [Unpkg CDN Demo](https://aarongustafson.github.io/form-obfuscator/demo/unpkg.html) ([Source](./demo/unpkg.html))
- [ESM Demo](https://aarongustafson.github.io/form-obfuscator/demo/esm.html) ([Source](./demo/esm.html))

## Installation

```bash
npm install @aarongustafson/form-obfuscator
```

## Usage

Wrap a labeled text input in `<form-obfuscator>` and register the element:

```html
<script
	src="./node_modules/@aarongustafson/form-obfuscator/define.js"
	type="module"
></script>

<form-obfuscator>
	<label for="reference">Account reference</label>
	<input id="reference" name="reference" value="DEMO-1234" />
</form-obfuscator>
```

This fictional reference appears as `*********` after setup. Focus the field
to edit it, then Tab away to mask it again. The label and native keyboard
behavior remain in place; tell people that leaving the field masks its value.

### Option 1: Import the class and define manually

The main import exports the class without registering it. Define the custom
element once with your preferred tag name:

```javascript
import { FormObfuscatorElement } from '@aarongustafson/form-obfuscator';

customElements.define('form-obfuscator', FormObfuscatorElement);
```

For a custom name, replace `'form-obfuscator'` in both registration and markup.

### Option 2: Auto-define the custom element (browser environments only)

Use the guarded definition helper to register the element when `customElements` is available:

```javascript
import '@aarongustafson/form-obfuscator/define.js';
```

Importing `define.js` also calls `defineFormObfuscator()`. The helper skips
an already registered tag and returns `true` when a registry is available,
or `false` otherwise. You can call it again:

```javascript
import { defineFormObfuscator } from '@aarongustafson/form-obfuscator/define.js';

defineFormObfuscator();
```

You can also include the guarded script from HTML:

```html
<script
	src="./node_modules/@aarongustafson/form-obfuscator/define.js"
	type="module"
></script>
```

### CDN Usage

You can also use the component directly from a CDN:

```html
<script
	src="https://unpkg.com/@aarongustafson/form-obfuscator@latest/define.js"
	type="module"
></script>
```

## Behavior

The component finds descendant inputs on the next animation frame after
connection. It excludes submit, image, button, file, color, range, radio, and
checkbox inputs. Use text inputs for these examples; native types that reject
masked strings are not useful masking targets.

Each managed input gets a hidden input immediately after it. The component
copies the visible input’s `name` to the hidden input and removes the visible
input’s `name`. On setup and blur, it stores the actual value in the hidden
input and masks the visible value. On focus, it restores the value from the
hidden input. Form submission uses the named hidden input, not source order.

The hidden value updates on blur, not on every keystroke. If your application
reads `FormData` while someone is still editing, move focus out of the field
first. Native validation sees the visible field’s current value; masking does
not replace server-side validation.

The component supports multiple inputs, each with its own hidden value. It
does not watch for inputs added after setup. Disconnecting removes its focus
and blur listeners, but does not restore names or values or remove hidden
inputs. Reconnecting runs setup again; don’t rely on disconnect as an undo
operation.

## API

Attributes and same-named JavaScript properties reflect one another. Set them
before connection: setup reads their values once, so later changes do not
reconfigure the active masking behavior.

| Attribute / property | Value and default                                    | Behavior                                                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `character`          | String; `*` when absent or empty                     | Replacement text. The implementation also accepts strings longer than one character.                                                                                                                                          |
| `pattern`            | Regular expression source string; `null` when absent | Without a replacer, keeps the first full match visible at the end, with replacement text before it. If nothing matches, masks the whole value. Do not include `/` delimiters or flags.                                        |
| `replacer`           | JavaScript function body string; `null` when absent  | Requires `pattern`. Runs through `value.replace(pattern, replacer)` on a match. Access the match and capture groups through `arguments`. This is code text, not a function reference or a function property.                  |
| `maxlength`          | Integer; `null` when absent                          | Limits the masked display, not the entered value. With a replacer or no pattern match, truncates the final output. With a preserved pattern match, fills the remaining display length with replacement text before the match. |

Use a nonnegative `maxlength` at least as long as the preserved match, and a
single-character replacement if you need a fixed display length. A shorter
limit can throw during pattern masking. A nonnumeric limit produces a warning
and is ignored. A replacer without a pattern produces a warning and is ignored.
Invalid regular expressions, invalid function bodies, and blocked compilation
can throw during setup; there’s no automatic recovery or rollback.

See the demos for [masking alternatives](https://aarongustafson.github.io/form-obfuscator/demo/#pattern-obfuscation),
[trusted replacer bodies](https://aarongustafson.github.io/form-obfuscator/demo/#custom-replacer),
and [combined options](https://aarongustafson.github.io/form-obfuscator/demo/#advanced-combinations).
The component has no public masking methods or localization strings.

## Events

This element will emit two custom JavaScript events:

- `form-obfuscator:hide` after a field is masked, including during setup
- `form-obfuscator:reveal` after a field is revealed for editing

Both events dispatch on the component and do not bubble. `event.detail.field`
references the visible input; `event.detail.hidden` references its hidden input.
Both expose values: avoid logging real sensitive data.

## Styling and accessibility

The component adds no stylesheet, shadow DOM, CSS custom properties, or parts.
Style your authored inputs and labels normally. Keep labels associated with
their fields and provide visible masking/editing instructions. Masking changes
the input value, not its accessible name; there is no separate announcement
of that change.

## Privacy and trusted configuration

Masking can reduce casual visual exposure while a field is unfocused. It does
not protect data from scripts, developer tools, form submission, or someone
who focuses the field. Use fictional values in demos. Use native password
fields for passwords rather than copying these text-field examples.

Keep configuration trusted. The component compiles `pattern` with `RegExp`
and `replacer` with the
[`Function` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/Function).
Do not build either attribute from untrusted content. A restrictive
[Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
can block function compilation; use the non-replacer options rather than
weakening your policy.

## Browser Support

The component requires:

- Custom Elements v1
- ES Modules (for module usage)

Before registration, or if the module fails to load, the native fields remain
readable, editable, and named for submission. This fallback is not masked.

## TypeScript Support

TypeScript definitions are included with this package. You get full type support and event typings automatically when using this component in TypeScript projects.

See the [declarations](./form-obfuscator.d.ts),
[element manifest](./custom-elements.json), and [source](./form-obfuscator.js)
for the exported API.

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

# Chromium, Firefox, and WebKit regressions (one worker)
npm run test:browser
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## License

[MIT](./LICENSE)
