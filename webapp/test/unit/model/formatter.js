/*global QUnit*/

sap.ui.define([
	"com/jhah/zhrjhahseclp/model/formatter"
], (formatter) => {
	"use strict";

	QUnit.module("model/formatter");

	QUnit.test("abapDate formats YYYYMMDD as DD/MM/YYYY", (assert) => {
		assert.strictEqual(formatter.abapDate("19830101"), "01/01/1983");
		assert.strictEqual(formatter.abapDate("20261231"), "31/12/2026");
	});

	QUnit.test("abapDate returns an empty string for initial and invalid dates", (assert) => {
		assert.strictEqual(formatter.abapDate("00000000"), "", "initial ABAP date");
		assert.strictEqual(formatter.abapDate("1983-01-01"), "", "wrong format");
		assert.strictEqual(formatter.abapDate(""), "", "empty");
		assert.strictEqual(formatter.abapDate(undefined), "", "missing");
	});

	QUnit.test("isoDate formats the date part of an OData date as DD/MM/YYYY", (assert) => {
		assert.strictEqual(formatter.isoDate("2026-12-31"), "31/12/2026", "Edm.Date");
		assert.strictEqual(formatter.isoDate("2026-12-31T10:15:00Z"), "31/12/2026", "Edm.DateTimeOffset");
	});

	QUnit.test("isoDate returns a dash when there is no date", (assert) => {
		assert.strictEqual(formatter.isoDate(null), "-", "null");
		assert.strictEqual(formatter.isoDate(undefined), "-", "missing");
		assert.strictEqual(formatter.isoDate("20261231"), "-", "wrong format");
	});

	QUnit.test("initials takes the first letters of the first two names", (assert) => {
		assert.strictEqual(formatter.initials("Jane Doe"), "JD");
		assert.strictEqual(formatter.initials("  jane   mary doe "), "JM", "extra whitespace, lower case, three names");
		assert.strictEqual(formatter.initials("Jane"), "J", "single name");
		assert.strictEqual(formatter.initials(undefined), "", "missing");
	});

	QUnit.test("criticalityState maps UI.Criticality to a value state", (assert) => {
		assert.strictEqual(formatter.criticalityState(1), "Error");
		assert.strictEqual(formatter.criticalityState(2), "Warning");
		assert.strictEqual(formatter.criticalityState(3), "Success");
		assert.strictEqual(formatter.criticalityState(0), "None", "neutral");
		assert.strictEqual(formatter.criticalityState(undefined), "None", "missing");
	});
});
