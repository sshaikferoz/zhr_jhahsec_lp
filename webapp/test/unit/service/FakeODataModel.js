sap.ui.define([], () => {
	"use strict";

	/**
	 * Minimal stand-in for an OData V4 model: every list binding answers with
	 * the given entities, or rejects with the given error. The bindings and
	 * their requests are recorded for inspection.
	 */
	return class FakeODataModel {
		constructor(vResult) {
			this.bindings = [];
			this._vResult = vResult;
		}

		bindList(sPath, oContext, vSorters, vFilters, mParameters) {
			const vResult = this._vResult;
			const oBinding = {
				path: sPath,
				filters: vFilters,
				parameters: mParameters,
				destroyed: false,
				requestContexts(iStart, iLength) {
					oBinding.start = iStart;
					oBinding.length = iLength;
					if (vResult instanceof Error) {
						return Promise.reject(vResult);
					}
					const aEntities = iLength === undefined ? vResult : vResult.slice(iStart, iStart + iLength);
					return Promise.resolve(aEntities.map((oEntity) => ({ getObject: () => oEntity })));
				},
				destroy() {
					oBinding.destroyed = true;
				}
			};

			this.bindings.push(oBinding);
			return oBinding;
		}
	};
});
