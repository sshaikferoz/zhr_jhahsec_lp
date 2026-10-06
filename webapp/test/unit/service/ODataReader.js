/*global QUnit*/

sap.ui.define([
	"com/jhah/zhrjhahseclp/service/ODataReader",
	"com/jhah/zhrjhahseclp/test/unit/service/FakeODataModel"
], (ODataReader, FakeODataModel) => {
	"use strict";

	QUnit.module("service/ODataReader");

	QUnit.test("readList returns the entities and passes the options to the binding", async (assert) => {
		assert.expect(6);
		const oModel = new FakeODataModel([{ Id: "1" }, { Id: "2" }, { Id: "3" }]);
		const aFilters = [{}];
		const mParameters = { $select: "Id" };

		const aEntities = await ODataReader.readList(oModel, "/Entities", {
			filters: aFilters,
			parameters: mParameters,
			length: 2
		});

		const oBinding = oModel.bindings[0];
		assert.deepEqual(aEntities, [{ Id: "1" }, { Id: "2" }], "entities, limited to the requested length");
		assert.strictEqual(oBinding.path, "/Entities");
		assert.strictEqual(oBinding.filters, aFilters);
		assert.strictEqual(oBinding.parameters, mParameters);
		assert.strictEqual(oBinding.length, 2);
		assert.ok(oBinding.destroyed, "the temporary binding is destroyed");
	});

	QUnit.test("readList destroys its binding when the read fails", async (assert) => {
		assert.expect(2);
		const oError = new Error("backend unreachable");
		const oModel = new FakeODataModel(oError);

		try {
			await ODataReader.readList(oModel, "/Entities");
		} catch (oCaught) {
			assert.strictEqual(oCaught, oError, "the failure reaches the caller");
		}

		assert.ok(oModel.bindings[0].destroyed, "the temporary binding is destroyed");
	});

	QUnit.test("readFirst requests a single entity", async (assert) => {
		assert.expect(3);
		const oModel = new FakeODataModel([{ Id: "1" }, { Id: "2" }]);

		assert.deepEqual(await ODataReader.readFirst(oModel, "/Entities"), { Id: "1" });
		assert.strictEqual(oModel.bindings[0].length, 1);
		assert.strictEqual(await ODataReader.readFirst(new FakeODataModel([]), "/Entities"), undefined, "nothing to read");
	});
});
