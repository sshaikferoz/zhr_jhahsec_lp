/*global QUnit*/

sap.ui.define([
	"com/jhah/zhrjhahseclp/util/shellUrl"
], (shellUrl) => {
	"use strict";

	const SHELL = "https://launchpad.example.com/site";
	const INTENT = { semanticObject: "StickerMaster", action: "manage" };

	QUnit.module("util/shellUrl");

	QUnit.test("buildIntentUrl opens the intent in a headerless shell", (assert) => {
		assert.strictEqual(
			shellUrl.buildIntentUrl(SHELL, INTENT),
			"https://launchpad.example.com/site?sap-ushell-config=headerless#StickerMaster-manage"
		);
		assert.strictEqual(
			shellUrl.buildIntentUrl(SHELL + "?siteId=1", INTENT),
			"https://launchpad.example.com/site?siteId=1&sap-ushell-config=headerless#StickerMaster-manage",
			"appends to an existing query string"
		);
	});

	QUnit.test("buildIntentUrl separates intent parameters with '?' and the inner route with '&/'", (assert) => {
		assert.strictEqual(
			shellUrl.buildIntentUrl(SHELL, { ...INTENT, params: { admin: true } }),
			"https://launchpad.example.com/site?sap-ushell-config=headerless#StickerMaster-manage?admin=true"
		);
		assert.strictEqual(
			shellUrl.buildIntentUrl(SHELL, { ...INTENT, params: { admin: true }, innerRoute: "/StickerMaster(StkReqId='1')" }),
			"https://launchpad.example.com/site?sap-ushell-config=headerless#StickerMaster-manage?admin=true&/StickerMaster(StkReqId='1')"
		);
	});
});
