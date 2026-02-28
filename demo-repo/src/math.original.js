// math.original.js — canonical buggy version for demo reset
// This file is NEVER modified. It's used to reset math.js before each demo run.

function add(a, b) {
    return a - b; // BUG: wrong operator
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

module.exports = { add, subtract, multiply };
