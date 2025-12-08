import { FormObfuscatorElement } from './form-obfuscator.js';

export function defineFormObfuscator(tagName = 'form-obfuscator') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, FormObfuscatorElement);
	}

	return true;
}

defineFormObfuscator();
