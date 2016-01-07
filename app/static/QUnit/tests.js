QUnit.test('My first test', function(assert) {
   assert.deepEqual(count_lines('Hello \n\r Wor\nld!'), 3);
});