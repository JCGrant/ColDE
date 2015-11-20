
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
 * Returns true if a (compressed) changeset is identity changeset.
 */
Changeset.prototype.isIdentity = function() {
  if (this.baseLen !== this.newLen) {
    return false;
  }
  return this.ops.length === 1 
    && this.ops[0][0] === '=' && this.ops[0][1] == this.baseLen;
}

/**
 * Compresses a changeset, by combining the same adjacent ops.
 */
Changeset.prototype.compress = function() {
  // Array of compressed ops.
  var compressedOps = [];
  for (var i = 0; i < this.ops.length; ++i) {
    // Compute maximal segment with the same operation.
    var j = i, sum = 0;
    while (j < this.ops.length 
      && this.ops[j][0] === this.ops[i][0]) {
      sum += this.ops[j][1];
      ++j;
    }
    // Merge it.
    compressedOps.push([this.ops[i][0], sum]);
    i = j - 1;
  }
  // Use the compressed ops, instead of the initial ones.
  this.ops = compressedOps;
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

  resultCs.compress();

  return resultCs;
};

var infinity = 2000000000;

Changeset.prototype.mergeChangeset = function(otherCs) {
  console.assert(this.baseLen == otherCs.baseLen, "bad lengths in merge");

  // Initialise the resulting cs.
  resultCs = new Changeset(0);
  resultCs.ops = [];
  resultCs.charBank = "";
  resultCs.baseLen = this.newLen;

  // Init needed pointers.
  var p1 = 0, p2 = 0, left = 0;
  var cbPointer1 = 0, cbPointer2 = 0;
  var endp1 = - 1, endp2 = - 1;
  if (this.ops[0][0] != '+') {
    endp1 += this.ops[0][1];
  }
  if (otherCs.ops[0][1] != '+') {
    endp2 += otherCs.ops[0][1];
  }
  // Add infinite length sentinels, to avoid some particular cases.
  this.ops.push(['', infinity]);
  otherCs.ops.push(['', infinity]);
  // Perform the merge.
  while (p1 < this.ops.length - 1 || p2 < otherCs.ops.length - 1) {
    // Two pluses => keep insertions in A, add insertions from B.
    // Priority has the lexicographically lower change.
    if (this.ops[p1][0] === '+' && otherCs.ops[p2][0] === '+') {
      // Compare charbank substrings to be added here.
      cbss1 = this.charBank.substring(
        cbPointer1, cbPointer1 + this.ops[p1][1]);
      cbss2 = otherCs.charBank.substring(
        cbPointer2, cbPointer2 + otherCs.ops[p2][1]);
      // Prioritise the lower one.
      if (cbss1 <= cbss2) {
        resultCs.ops.push(['=', this.ops[p1][1]]);
        resultCs.ops.push(['+', otherCs.ops[p2][1]]);
      } else {
        resultCs.ops.push(['+', otherCs.ops[p2][1]]);
        resultCs.ops.push(['=', this.ops[p1][1]]);
      }
      // Update pointers.
      cbPointer1 += this.ops[p1][1];
      cbPointer2 += otherCs.ops[p2][1];
      ++p1; endp1 += this.ops[p1][1];
      ++p2; endp2 += otherCs.ops[p2][1];
    } else if (this.ops[p1][0] === '+') {
      // Additions in A become retained chars.
      resultCs.ops.push(['=', this.ops[p1][1]]);
      cbPointer1 += this.ops[p1][1];
      // Update pointer.
      ++p1; endp1 += this.ops[p1][1];
    } else if (otherCs.ops[p2][0] === '+') {
      // Additions in B become additions in B.
      resultCs.ops.push(otherCs.ops[p2]);
      cbPointer2 += otherCs.ops[p2][1];
      ++p2; endp2 += otherCs.ops[p2][1];
    }
    // Check whether afrer processing +'s we must stop.
    if (p1 >= this.ops.length - 1 && p2 >= otherCs.ops.length - 1) {
      break;
    }
    // Compute the right of the current segment.
    var right = Math.min(endp1, endp2);
    if (this.ops[p1][0] === '=') {
      resultCs.ops.push([otherCs.ops[p2][0], right - left + 1]);
    }
    // Increment the pointers that no longer have elements.
    if (endp1 === right) {
      ++p1;
      console.log('p1 is ' + p1 + ' ' + this.ops.length);
      if (this.ops[p1][0] != '+') {
        endp1 += this.ops[p1][1];
      }
    }
    if (endp2 === right) {
      ++p2;
      if (otherCs.ops[p2][0] != '+') {
        endp2 += otherCs.ops[p2][1];
      }
    }
    left = right + 1;
  }
  // Remove infinite length elements.
  this.ops.pop();
  otherCs.ops.pop();

  resultCs.charBank = otherCs.charBank;
  // Compress the resulting changeset.
  resultCs.compress();
  // Compute the new len of the changeset.
  resultCs.newLen = 0;
  for (var i = 0; i < resultCs.ops.length; ++i) {
    if (resultCs.ops[i][0] == '=' || resultCs.ops[i][0] == '+') {
      resultCs.newLen += resultCs.ops[i][1];
    }
  }
  return resultCs;
}

var test = false;
if (test) {
  cs1 = new Changeset(0);
  cs1.baseLen = 11;
  cs1.newLen = 13;
  cs1.ops = [['-', 2], ['+', 1], ['=', 2], ['+', 1], ['=', 4], ['+', 2], ['=', 3]];
  cs1.charBank = "bbbb";

  cs2 = new Changeset(0);
  cs2.baseLen = 11;
  cs2.newLen = 9;
  cs2.ops = [['=', 4], ['-', 4], ['+', 2], ['=', 3]];
  cs2.charBank = "cc";

  var s1 = JSON.stringify(cs1.mergeChangeset(cs2));
  var s2 = JSON.stringify(cs2.mergeChangeset(cs1));
  console.log('f(cs1, cs2) = ' + s1);
  console.log('f(cs2, cs1) = ' + s2);
}
