const { suite, test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
require("../build.js");

suite("map", () => {

    test("build", () => {
        const map = new Build.Models.Map([]);
    });

});