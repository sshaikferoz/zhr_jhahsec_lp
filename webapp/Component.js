sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "com/jhah/zhrjhahseclp/model/models",
  ],
  function (UIComponent, JSONModel, models) {
    "use strict";

    var PERSONA_CONFIG = {
      EMPLOYEE: {
        pageTitle: "Employee Dashboard",
        roleLabel: "Employee",
        navItems: [
          {
            key: "dashboard",
            title: "Dashboard",
            icon: "sap-icon://home",
            selected: true,
          },
          {
            key: "violations",
            title: "Traffic Violation System",
            icon: "sap-icon://warning",
          },
          {
            key: "sticker",
            title: "Sticker Management",
            icon: "sap-icon://car-rental",
          },
          {
            key: "id",
            title: "ID Management System",
            icon: "sap-icon://badge",
          },
        ],
      },
      COORDINATOR: {
        pageTitle: "Coordinator Dashboard",
        roleLabel: "Coordinator",
        navItems: [
          {
            key: "dashboard",
            title: "Dashboard",
            icon: "sap-icon://home",
            selected: true,
          },
          {
            key: "vendor",
            title: "Business Visitor Access",
            icon: "sap-icon://supplier",
          },
          {
            key: "violations",
            title: "Traffic Violation System",
            icon: "sap-icon://warning",
          },
          {
            key: "sticker",
            title: "Sticker Management",
            icon: "sap-icon://car-rental",
          },
          {
            key: "id",
            title: "ID Management System",
            icon: "sap-icon://badge",
          },
        ],
      },
      SECURITY: {
        pageTitle: "Security Dashboard",
        roleLabel: "Security",
        department: "Security",
        navItems: [
          {
            key: "dashboard",
            title: "Dashboard",
            icon: "sap-icon://home",
            selected: true,
          },
          {
            key: "vendor",
            title: "Business Visitor Access",
            icon: "sap-icon://supplier",
          },
          {
            key: "violations",
            title: "Traffic Violation System",
            icon: "sap-icon://warning",
          },
          {
            key: "sticker",
            title: "Sticker Management",
            icon: "sap-icon://car-rental",
          },
          {
            key: "id",
            title: "ID Management System",
            icon: "sap-icon://badge",
          },
        ],
      },
      ADMIN: {
        pageTitle: "Admin Dashboard",
        roleLabel: "Administrator",
        navItems: [
          {
            key: "dashboard",
            title: "Dashboard",
            icon: "sap-icon://home",
            selected: true,
          },
          {
            key: "vendor",
            title: "Business Visitor Access",
            icon: "sap-icon://supplier",
          },
          {
            key: "violations",
            title: "Traffic Violation System",
            icon: "sap-icon://warning",
          },
          {
            key: "sticker",
            title: "Sticker Management",
            icon: "sap-icon://car-rental",
          },
          {
            key: "id",
            title: "ID Management System",
            icon: "sap-icon://badge",
          },
        ],
      },
    };

    return UIComponent.extend("com.jhah.zhrjhahseclp.Component", {
      metadata: {
        manifest: "json",
        interfaces: ["sap.ui.core.IAsyncContentCreation"],
      },

      init: function () {
        UIComponent.prototype.init.apply(this, arguments);

        this.setModel(models.createDeviceModel(), "device");

        var sRole = this._getInitialRole();
        var oPersona = PERSONA_CONFIG[sRole] || PERSONA_CONFIG.EMPLOYEE;

        var sAssetBase =
          sap.ui.require.toUrl("com/jhah/zhrjhahseclp") + "/assets/";

        var oDashboardModel = new JSONModel({
          role: sRole,
          pageTitle: oPersona.pageTitle,
          selectedNavKey: "dashboard",
          isEmbedFrame: false,
          embedTitle: "",
          viewMode: "org", // "org" = admin/full-org view, "my" = personal view
          isAdmin: true, // Security role starts in admin (org) mode
          logoUrl: sAssetBase + "logo_new.png",
          patternUrl: sAssetBase + "pattern.png",
          user: {
            name: "-",
            role: "-",
            position: "-",
            id: "-",
            loginId: "-",
            badgeNo: "-",
            governmentId: "-",
            department: "-",
            dob: "-",
            bloodGroup: "-",
            email: "-",
            initials: "-",
          },
          navItems: oPersona.navItems,
          // Sticker Management section state.
          //  - isAdmin drives whether the KPI-card view (Sticker Admin) or the
          //    user-specific view (Active Sticker + Request Status) is shown.
          //  - kpis feed the admin card row (StickerKPI(true)/Set).
          //  - userKpis / active / requests feed the user view (StickerMaster).
          sticker: {
            isAdmin: false,
            hasKpiData: false,
            kpis: [
              {
                title: "Total Requests",
                value: "0",
                accent: "jhahAccentBlue",
                valueState: "None",
              },
              {
                title: "Approved",
                value: "0",
                accent: "jhahAccentGreen",
                valueState: "Success",
              },
              {
                title: "In Progress",
                value: "0",
                accent: "jhahAccentOrange",
                valueState: "Warning",
              },
              {
                title: "Rejected",
                value: "0",
                accent: "jhahAccentRed",
                valueState: "Error",
              },
            ],
            hasUserData: false,
            userKpis: [
              {
                title: "My Requests",
                value: "0",
                accent: "jhahAccentBlue",
                valueState: "None",
              },
              {
                title: "In Progress",
                value: "0",
                accent: "jhahAccentOrange",
                valueState: "Warning",
              },
              {
                title: "Active",
                value: "0",
                accent: "jhahAccentGreen",
                valueState: "Success",
              },
            ],
            active: {
              hasData: false,
              plate: "",
              type: "",
              vehicle: "",
              expiry: "",
              status: "",
              statusState: "None",
            },
            requests: [],
          },
          // Per-application access, keyed by nav item key. Replaced with the
          // user's real authorizations once EmployeeHeader is read (see
          // Main.controller#_buildAccessMap); each dashboard KPI section binds
          // its visibility to the flag of the app it belongs to. Defaults to
          // full access so that a failed/unavailable header read leaves the
          // dashboard as complete as the unfiltered nav items.
          access: {
            vendor: true,
            violations: true,
            sticker: true,
            id: true,
          },
          /* NOTE: Mock data below is temporarily unused — the Sticker, ID
             Management, Traffic Violation and Appointments sections now render
             a "No data available" placeholder until the real endpoints are
             wired up. Kept for reference / re-enabling later.
          sticker: {
            plate: "RYD-8821",
            vehicle: "Toyota Land Cruiser - White",
            expiry: "Dec 31, 2026",
            status: "Active",
            requests: [
              {
                requestNo: "673537",
                expiry: "-",
                status: "IN PROGRESS",
                statusState: "Information",
              },
              {
                requestNo: "635272",
                expiry: "May 25, 2026",
                status: "ACTIVE",
                statusState: "Success",
              },
            ],
          },
          stickerKpis: [
            {
              title: "Total In Progress",
              value: "142",
              accent: "jhahAccentBlue",
              valueState: "None",
            },
            {
              title: "Total Raised",
              value: "856",
              accent: "jhahAccentGreen",
              valueState: "Success",
            },
            {
              title: "Total Completed",
              value: "2,419",
              accent: "jhahAccentBlue",
              valueState: "Information",
            },
          ],
          idCard: {
            badgeId: "6473536",
            daysUntilExpiry: "128",
            expiryPercent: 72,
            jhahId: "74846474",
            inProgressId: "6647362",
            inProgressType: "ID Renewal",
          },
          idKpis: [
            {
              title: "Total ID Request",
              value: "2,419",
              accent: "jhahAccentBlue",
              valueState: "None",
            },
            {
              title: "Approved Cards",
              value: "142",
              accent: "jhahAccentGreen",
              valueState: "Success",
            },
            {
              title: "Pending Review",
              value: "856",
              accent: "jhahAccentOrange",
              valueState: "Warning",
            },
          ],
          idRequests: [
            {
              requestId: "IDC-2026-001",
              employee: "Sarah Jenkins",
              department: "Cyber Operations",
              status: "APPROVED",
              statusState: "Success",
            },
            {
              requestId: "IDC-2026-042",
              employee: "Marcus Thorne",
              department: "Strategic Intelligence",
              status: "PENDING",
              statusState: "Warning",
            },
            {
              requestId: "IDC-2026-089",
              employee: "Elena Rodriguez",
              department: "Logistics & Supply",
              status: "IN PROGRESS",
              statusState: "Information",
            },
            {
              requestId: "IDC-2026-156",
              employee: "Lisa Vandermere",
              department: "Executive Office",
              status: "REJECTED",
              statusState: "Error",
            },
            {
              requestId: "IDC-2026-203",
              employee: "Elena Rodriguez",
              department: "Logistics & Supply",
              status: "IN PROGRESS",
              statusState: "Information",
            },
          ],
          violations: {
            active: 2,
            ytd: 5,
            totalPoints: "35",
            lastViolation: "Oct 20, 2026",
            alertMessage: "Action Needed: Payment overdue for speeding offense",
            securityActive: 42,
            securityYtd: 63,
            categories: [
              { label: "Speeding", percent: 45, state: "Error" },
              { label: "Parking", percent: 30, state: "Warning" },
              { label: "Unauthorized Entry", percent: 25, state: "None" },
            ],
          },
          appointments: [
            {
              day: "24",
              month: "OCT",
              title: "ID Renewal",
              location: "Building A, Level 2 — Security Desk",
              ref: "APPT-9021",
              time: "09:30 AM",
              status: "Scheduled",
            },
            {
              day: "25",
              month: "OCT",
              title: "Sticker Renewal",
              location: "Main Gate, Sticker Booth",
              ref: "APPT-9144",
              time: "11:00 AM",
              status: "Scheduled",
            },
          ],
          scheduledAppointments: [
            {
              officerInitials: "AF",
              officerName: "Ahmed Al-Farsi",
              requestType: "Permanent Vehicle Sticker",
              timeSlot: "14:30 - Oct 24, 2026",
              status: "APPROVED",
              statusState: "Success",
            },
            {
              officerInitials: "SS",
              officerName: "Sultan Saleh",
              requestType: "Temporary Contractor Pass",
              timeSlot: "09:15 - Oct 25, 2026",
              status: "APPROVED",
              statusState: "Success",
            },
            {
              officerInitials: "MK",
              officerName: "Mohammed Khan",
              requestType: "Staff Parking Permit",
              timeSlot: "11:00 - Oct 25, 2026",
              status: "PENDING",
              statusState: "Warning",
            },
          ],
          */
          vendorKpis: [
            {
              title: "Total Requests",
              value: "1,124",
              accent: "jhahAccentBlue",
              valueState: "None",
            },
            {
              title: "Approved",
              value: "982",
              accent: "jhahAccentGreen",
              valueState: "Success",
            },
            {
              title: "Pending",
              value: "142",
              accent: "jhahAccentOrange",
              valueState: "Warning",
            },
          ],
          visitorChart: {
            centerLabel: "78 TODAY",
            data: [
              { Category: "Business", Count: 35 },
              { Category: "Temporary Staff Access", Count: 12 },
              { Category: "Temporary Job", Count: 15 },
              { Category: "Project", Count: 7 },
              { Category: "Other", Count: 9 },
            ],
          },
        });

        this.setModel(oDashboardModel, "dashboard");

        this.getRouter().initialize();
      },

      _getPersonaConfig: function (sRole) {
        return PERSONA_CONFIG[sRole] || PERSONA_CONFIG.COORDINATOR;
      },

      _getInitialRole: function () {
        return "COORDINATOR";
      },
    });
  },
);
