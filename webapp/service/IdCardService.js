sap.ui.define([
  "sap/ui/core/library",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "com/jhah/zhrjhahseclp/service/ODataReader"
], (coreLibrary, Filter, FilterOperator, ODataReader) => {
  "use strict";

  const ValueState = coreLibrary.ValueState;

  const STATUS_PENDING = "PEN";
  const MAX_REQUESTS = 5;
  /** A card this close to its expiry date is flagged as expiring soon. */
  const EXPIRY_WARNING_DAYS = 30;
  /** Validity of a standard card, the scale of the expiry gauge. */
  const CARD_VALIDITY_DAYS = 365;

  /**
   * Reads the ID Management System figures (ID service).
   */
  return {
    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The ID service model
     * @returns {Promise<object>} Organization-wide request counts
     */
    async readAdminKpi(oModel) {
      const oKpi = (await ODataReader.readFirst(oModel, "/AdminKPI")) || {};

      return {
        totalIdRequests: oKpi.TotalIdRequests || 0,
        approvedCards: oKpi.ApprovedCards || 0,
        pendingReview: oKpi.PendingReview || 0,
        rejectedCards: oKpi.RejectedCards || 0,
      };
    },

    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The ID service model
     * @param {string} [sCreatedBy] Restricts the result to requests created by this user
     * @returns {Promise<object[]>} The first pending ID card requests
     */
    readPendingRequests(oModel, sCreatedBy) {
      const aFilters = [new Filter("Status", FilterOperator.EQ, STATUS_PENDING)];
      if (sCreatedBy) {
        aFilters.push(new Filter("CreatedBy", FilterOperator.EQ, sCreatedBy));
      }

      return ODataReader.readList(oModel, "/Header", {
        filters: aFilters,
        length: MAX_REQUESTS,
      });
    },

    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The ID service model
     * @returns {Promise<object|undefined>} The user's active ID card, if they have one
     */
    async readActiveCard(oModel) {
      const oCard = await ODataReader.readFirst(oModel, "/activeID");
      if (!oCard) {
        return undefined;
      }

      const iDays = parseInt(oCard.DaystoExpire, 10);
      const bHasDays = !isNaN(iDays);
      const bExpiringSoon = bHasDays && iDays <= EXPIRY_WARNING_DAYS;

      return {
        hasData: !!oCard.IdNumber,
        idNumber: oCard.IdNumber || "-",
        daysToExpire: bHasDays ? String(iDays) : "-",
        isExpiringSoon: bExpiringSoon,
        // A visual gauge of the remaining validity, not a backend figure.
        expiryPercent: bHasDays
          ? Math.max(0, Math.min(100, Math.round((iDays / CARD_VALIDITY_DAYS) * 100)))
          : 0,
        statusState: bExpiringSoon ? ValueState.Warning : ValueState.Success,
      };
    },
  };
});
