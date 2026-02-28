// math.js — core math utilities

function add(a, b) {
    return a + b; // BUG: wrong operator
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

module.exports = { add, subtract, multiply };
