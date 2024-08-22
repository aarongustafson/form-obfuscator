class FormObfuscatorElement extends HTMLElement {
	connectedCallback() {
		this.__$fields = this.querySelector("input:not([type=submit],[type=image],[type=button],[type=file],[type=color],[type=range],[type=radio],[type=checkbox])");
		
		this.__character = this.getAttribute( "character" );
		this.__maxlength = this.getAttribute( "maxlength" );
		this.__pattern = this.getAttribute( "pattern" );

		this.__init();
	}

	__warn( message ) {
		console.warn(`<form-obfuscator>: ${message}`);
	}

	__createShadowElements() {
		const $hidden = document.createElement("input");
		$hidden.type = "hidden";
		[this.__$fields].forEach($field => {
			let $clone = $hidden.cloneNode(true);
			$clone.name = $field.name;
			$field.removeAttribute("name");
			$field.insertAdjacentElement("afterend", $clone);
			$field.$clone = $clone;
			this.__hide($field);
		});
	}

	__sanitizeAttributes() {
		// character can only be a single character
		if ( this.__character ) {
			if ( [...this.__character].length > 1 ) {
				this.__warn(`character attribute should only be a single character, ${this.__character} is invalid`);
			}
		} else {
			this.__character = "*";
		}

		// maxlength needs to be a number
		if ( this.__maxlength ) {
			this.__maxlength = parseInt( this.__maxlength );
			if ( this.__maxlength === NaN ) {
				this.__warn("maxlength attribute must be a number");
				this.__maxlength = null;
			}
		}

		// Maxlength negated pattern
		if ( this.__maxlength ) {
			this.__pattern = null;
		}

		// Pattern must be a valid regular expression
		if ( this.__pattern ) {
			let test_re = new RegExp( this.__pattern );
			if ( !( test_re instanceof RegExp ) ) {
				this.__warn("pattern attribute must be a valid Regular Expression");
				this.__pattern = null;
			}
		}
	}

	__emitEvent( type, $field ) {
		const event = new CustomEvent(`form-obfuscator:${type}`, {
			detail: {
				field: $field
			}
		});
		this.dispatchEvent( event );
	}

	__obfuscate( $field ) {
		const initial_value = $field.value;
		let replace_everything = true;
		let char = this.__character;
		const re_all_chars = /./g;
		let new_value;

		if ( this.__pattern !== null ) {
			const pattern = new RegExp( this.__pattern );
			if ( initial_value.match( pattern ) ) {
				replace_everything = false;
				new_value = initial_value.replace( pattern, ( match, index, string ) => {
					const before = string.substring( 0, index ).replace( re_all_chars, char );
					const after = string.substring( index + match.length, string.length ).replace( re_all_chars, char );
					return before + match + after;
				});
				char = "[\^$.|?*+()".split("").includes( char ) ? `\\${char}` : char;
				const obfuscated_pattern = new RegExp( `^[^${char}]*?(${char}*${this.__pattern}${char}*)[^${char}]*?$` );
				new_value = new_value.replace( obfuscated_pattern, "$1" );	
			}
		}
		
		if ( replace_everything ) {
			new_value = initial_value.replace( re_all_chars, char );
		}

		if ( this.__maxlength !== null ) {
			new_value = new_value.substring(0, this.__maxlength);
		}

		return new_value;
	}

	__hide( $field ) {
		$field.$clone.value = $field.value;
		$field.value = this.__obfuscate($field);
		this.__emitEvent("hide", $field);
	}

	__reveal( $field ) {
		$field.value = $field.$clone.value;
		this.__emitEvent("reveal", $field);
	}

	__eventProxy( e ) {
		const $field = e.target;
		const type = e.type;
		if ( $field.nodeName.toLowerCase() !== "input" ) {
			return;
		}
		if ( type === "focus" ) {
			this.__reveal( $field );
		} else
		if ( type === "blur" ) {
			this.__hide( $field );
		}
	}

	__addObservers() {
		this.addEventListener("focus", this.__eventProxy.bind( this ), true);
		this.addEventListener("blur", this.__eventProxy.bind( this ), true);
	}

	__init() {
		this.__sanitizeAttributes();
		this.__createShadowElements();
		this.__addObservers();
	}
}

if( !!customElements ) {
	customElements.define("form-obfuscator", FormObfuscatorElement);
}
