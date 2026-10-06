sap.ui.define([
  "com/jhah/zhrjhahseclp/service/ODataReader"
], (ODataReader) => {
  "use strict";

  /**
   * Reads the Business Visitor Access figures (main service).
   */
  return {
    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The main service model
     * @param {boolean} bAdmin Whether to count all requests rather than the user's own
     * @returns {Promise<{kpi: object, categories: object}|undefined>} Request
     *   counts by status and by visitor category, if the service has any
     */
    async readLandingKpis(oModel, bAdmin) {
      const [oKpi] = await ODataReader.readList(
        oModel,
        `/LandingPageKPI(${Boolean(bAdmin)})/Set`
      );
      if (!oKpi) {
        return undefined;
      }

      return {
        kpi: {
          total: oKpi.TotalRequests,
          approved: oKpi.ApprovedRequests,
          inProgress: oKpi.InProgressRequests,
        },
        categories: {
          business: oKpi.totalBusinessReqs || 0,
          tempStaff: oKpi.totalTempStaffReqs || 0,
          tempJob: oKpi.totalTempJobReqs || 0,
          project: oKpi.totalProjectReqs || 0,
          security: oKpi.totalSecurityRequests || 0,
        },
      };
    },
  };
});
