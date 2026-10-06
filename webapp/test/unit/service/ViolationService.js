/*global QUnit*/

sap.ui.define([
	"com/jhah/zhrjhahseclp/service/ViolationService",
	"com/jhah/zhrjhahseclp/test/unit/service/FakeODataModel"
], (ViolationService, FakeODataModel) => {
	"use strict";

	const OTHER_ROW = { Pernr: "00099999", userid: "OTHER", InProgressViolationCount: 9 };
	const OWN_ROW = {
		Pernr: "00012345",
		userid: "jdoe",
		InProgressViolationCount: 1,
		ViolationCountLast12Months: 2,
		LifetimeViolationsCount: 5
	};
	const OWN_KPIS = { hasData: true, inProgress: 1, last12Months: 2, lifetime: 5 };

	QUnit.module("service/ViolationService");

	QUnit.test("readEmployeeKpis takes a single row as the user's own", async (assert) => {
		assert.expect(1);
		const oModel = new FakeODataModel([OWN_ROW]);

		assert.deepEqual(await ViolationService.readEmployeeKpis(oModel, Promise.resolve({})), OWN_KPIS);
	});

	QUnit.test("readEmployeeKpis finds the user's row by personnel number, ignoring leading zeros", async (assert) => {
		assert.expect(1);
		const oModel = new FakeODataModel([OTHER_ROW, OWN_ROW]);
		const pUser = Promise.resolve({ personnelNumber: "12345", loginId: "" });

		assert.deepEqual(await ViolationService.readEmployeeKpis(oModel, pUser), OWN_KPIS);
	});

	QUnit.test("readEmployeeKpis finds the user's row by login ID, ignoring case", async (assert) => {
		assert.expect(1);
		const oModel = new FakeODataModel([OTHER_ROW, OWN_ROW]);
		const pUser = Promise.resolve({ personnelNumber: undefined, loginId: "JDOE" });

		assert.deepEqual(await ViolationService.readEmployeeKpis(oModel, pUser), OWN_KPIS);
	});

	QUnit.test("readEmployeeKpis returns nothing rather than another user's row", async (assert) => {
		assert.expect(2);
		const pUser = Promise.resolve({ personnelNumber: "77777", loginId: "NOBODY" });

		assert.strictEqual(
			await ViolationService.readEmployeeKpis(new FakeODataModel([OTHER_ROW, OWN_ROW]), pUser),
			undefined,
			"no matching row"
		);
		assert.strictEqual(
			await ViolationService.readEmployeeKpis(new FakeODataModel([]), pUser),
			undefined,
			"no rows at all"
		);
	});
});
