sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/Device",
  "com/jhah/zhrjhahseclp/model/sections"
], (JSONModel, Device, sections) => {
  "use strict";

  const NO_VALUE = "-";

  return {
    /**
     * Provides runtime information for the device the UI5 app is running on as a JSONModel.
     * @returns {sap.ui.model.json.JSONModel} The device model.
     */
    createDeviceModel() {
      const oModel = new JSONModel(Device);
      oModel.setDefaultBindingMode("OneWay");
      return oModel;
    },

    /**
     * Creates the view model behind the dashboard. Every node starts in its
     * "no data" state and is filled by Main.controller as the backend
     * answers, so a failed read simply leaves the placeholder on screen.
     *
     * @returns {sap.ui.model.json.JSONModel} The dashboard model.
     */
    createDashboardModel() {
      const sAssetRoot = sap.ui.require.toUrl("com/jhah/zhrjhahseclp/assets");

      // Per section: whether the user may see the admin view, and the view
      // currently shown. An empty view mode means the user has no access.
      const mSections = {};
      sections.getAll().forEach((oSection) => {
        mSections[oSection.key] = { isAdmin: false, viewMode: "" };
      });

      return new JSONModel({
        logoUrl: sAssetRoot + "/logo_new.png",
        patternUrl: sAssetRoot + "/pattern.png",

        // Side navigation entries the user is authorized for.
        navItems: [],
        selectedNavKey: sections.DASHBOARD_KEY,
        // True while another application is embedded in place of the dashboard.
        isEmbedFrame: false,

        sections: mSections,
        // True if the user administers at least one section. The view toggle
        // is then shown on every section, disabled where they are no admin.
        hasAdminSection: false,

        user: {
          id: NO_VALUE,
          loginId: NO_VALUE,
          name: NO_VALUE,
          initials: NO_VALUE,
          role: NO_VALUE,
          position: NO_VALUE,
          department: NO_VALUE,
          governmentId: NO_VALUE,
          dob: NO_VALUE,
          gender: NO_VALUE,
          bloodGroup: NO_VALUE,
          email: NO_VALUE,
        },

        visitor: {
          kpi: { total: 0, approved: 0, inProgress: 0 },
          // Requests per visitor category, as { category, count }.
          chart: [],
        },

        // Each view of the ID card section is element-bound to its own node,
        // so the two never read or overwrite each other's data.
        idCard: {
          admin: {
            kpi: {
              totalIdRequests: 0,
              approvedCards: 0,
              pendingReview: 0,
              rejectedCards: 0,
            },
            requests: [],
          },
          employee: {
            active: {
              hasData: false,
              idNumber: NO_VALUE,
              daysToExpire: NO_VALUE,
              isExpiringSoon: false,
              expiryPercent: 0,
              statusState: "None",
            },
            requests: [],
          },
        },

        violations: {
          admin: {
            hasData: false,
            raisedToday: 0,
            last30Days: 0,
            pendingReview: 0,
            total: 0,
            stagnantTickets: 0,
            criticalIncidents: 0,
            processed: 0,
            rejected: 0,
            activePoints: 0,
          },
          employee: {
            kpi: {
              hasData: false,
              inProgress: 0,
              last12Months: 0,
              lifetime: 0,
            },
            requests: [],
          },
        },

        // The KPI row is element-bound to the node of the view it sits in;
        // the user's own stickers (`own`) are shared by both views.
        sticker: {
          admin: {
            hasKpiData: false,
            kpi: { total: 0, approved: 0, inProgress: 0, rejected: 0 },
          },
          employee: {
            hasKpiData: false,
            kpi: { total: 0, approved: 0, inProgress: 0, rejected: 0 },
          },
          own: {
            requests: [],
            active: { hasData: false },
          },
        },
      });
    },
  };
});
