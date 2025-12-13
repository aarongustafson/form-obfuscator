// Type definitions for form-obfuscator web component
// Project: form-obfuscator
// Definitions by: Aaron Gustafson

export interface FormObfuscatorHideDetail {
	field: HTMLInputElement;
	hidden: HTMLInputElement;
}

export interface FormObfuscatorRevealDetail {
	field: HTMLInputElement;
	hidden: HTMLInputElement;
}

export class FormObfuscatorElement extends HTMLElement {
	/**
	 * The character used for obfuscation (default: '*').
	 */
	character: string;
	/**
	 * The maximum length of the obfuscated value.
	 */
	maxlength: number | null;
	/**
	 * The regular expression pattern to keep visible.
	 */
	pattern: string | null;
	/**
	 * The replacer function as a string (if used).
	 */
	replacer: string | null;

	addEventListener(
		type: 'form-obfuscator:hide',
		listener: (event: CustomEvent<FormObfuscatorHideDetail>) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: 'form-obfuscator:reveal',
		listener: (event: CustomEvent<FormObfuscatorRevealDetail>) => void,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void;
}

declare global {
	interface HTMLElementTagNameMap {
		'form-obfuscator': FormObfuscatorElement;
	}
}
