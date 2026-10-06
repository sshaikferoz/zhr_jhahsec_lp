sap.ui.define([
  "com/jhah/zhrjhahseclp/service/ODataReader"
], (ODataReader) => {
  "use strict";

  const MAX_EMPLOYEE_ROWS = 50;

  function trimLeadingZeros(sValue) {
    return String(sValue || "").replace(/^0+/, "");
  }

  /**
   * /employeeKPI is expected to return only the caller's row. Should it ever
   * return more, the user's own row is the one matching their personnel
   * number or login ID.
   *
   * @param {object[]} aRows Entities of /employeeKPI
   * @param {{personnelNumber: string, loginId: string}} oUser The current user
   * @returns {object|undefined} The user's own row
   */
  function findOwnRow(aRows, oUser) {
    if (aRows.length === 1) {
      return aRows[0];
    }

    const sPersonnelNumber = trimLeadingZeros(oUser.personnelNumber);
    const sLoginId = String(oUser.loginId || "").toUpperCase();

    return aRows.find(
      (oRow) =>
        (sPersonnelNumber && trimLeadingZeros(oRow.Pernr) === sPersonnelNumber) ||
        (sLoginId && String(oRow.userid || "").toUpperCase() === sLoginId)
    );
  }

  /**
   * Reads the Traffic Violation System figures (TVS service).
   */
  return {
    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The TVS service model
     * @returns {Promise<object|undefined>} Organization-wide violation
     *   counts, if the service has any
     */
    async readAdminKpis(oModel) {
      const oKpi = await ODataReader.readFirst(oModel, "/adminKPI");
      if (!oKpi) {
        return undefined;
      }

      return {
        hasData: true,
        raisedToday: oKpi.ViolationsRaisedToday || 0,
        last30Days: oKpi.ViolationsLast30Days || 0,
        pendingReview: oKpi.TotalPendingReview || 0,
        total: oKpi.TotalAppViolations || 0,
        stagnantTickets: oKpi.TotalStagnantTickets || 0,
        criticalIncidents: oKpi.TotalCriticalIncidents || 0,
        processed: oKpi.TotalProcessed || 0,
        rejected: oKpi.TotalRejected || 0,
        activePoints: oKpi.TotalSystemActivePoints || 0,
      };
    },

    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The TVS service model
     * @param {Promise<{personnelNumber: string, loginId: string}>} pUser The
     *   current user; may still be loading, the read does not wait for it
     * @returns {Promise<object|undefined>} The user's own violation counts,
     *   if the service has any for them
     */
    async readEmployeeKpis(oModel, pUser) {
      const [aRows, oUser] = await Promise.all([
        ODataReader.readList(oModel, "/employeeKPI", {
          length: MAX_EMPLOYEE_ROWS,
        }),
        pUser,
      ]);
      const oKpi = findOwnRow(aRows, oUser);
      if (!oKpi) {
        return undefined;
      }

      return {
        hasData: true,
        inProgress: oKpi.InProgressViolationCount || 0,
        last12Months: oKpi.ViolationCountLast12Months || 0,
        lifetime: oKpi.LifetimeViolationsCount || 0,
      };
    },
  };
});
