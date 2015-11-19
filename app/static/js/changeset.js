
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
  if (typeof(lines) === 'undefined') {
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
  console.assert(this.newLen == newCs.baseLen, "bad lengths in composition");

  // Initialise the resulting cs.
  resultCs = new Changeset(0);
  resultCs.ops = [];
  resultCs.charBank = "";
  resultCs.newLen = newCs.newLen;
  resultCs.baseLen = this.baseLen;

  var p = 0, cbPointer1 = 0, cbPointer2 = 0;
  for (var i = 0; i < newCs.ops.length; ++i) {
    var op = newCs.ops[i][0];
    var c = newCs.ops[i][1];
    if (op === '=' || op === '-') {
      while (c > 0) {
        console.log('' + p);
        if (this.ops[p][0] === '-') {
          resultCs.ops.push(this.ops[p]);
          ++p;
        } else { // + or = in the initial cs.
          if (c >= this.ops[p][1]) {
            // We need more than this, so keep the initial operation.
            c -= this.ops[p][1];
            if (op === '=') {
              resultCs.ops.push(this.ops[p]);
            } else {
              if (this.ops[p][0] === '=') {
                resultCs.ops.push(['-', this.ops[p][1]]);
              }
            }
            if (this.ops[p][0] === '+') {
              if (op === '=') {
                resultCs.charBank += this.charBank.substring(
                  cbPointer1, cbPointer1 + this.ops[p][1]);
              }
              cbPointer1 += this.ops[p][1];
            }
            ++p;
          } else {
            // We need to split the initial operation.
            if (this.ops[p][0] === '=') {
              resultCs.ops.push([this.ops[p][0], c]);
            }
            
            if (this.ops[p][0] === '+') {
              if (op === '=') {
                resultCs.ops.push(['+', c]);
                resultCs.charBank += this.charBank.substring(
                  cbPointer1, cbPointer1 + c);
              }
              cbPointer1 += c;
            }
            c = 0;
            this.ops[p][1] -= c;
          }
        }
      }
    } else if (op === '+') {
      resultCs.ops.push(newCs.ops[i]);
      resultCs.charBank += newCs.charBank.substring(
        cbPointer2, cbPointer2 + c);
      cbPointer2 += c;
    } else {
      console.assert(false, "unknown operation");
    }
  }
  while (p < this.ops.length) {
    if (this.ops[p][0] == '-') {
      resultCs.ops.push(this.ops[p]);
    }
    ++p;
  }

  // Compress the resulting changeset.
  compressedOps = [];
  for (var i = 0; i < resultCs.ops.length; ++i) {
    var j = i, sum = 0;
    while (j < resultCs.ops.length 
      && resultCs.ops[j][0] === resultCs.ops[i][0]) {
      sum += resultCs.ops[j][1];
      ++j;
    }
    compressedOps.push([resultCs.ops[i][0], sum]);
    i = j - 1;
  }
  resultCs.ops = compressedOps;

  return resultCs;
};

var infinity = 2000000000;

Changeset.prototype.mergeChangeset = function(otherCs) {
  console.assert(this.baseLen == otherCs.baseLen, "bad lengths in composition");

  // Initialise the resulting cs.
  resultCs = new Changeset(0);
  resultCs.ops = [];
  resultCs.charBank = "";
  resultCs.baseLen = this.baseLen;

  // Perform the merge.
  var p1 = 0, p2 = 0, left = 0;
  var cbPointer1 = 0, cbPointer2 = 0;
  this.ops.push(['', infinity]);
  this.ops.push(['', infinity]);
  while (p1 < this.ops.length - 1 || p2 < otherCs.ops.length - 1) {
    var nextLeft = min(left + this.ops[p1][1], left + otherCs[p2][1]) - 1;
    if (this.ops[p1][0] === '+' && otherCs[p2][0] === '+') {
      cbss1 = this.charBank.substring(cbPointer1, cbPointer1 + this.ops[p1][1]);
      cbss2 = this.charBank.substring(cbPointer2, cbPointer2 + otherCs.ops[p2][1]);
      if (cbss1 <= cbss2) {
        resultCs.ops.push(['=', this.ops[p1][1]]);
        resultCs.ops.push(['+', otherCs.ops[p2][1]]);
      } else {
        resultCs.ops.push(['+', otherCs.ops[p2][1]]);
        resultCs.ops.push(['=', this.ops[p1][1]]);
      }
      cbPointer1 += this.ops[p1][1];
      cbPointer2 += otherCs.ops[p2][1];
      ++p1; ++p2;
    } else if (this.ops[p1][0] === '+') {
      resultCs.ops.push(['=', this.ops[p1][1]]);
      cbPointer1 += this.ops[p1][1];
      ++p1;
    } else if (otherCs[p2][0] === '+') {
      resultCs.ops.push(otherCs[p2]);
      cbPointer2 += otherCs.ops[p2][1];
      ++p2;
    }
    if (this.ops[p1][0] === '=') {
      resultCs.ops.push([otherCs.ops[p2][0], nextLeft - left + 1]);
    }

    if (left + this.ops[p1][1] - 1 === nextLeft) {
      ++p1;
    }
    if (left + otherCs[p2][1] -1 === nextLeft) {
      ++p2;
    }
    left = nextLeft + 1;
  }
  resultCs.charBank = otherCs.charBank;
}
