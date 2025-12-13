export class FormObfuscatorElement extends HTMLElement {
	#boundEventProxy = null;
	#fieldClones = new WeakMap();

	static get observedAttributes() {
		return ['character', 'maxlength', 'pattern', 'replacer'];
	}

	_upgradeProperty(prop) {
		if (Object.prototype.hasOwnProperty.call(this, prop)) {
			const value = this[prop];
			delete this[prop];
			this[prop] = value;
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) return;
		switch (name) {
			case 'character':
				this.character = newValue;
				break;
			case 'maxlength':
				this.maxlength = newValue;
				break;
			case 'pattern':
				this.pattern = newValue;
				break;
			case 'replacer':
				this.replacer = newValue;
				break;
		}
	}

	get character() {
		return this.getAttribute('character') || '*';
	}
	set character(val) {
		if (val === null || val === undefined) {
			this.removeAttribute('character');
		} else {
			this.setAttribute('character', val);
		}
	}

	get maxlength() {
		const val = this.getAttribute('maxlength');
		return val !== null ? parseInt(val, 10) : null;
	}
	set maxlength(val) {
		if (val === null || val === undefined) {
			this.removeAttribute('maxlength');
		} else {
			this.setAttribute('maxlength', val);
		}
	}

	get pattern() {
		return this.getAttribute('pattern');
	}
	set pattern(val) {
		if (val === null || val === undefined) {
			this.removeAttribute('pattern');
		} else {
			this.setAttribute('pattern', val);
		}
	}

	get replacer() {
		return this.getAttribute('replacer');
	}
	set replacer(val) {
		if (val === null || val === undefined) {
			this.removeAttribute('replacer');
		} else {
			this.setAttribute('replacer', val);
		}
	}

	connectedCallback() {
		// Upgrade properties set before element definition
		this._upgradeProperty('character');
		this._upgradeProperty('maxlength');
		this._upgradeProperty('pattern');
		this._upgradeProperty('replacer');
		requestAnimationFrame(() => {
			this.__$fields = Array.from(
				this.querySelectorAll(
					'input:not([type=submit],[type=image],[type=button],[type=file],[type=color],[type=range],[type=radio],[type=checkbox])',
				),
			);

			// Use reflected properties
			this.__character = this.character;
			this.__maxlength = this.maxlength;
			this.__pattern = this.pattern;
			this.__replacer = this.replacer;
			this.__init();
		});
	}

	disconnectedCallback() {
		if (this.#boundEventProxy) {
			this.removeEventListener('focus', this.#boundEventProxy, true);
			this.removeEventListener('blur', this.#boundEventProxy, true);
		}
	}

	__warn(message) {
		console.warn(`<form-obfuscator>: ${message}`);
	}

	__createShadowElements() {
		const $hidden = document.createElement('input');
		$hidden.type = 'hidden';
		this.__$fields.forEach(($field) => {
			let $clone = $hidden.cloneNode(true);
			$clone.name = $field.name;
			$field.removeAttribute('name');
			$field.insertAdjacentElement('afterend', $clone);
			this.#fieldClones.set($field, $clone);
			this.__hide($field);
		});
	}

	__sanitizeAttributes() {
		// character can only be a single character
		if (!this.__character) {
			this.__character = '*';
		}

		// maxlength needs to be a number
		if (this.__maxlength !== null && this.__maxlength !== undefined) {
			const parsed = parseInt(this.__maxlength, 10);
			if (isNaN(parsed)) {
				this.__warn('maxlength attribute must be a number');
				this.__maxlength = null;
			} else {
				this.__maxlength = parsed;
			}
		}

		// Maxlength negated pattern
		//if ( this.__maxlength ) {
		//	this.__pattern = null;
		//}

		// Pattern must be a valid regular expression
		if (this.__pattern) {
			let test_re = new RegExp(this.__pattern);
			if (!(test_re instanceof RegExp)) {
				this.__warn(
					'pattern attribute must be a valid Regular Expression',
				);
				this.__pattern = null;
			}
		}

		// Replacer must be a function and requires pattern too
		if (this.__replacer) {
			if (!this.__pattern) {
				this.__warn(
					'replacer attribute requires a pattern attribute as well',
				);
				this.__replacer = null;
			} else {
				const replacer = new Function(this.__replacer);
				if (!(replacer instanceof Function)) {
					this.__warn('replacer attribute must be a valid Function');
					this.__replacer = null;
				} else {
					this.__replacer = replacer;
				}
			}
		}
	}

	__emitEvent(type, $field) {
		const event = new CustomEvent(`form-obfuscator:${type}`, {
			detail: {
				field: $field,
				hidden: this.#fieldClones.get($field),
			},
		});
		this.dispatchEvent(event);
	}

	__obfuscate(value) {
		const initial_value = value;
		let replace_everything = true;
		let char = this.__character;
		const re_all_chars = /./g;
		let new_value;
		let pattern_match_kept = false;

		if (this.__pattern !== null) {
			const pattern = new RegExp(this.__pattern);
			const match_result = initial_value.match(pattern);
			if (match_result) {
				replace_everything = false;
				pattern_match_kept = true;
				if (this.__replacer) {
					new_value = initial_value.replace(pattern, this.__replacer);
					pattern_match_kept = false; // replacer might change the match
				} else {
					// Obfuscate everything except the pattern match
					const match_index = initial_value.indexOf(match_result[0]);
					const match_length = match_result[0].length;

					// If maxlength is set, calculate how many chars to obfuscate
					let chars_to_obfuscate;
					if (this.__maxlength !== null) {
						chars_to_obfuscate = this.__maxlength - match_length;
					} else {
						chars_to_obfuscate =
							initial_value.length - match_length;
					}

					// Build obfuscated string: obfuscated chars + visible match
					new_value =
						char.repeat(chars_to_obfuscate) + match_result[0];
				}
			}
		}

		if (replace_everything) {
			new_value = initial_value.replace(re_all_chars, char);
		}

		// Only apply maxlength if we didn't already account for it with pattern
		if (this.__maxlength !== null && !pattern_match_kept) {
			new_value = new_value.substring(0, this.__maxlength);
		}

		return new_value;
	}

	__hide($field) {
		const actualValue = $field.value;
		const $clone = this.#fieldClones.get($field);
		if ($clone && $clone.value !== actualValue) {
			$clone.value = actualValue;
		}
		const obfuscated = this.__obfuscate(actualValue);
		if ($field.value !== obfuscated) {
			$field.value = obfuscated;
		}
		this.__emitEvent('hide', $field);
	}

	__reveal($field) {
		const $clone = this.#fieldClones.get($field);
		if ($clone && $field.value !== $clone.value) {
			$field.value = $clone.value;
		}
		this.__emitEvent('reveal', $field);
	}

	__eventProxy(e) {
		const $field = e.target;
		const type = e.type;
		if ($field.nodeName.toLowerCase() !== 'input') {
			return;
		}
		if (type === 'focus') {
			this.__reveal($field);
		} else if (type === 'blur') {
			this.__hide($field);
		}
	}

	__addObservers() {
		if (!this.#boundEventProxy) {
			this.#boundEventProxy = this.__eventProxy.bind(this);
		}
		this.addEventListener('focus', this.#boundEventProxy, true);
		this.addEventListener('blur', this.#boundEventProxy, true);
	}

	__init() {
		this.__sanitizeAttributes();
		this.__createShadowElements();
		this.__addObservers();
	}
}
