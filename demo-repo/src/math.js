// math.js — intentionally buggy: uses subtraction instead of addition
function add(a, b) {
    return a - b; // BUG: should be a + b
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

module.exports = { add, subtract, multiply };
