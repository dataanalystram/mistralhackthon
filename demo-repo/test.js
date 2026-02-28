// test.js — Simple test runner for demo-repo
const { add, subtract, multiply } = require('./src/math');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ FAIL: ${name}`);
        console.log(`     Expected: ${err.expected}, Got: ${err.actual}`);
        failed++;
    }
}

function assert(actual, expected, msg) {
    if (actual !== expected) {
        const err = new Error(msg);
        err.actual = actual;
        err.expected = expected;
        throw err;
    }
}

console.log('\n🧪 Running tests...\n');

test('add(2, 3) should return 5', () => {
    assert(add(2, 3), 5, 'add(2,3) failed');
});

test('add(0, 0) should return 0', () => {
    assert(add(0, 0), 0, 'add(0,0) failed');
});

test('add(-1, 1) should return 0', () => {
    assert(add(-1, 1), 0, 'add(-1,1) failed');
});

test('subtract(5, 3) should return 2', () => {
    assert(subtract(5, 3), 2, 'subtract(5,3) failed');
});

test('multiply(4, 3) should return 12', () => {
    assert(multiply(4, 3), 12, 'multiply(4,3) failed');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    console.log('❌ TESTS FAILED');
    process.exit(1);
} else {
    console.log('✅ ALL TESTS PASSED');
    process.exit(0);
}
