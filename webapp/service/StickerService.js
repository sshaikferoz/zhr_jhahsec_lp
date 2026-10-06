sap.ui.define([
  "com/jhah/zhrjhahseclp/model/formatter",
  "com/jhah/zhrjhahseclp/service/ODataReader"
], (formatter, ODataReader) => {
  "use strict";

  const MAX_STICKERS = 2;
  const INITIAL_DRAFT_UUID = "00000000-0000-0000-0000-000000000000";

  /**
   * Path of a sticker request in the Sticker Master application, which is
   * also the route of its object page there.
   *
   * @param {object} oSticker Entity of /Activesticker
   * @returns {string} The key path of the request in /StickerMaster
   */
  function getObjectPagePath(oSticker) {
    const sDraftUUID = oSticker.DraftUUID || INITIAL_DRAFT_UUID;
    const bActive = oSticker.IsActiveEntity !== false;

    return `/StickerMaster(StkReqId='${oSticker.StkReqId}',DraftUUID=${sDraftUUID},IsActiveEntity=${bActive})`;
  }

  /**
   * Reads the Sticker Management figures (sticker service).
   */
  return {
    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The sticker service model
     * @param {boolean} bAdmin Whether to count all requests rather than the user's own
     * @returns {Promise<{hasKpiData: boolean, kpi: object}|undefined>} Request
     *   counts by status, if the service has any
     */
    async readKpis(oModel, bAdmin) {
      const [oKpi] = await ODataReader.readList(
        oModel,
        `/StickerKPI(${Boolean(bAdmin)})/Set`,
        {
          parameters: {
            $select:
              "Dashboard,TotalRequests,ApprovedRequests,InProgressRequests,RejectedRequests",
          },
        }
      );
      if (!oKpi) {
        return undefined;
      }

      return {
        hasKpiData: true,
        kpi: {
          total: oKpi.TotalRequests,
          approved: oKpi.ApprovedRequests,
          inProgress: oKpi.InProgressRequests,
          rejected: oKpi.RejectedRequests,
        },
      };
    },

    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The sticker service model
     * @returns {Promise<{requests: object[], active: object}>} The user's own
     *   stickers, and the first of them as their active sticker
     */
    async readOwnStickers(oModel) {
      const aStickers = await ODataReader.readList(oModel, "/Activesticker", {
        length: MAX_STICKERS,
      });

      const aRequests = aStickers.map((oSticker) => ({
        reqIdStr: oSticker.StkReqIdStr || oSticker.StkReqId,
        type: oSticker.StkTypeDesc || "-",
        status: oSticker.Status || "-",
        statusState: formatter.criticalityState(oSticker.StatsCriticality),
        expiry: formatter.isoDate(oSticker.ExpireDate),
        plate: oSticker.PlateNumEng || oSticker.ArabicPlateNum || "-",
        vehicle: [oSticker.ManufacturerDesc, oSticker.ColorDesc]
          .filter(Boolean)
          .join(" · "),
        objectPagePath: getObjectPagePath(oSticker),
      }));

      return {
        requests: aRequests,
        active: { hasData: aRequests.length > 0, ...aRequests[0] },
      };
    },
  };
});
