sap.ui.define(["sap/ui/core/library"], (coreLibrary) => {
  "use strict";

  const ValueState = coreLibrary.ValueState;

  const NO_VALUE = "-";

  /** UI.Criticality values as delivered by the backend. */
  const CRITICALITY_STATES = {
    1: ValueState.Error,
    2: ValueState.Warning,
    3: ValueState.Success,
  };

  return {
    /**
     * Formats an ABAP date string for display.
     *
     * @param {string} sDate Date as "YYYYMMDD"
     * @returns {string} Date as "DD/MM/YYYY"; empty for an initial or invalid date
     */
    abapDate(sDate) {
      if (!/^\d{8}$/.test(sDate) || sDate === "00000000") {
        return "";
      }
      return `${sDate.substring(6, 8)}/${sDate.substring(4, 6)}/${sDate.substring(0, 4)}`;
    },

    /**
     * Formats an OData V4 Edm.Date / Edm.DateTimeOffset string for display.
     *
     * @param {string} sDate Date starting with "YYYY-MM-DD"
     * @returns {string} Date as "DD/MM/YYYY"; "-" if there is none
     */
    isoDate(sDate) {
      const aMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(sDate);
      return aMatch ? `${aMatch[3]}/${aMatch[2]}/${aMatch[1]}` : NO_VALUE;
    },

    /**
     * @param {string} sName Full name
     * @returns {string} Up to two upper-case initials
     */
    initials(sName) {
      return (sName || "")
        .trim()
        .split(/\s+/)
        .map((sPart) => sPart.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();
    },

    /**
     * @param {int} iCriticality UI.Criticality value (1 negative, 2 critical, 3 positive)
     * @returns {sap.ui.core.ValueState} The matching value state
     */
    criticalityState(iCriticality) {
      return CRITICALITY_STATES[iCriticality] || ValueState.None;
    },
  };
});
