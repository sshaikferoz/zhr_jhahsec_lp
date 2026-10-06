/*global QUnit*/

sap.ui.define([
	"com/jhah/zhrjhahseclp/service/StickerService",
	"com/jhah/zhrjhahseclp/test/unit/service/FakeODataModel"
], (StickerService, FakeODataModel) => {
	"use strict";

	QUnit.module("service/StickerService");

	QUnit.test("readKpis reads the organization-wide or the user's own counts", async (assert) => {
		assert.expect(3);
		const oModel = new FakeODataModel([
			{ TotalRequests: 120, ApprovedRequests: 80, InProgressRequests: 30, RejectedRequests: 10 }
		]);

		const oAdminKpis = await StickerService.readKpis(oModel, true);
		await StickerService.readKpis(oModel, false);

		assert.deepEqual(oAdminKpis, {
			hasKpiData: true,
			kpi: { total: 120, approved: 80, inProgress: 30, rejected: 10 }
		});
		assert.strictEqual(oModel.bindings[0].path, "/StickerKPI(true)/Set");
		assert.strictEqual(oModel.bindings[1].path, "/StickerKPI(false)/Set");
	});

	QUnit.test("readKpis returns nothing when the service has no counts", async (assert) => {
		assert.expect(1);

		assert.strictEqual(await StickerService.readKpis(new FakeODataModel([]), true), undefined);
	});

	QUnit.test("readOwnStickers maps the stickers and takes the first as the active one", async (assert) => {
		assert.expect(3);
		const oModel = new FakeODataModel([{
			StkReqId: "0000673537",
			StkReqIdStr: "673537",
			StkTypeDesc: "Permanent",
			Status: "Active",
			StatsCriticality: 3,
			ExpireDate: "2026-12-31",
			PlateNumEng: "RYD 8821",
			ManufacturerDesc: "Toyota",
			ColorDesc: "White",
			DraftUUID: "11111111-2222-3333-4444-555555555555",
			IsActiveEntity: true
		}, {
			StkReqId: "0000635272"
		}]);

		const oStickers = await StickerService.readOwnStickers(oModel);

		assert.deepEqual(oStickers.requests[0], {
			reqIdStr: "673537",
			type: "Permanent",
			status: "Active",
			statusState: "Success",
			expiry: "31/12/2026",
			plate: "RYD 8821",
			vehicle: "Toyota · White",
			objectPagePath: "/StickerMaster(StkReqId='0000673537',DraftUUID=11111111-2222-3333-4444-555555555555,IsActiveEntity=true)"
		}, "a complete sticker");
		assert.deepEqual(oStickers.requests[1], {
			reqIdStr: "0000635272",
			type: "-",
			status: "-",
			statusState: "None",
			expiry: "-",
			plate: "-",
			vehicle: "",
			objectPagePath: "/StickerMaster(StkReqId='0000635272',DraftUUID=00000000-0000-0000-0000-000000000000,IsActiveEntity=true)"
		}, "a sticker with only its key");
		assert.deepEqual(oStickers.active, { hasData: true, ...oStickers.requests[0] }, "the first sticker is the active one");
	});

	QUnit.test("readOwnStickers reports no active sticker when the user has none", async (assert) => {
		assert.expect(1);

		assert.deepEqual(await StickerService.readOwnStickers(new FakeODataModel([])), {
			requests: [],
			active: { hasData: false }
		});
	});
});
