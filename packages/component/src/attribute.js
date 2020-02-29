import {hasOwnProperty} from 'core-helpers';
import a from 'indefinite';
import ow from 'ow';

import {Property} from './property';
import {AttributeSelector} from './attribute-selector';
import {getTypeOf} from './utilities';

export class Attribute extends Property {
  // === Options ===

  setOptions(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        value: ow.optional.any,
        default: ow.optional.function,
        getter: ow.optional.function,
        setter: ow.optional.function
      })
    );

    const {value: initialValue, default: defaultValue, getter, setter, ...otherOptions} = options;

    const hasInitialValue = 'value' in options;
    const hasDefaultValue = 'default' in options;

    super.setOptions(otherOptions);

    if (getter !== undefined || setter !== undefined) {
      if (hasInitialValue) {
        throw new Error(
          `The '${this.getName()}' ${getTypeOf(
            this
          )} cannot have both a getter or setter and an initial value`
        );
      }

      if (hasDefaultValue) {
        throw new Error(
          `The '${this.getName()}' ${getTypeOf(
            this
          )} cannot have both a getter or setter and a default value`
        );
      }

      if (getter !== undefined) {
        this._getter = getter;
      }

      if (setter !== undefined) {
        if (getter === undefined) {
          throw new Error(
            `The '${this.getName()}' ${getTypeOf(this)} cannot have a setter without a getter`
          );
        }
        this._setter = setter;
      }

      this._isSet = true;

      return;
    }

    if (hasInitialValue) {
      this.setValue(initialValue);
    }

    if (hasDefaultValue) {
      this._default = defaultValue;
    }
  }

  // === Value ===

  getValue(options = {}) {
    ow(
      options,
      'options',
      ow.object.exactShape({throwIfUnset: ow.optional.boolean, autoFork: ow.optional.boolean})
    );

    const {throwIfUnset = true, autoFork = true} = options;

    if (!this.isSet()) {
      if (throwIfUnset) {
        throw new Error(
          `Cannot get the value of an unset ${getTypeOf(this)} (${getTypeOf(
            this
          )} name: '${this.getName()}')`
        );
      }
      return undefined;
    }

    if (this._getter !== undefined) {
      return this._getter.call(this.getParent());
    }

    if (autoFork && !hasOwnProperty(this, '_value')) {
      this._value = forkValue(this._value);
    }

    return this._value;
  }

  setValue(value) {
    if (this._setter !== undefined) {
      this._setter.call(this.getParent(), value);
      return;
    }

    if (this._getter !== undefined) {
      throw new Error(
        `Cannot set the value of ${a(getTypeOf(this))} that has a getter but no setter (${getTypeOf(
          this
        )} name: ${this.getName()})`
      );
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = value;
    this._isSet = true;

    return {previousValue, newValue: value};
  }

  unsetValue() {
    if (this._getter !== undefined) {
      throw new Error(
        `Cannot unset the value of ${a(getTypeOf(this))} that has a getter (${getTypeOf(
          this
        )} name: ${this.getName()})`
      );
    }

    this._isSet = false;
  }

  isSet() {
    return this._isSet === true;
  }

  // === Default value ===

  getDefaultValue() {
    let value = this.getDefaultValueFunction();

    if (value !== undefined) {
      value = value.call(this.getParent());
    }

    return value;
  }

  getDefaultValueFunction() {
    return this._default;
  }

  // Attribute selectors

  _expandAttributeSelector(normalizedAttributeSelector, _options) {
    return normalizedAttributeSelector;
  }

  // === Introspection ===

  introspect() {
    const introspectedExposure = super.introspect();

    if (introspectedExposure === undefined) {
      return undefined;
    }

    if (this.isSet()) {
      introspectedExposure.value = this.getValue();
    }

    const defaultValueFunction = this.getDefaultValueFunction();

    if (defaultValueFunction !== undefined) {
      introspectedExposure.default = defaultValueFunction;
    }

    return introspectedExposure;
  }

  // === Utilities ===

  static isAttribute(object) {
    return isAttribute(object);
  }
}

export function isAttributeClass(object) {
  return typeof object?.isAttribute === 'function';
}

export function isAttribute(object) {
  return isAttributeClass(object?.constructor) === true;
}

function forkValue(value) {
  return value; // TODO
}
