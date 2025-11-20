import { beforeAll } from 'vitest';
import { FormObfuscatorElement } from '../form-obfuscator.js';

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get('form-obfuscator')) {
		customElements.define('form-obfuscator', FormObfuscatorElement);
	}

	// Make the class available globally for testing static methods
	globalThis.FormObfuscatorElement = FormObfuscatorElement;
});
