module.exports.SelectMenuOptionData = class SelectMenuOptionData {
  /**
   * @typedef {object} SelectMenuOptionDataValues
   * @property {string} [label] Title of the option
   * @property {string} [value] Developer defined value of the option
   * @property {string} [description] Human-readable description of the option
   * @property {string} [emoji] Emoji ID
   * @property {boolean} [default] Whether this option should be selected by default
   */

  /**
   * @param {SelectMenuOptionDataValues} data 
   */
  constructor(data) {
    this.setup(data);
  }

  /**
   * @private
   * @param {SelectMenuOptionDataValues} data
   */
  setup(data) {
    /**
     * @type {?string}
     */
    this.label = data.label ?? "";

    /**
     * @type {?string}
     */
    this.value = data.value ?? "";

    /**
     * @type {?string}
     */
    this.description = data.description ?? "";

    /**
     * @type {?string}
     */
    if(data.emoji != undefined) {
      this.emoji = data.emoji;
    } else {
      this.emoji = "";
    }

    /**
     * @type {?boolean}
     */
    this.default = data.default ?? false;
  }

  /**
   * @param {String} label The label of the option
   */
  setLabel(label) {
    if(!label) throw new SyntaxError("label is undefined");
    if(typeof label != "string") throw new SyntaxError("label is not a string");
    this.label = label;
  }

  /**
   * @param {String} value The value of the option
   */
  setValue(value) {
    if(!value) throw new SyntaxError("value is undefined");
    if(typeof value != "string") throw new SyntaxError("value is not a string");
    this.value = value;
  }

  /**
   * @param {String} description The description of the option
   */
  setDescription(description) {
    if(!description) throw new SyntaxError("description is undefined");
    if(typeof description != "string") throw new SyntaxError("description is not a string");
    this.description = description;
  }

  /**
   * @param {String} emoji The emoji of the option
   */
  setEmoji(emoji) {
    if(typeof emoji != "string") throw new SyntaxError("emoji is not a string");
    this.emoji = emoji;
  }

  /**
   * @param {Boolean} def Set this option as default?
   */
  setDefault(def) {
    if(typeof def != "boolean") throw new SyntaxError("def is not a boolean");
    this.default = def;
  }

  /**
   * @description Converts the object to JSON
   */
  toJSON() {
    return {
      label: this.label,
      value: this.value,
      description: this.description,
      emoji: this.emoji,
      def: this.default
    };
  }
};