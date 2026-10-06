/*global QUnit*/

sap.ui.define([
	"com/jhah/zhrjhahseclp/model/sections"
], (sections) => {
	"use strict";

	QUnit.module("model/sections");

	QUnit.test("getInitialViewMode opens a section in the view matching the role", (assert) => {
		assert.strictEqual(sections.getInitialViewMode("ADMIN"), "admin");
		assert.strictEqual(sections.getInitialViewMode("EMPLOYEE"), "employee");
	});

	QUnit.test("getInitialViewMode grants no access for any other role", (assert) => {
		assert.strictEqual(sections.getInitialViewMode(""), null, "no role");
		assert.strictEqual(sections.getInitialViewMode(undefined), null, "missing");
		assert.strictEqual(sections.getInitialViewMode("admin"), null, "roles are case-sensitive");
	});

	QUnit.test("every section defines an intent and a fragment per view", (assert) => {
		sections.getAll().forEach((oSection) => {
			assert.strictEqual(sections.get(oSection.key), oSection, `${oSection.key} is found by its key`);
			assert.ok(oSection.intent.semanticObject && oSection.intent.action, `${oSection.key} has an intent`);
			assert.ok(oSection.fragments.admin && oSection.fragments.employee, `${oSection.key} has both fragments`);
		});
	});
});
