
/**
 * Class representing a changeset, mostly used for local manipulation.
 * Constructs an identity changeset.
 */
function Changeset(baseTextLen) {
  // Base length of the revision we apply the changeset on.
  this.baseLen = this.newLen = baseTextLen;
  // One skip everything operation.
  this.ops = [['=', baseTextLen]];
  // Empty char bank.
  this.charBank = "";
}

/**
 * Receives a list of lines and combines them into a string adding newlines
 * after each line.
 */
var combineLines = function(lines) {
  var s = "";
  if (typeof(lines) == 'undefined') {
    return s;
  }
  for (var i = 0; i < lines.length; ++i) {
    s = s + lines[i];
    if (i < lines.length - 1) {
      s = s + '\n';
    }
  }
  return s;
};

/**
 * Creates a changeset object, given a changeset in the code mirror format.
 * We need to know the offset relative to the start of the file.
 */
Changeset.prototype.fromCodeMirror = function(CMCs, fromOffset) {
  // Init ops & char bank.
  this.ops = [];
  this.charBank = "";
  if (fromOffset > 0) {
    this.ops.push(['=', fromOffset]);
  }
  var text = combineLines(CMCs['text']);
  var removed = combineLines(CMCs['removed']).length;
  // Set baselen.
  this.baseLen = this.newLen + removed - text.length;
  if (removed > 0) {
    this.ops.push(['-', removed]);
  }
  if (text.length > 0) {
    this.ops.push(['+', text.length]);
    this.charBank += text;
  }
  var after = this.baseLen - fromOffset - removed;
  if (after > 0) {
    this.ops.push(['=', after]);
  }
  return this;
}

/**
 * Returns a new changeset, the result of composing this with
 * a new changeset.
 */
Changeset.prototype.applyChangeset = function(newCs) {

  var line = 0;
  var ch = 0;
  for (var i = 0; i < this.ops.length; ++i) {

  }
  return this;
};
