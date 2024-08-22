# Form Field Obfuscation Web Component

There is no standard way to have a field’s contents be readable while editing and obfuscated while at rest. The closest we get is the ["password reveal" pattern](https://github.com/sunnywalker/show-password-toggle), but that isn’t as customizable for regular fields. The `form-obfuscator` web component enables that.

## API

* `character` - The text character to replace each obfuscated character with. Default: *
* `pattern` - Regular expression to manage replacement. Matched characters will be kept, all other characters will be replaced. If no match is found, the whole string will be replaced.
* `maxlength` - The maximum number of characters to display when obfuscating the text. **Will cause `pattern` to be ignored.**

## Events

This element will emit two custom JavaScript events:

* `form-obfuscator:hide` when a field is obfuscated
* `form-obfuscator:reveal` when a field is obfuscated

On either event you can access the obfuscated field through the reference `event.detail.field`.

## Markup Assumptions

This web component makes no assumptions about markup. It will apply its logic to any text-style `input` elements it contains.

## Implementation notes

All field values will be duplicated into a hidden field, which is the field that will actually be submitted with the form. The source order will be such that the hidden field will be the one whose value is submitted.

## Example

```html
<form-obfuscator>
  <label for="my-field">Required if there’s an email value</label>
  <input id="my-field" name="foo">
</form-obfuscator>
```

## Demo

[Live Demo](https://aarongustafson.github.io/form-obfuscator/demo.html) ([Source](./demo.html))
