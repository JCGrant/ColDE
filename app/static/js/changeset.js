
/**
 * Class representing a changeset, mostly used for local manipulation.
 */
function Changeset(baseTextLen) {
  // Base length of the revision we apply the changeset on.
  this.baseLen = this.newLen = baseTextLen;
  // One skip everything operation.
  this.ops = [['|', baseTextLen]];
  // Empty char bank.
  this.ops = "";
}

/**
 * Applies a change in the code mirror format to a changeset.
 */
Changeset.prototype.applyCodeMirrorChangeset = function(cmcs) {

  
};