sap.ui.define([
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "com/jhah/zhrjhahseclp/model/formatter",
  "com/jhah/zhrjhahseclp/model/sections",
  "com/jhah/zhrjhahseclp/service/ODataReader"
], (Filter, FilterOperator, formatter, sections, ODataReader) => {
  "use strict";

  /** Field of /authInfo holding the user's role, per dashboard section. */
  const ROLE_FIELDS = {
    visitor: "VAR_ROLE",
    violations: "TVS_ROLE",
    sticker: "STK_ROLE",
    idCard: "ID_ROLE",
  };

  /**
   * TEMPORARY: roles forced for every user, whatever the backend returns.
   * Carried over unchanged from the previous implementation, which made all
   * users administrators of these two sections. Empty this map to go back to
   * the roles delivered by /authInfo.
   */
  const ROLE_OVERRIDES = {
    sticker: sections.Role.ADMIN,
    idCard: sections.Role.ADMIN,
  };

  /**
   * Reads who the user is and what they may see (authorization service).
   */
  return {
    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The authorization service model
     * @returns {Promise<{userId: string, roles: Object<string,string>}>}
     *   The user's ID and their role per dashboard section key
     */
    async readAuthorization(oModel) {
      const [oAuthInfo] = await ODataReader.readList(oModel, "/authInfo");
      if (!oAuthInfo) {
        throw new Error("The authorization service returned no entry for the user");
      }

      const mRoles = {};
      Object.keys(ROLE_FIELDS).forEach((sKey) => {
        mRoles[sKey] = oAuthInfo[ROLE_FIELDS[sKey]];
      });

      return {
        userId: oAuthInfo.USERID,
        roles: { ...mRoles, ...ROLE_OVERRIDES },
      };
    },

    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The authorization service model
     * @param {string} sUserId Login ID of the user
     * @returns {Promise<object|undefined>} The user's HR profile in the shape
     *   of the dashboard model's /user node, if HR knows the user
     */
    async readUserProfile(oModel, sUserId) {
      const oEmployee = await ODataReader.readFirst(oModel, "/HRInfo", {
        filters: [new Filter("Usrid", FilterOperator.EQ, sUserId)],
      });
      if (!oEmployee) {
        return undefined;
      }

      return {
        id: oEmployee.Pernr || "",
        loginId: oEmployee.Usrid || "",
        name: oEmployee.UserName || "",
        initials: formatter.initials(oEmployee.UserName),
        role: oEmployee.PostionText || "",
        position: oEmployee.PostionText || "",
        department: oEmployee.DepartmentText || "",
        governmentId: oEmployee.GovernmentID || "",
        dob: formatter.abapDate(oEmployee.DOB),
        gender: oEmployee.gender || "",
        bloodGroup: oEmployee.BloodGroup || "",
        email: oEmployee.EMail || "",
      };
    },
  };
});
