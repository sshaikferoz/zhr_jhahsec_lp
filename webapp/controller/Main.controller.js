sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/core/HTML",
    "sap/m/MessageStrip",
    "sap/base/Log",
    "sap/ui/model/Sorter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (
    Controller,
    Fragment,
    HTML,
    MessageStrip,
    Log,
    Sorter,
    Filter,
    FilterOperator,
  ) {
    "use strict";

    var SHELL_FRAGMENTS = {
      EMPLOYEE:
        "com.jhah.zhrjhahseclp.fragments.employee.EmployeeDashboardShell",
      COORDINATOR:
        "com.jhah.zhrjhahseclp.fragments.coordinator.CoordinatorDashboardShell",
      SECURITY:
        "com.jhah.zhrjhahseclp.fragments.security.SecurityDashboardShell",
      ADMIN:
        "com.jhah.zhrjhahseclp.fragments.coordinator.CoordinatorDashboardShell",
    };

    return Controller.extend("com.jhah.zhrjhahseclp.controller.Main", {
      onInit: function () {
        this._fetchEmployeeHeaderAndLoad();
        this._fetchActiveIdCard();
      },

      /**
       * Loads the user's active ID card from the ID service (/activeID),
       * reconstructing the reference project's ActiveIdCard fragment contract:
       *  - IdNumber          → the active card's number
       *  - DaystoExpire      → days remaining before expiry
       *  - IsExpiringSoon    → DaystoExpire <= 30, which gates the Renew action
       * The result feeds the dashboard model's /idCard block, which the ID
       * Management section's Active ID Card renders. The card stays in its
       * "No data available" state until a card is returned.
       */
      _fetchActiveIdCard: function () {
        var oIdModel = this.getOwnerComponent().getModel("idmgmt");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oIdModel || !oDashboardModel) {
          return;
        }

        oIdModel
          .bindList("/activeID", undefined, undefined, undefined, {
            $$groupId: "$direct",
          })
          .requestContexts(0, 1)
          .then(function (aContexts) {
            if (!aContexts.length) {
              return;
            }
            var oData = aContexts[0].getObject();
            var iDays = parseInt(oData.DaystoExpire, 10);
            var bExpiring = !isNaN(iDays) && iDays <= 30;

            // Progress bar shows how far the card has moved *toward* expiry, so
            // it fills up as the card ages and is nearly full when expiring
            // soon. Elapsed = validity consumed against a standard 12-month
            // card; a visual gauge, not a precise figure from the backend.
            // (DaystoExpire itself carries the exact remaining count.)
            var iPercent = isNaN(iDays)
              ? 0
              : Math.max(0, Math.min(100, 100 - Math.round((iDays / 365) * 100)));

            oDashboardModel.setProperty("/idCard", {
              hasData: !!oData.IdNumber,
              idNumber: oData.IdNumber || "-",
              daysToExpire: isNaN(iDays) ? "-" : String(iDays),
              isExpiringSoon: bExpiring,
              expiryPercent: iPercent,
              statusText: bExpiring
                ? "Expiring Soon"
                : oData.IdNumber
                  ? "Active"
                  : "",
              statusState: bExpiring ? "Warning" : "Success",
            });
          })
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });
      },

      /**
       * Renew ID Card — opens the ID Management System app in the embedded
       * frame, matching the side-nav "ID Management System" entry. Enabled only
       * when the active card is expiring soon (see the Active ID Card fragment).
       */
      onRenewIdCard: function () {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        var aNavItems = oDashboardModel.getProperty("/navItems") || [];
        aNavItems.forEach(function (oNav, i) {
          oDashboardModel.setProperty(
            "/navItems/" + i + "/selected",
            oNav.key === "id",
          );
        });
        oDashboardModel.setProperty("/selectedNavKey", "id");
        oDashboardModel.setProperty("/embedTitle", "ID Management System");

        this._loadAppInFrame("idmanagementsystem", "manage");
      },

      _fetchEmployeeHeaderAndLoad: function () {
        var oODataModel = this.getOwnerComponent().getModel();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

        if (!oODataModel) {
          this._loadDashboardForRole("COORDINATOR");
          return;
        }

        var oBinding = oODataModel.bindList("/EmployeeHeader");
        oBinding
          .requestContexts()
          .then(
            function (aContexts) {
              var sRole = "COORDINATOR";
              var bAdmin = false;
              var bStickerAdmin = false;
              var bViolationAdmin = false;
              if (aContexts.length) {
                var oUser = aContexts[0].getObject();
                bAdmin = oUser.Admin === "X";
                sRole = bAdmin ? "SECURITY" : "COORDINATOR";

                var oPersona =
                  this.getOwnerComponent()._getPersonaConfig(sRole);
                bStickerAdmin = oUser.StickerAdmin === "X";
                bViolationAdmin = oUser.TVSAdmin === "X";

                var oAccess = this._buildAccessMap(oUser);
                var aNavItems = oPersona.navItems.filter(function (oNav) {
                  // Keys missing from the map (e.g. "dashboard") stay visible.
                  return oAccess[oNav.key] !== false;
                });

                oDashboardModel.setProperty("/role", sRole);
                oDashboardModel.setProperty("/pageTitle", oPersona.pageTitle);
                oDashboardModel.setProperty("/navItems", aNavItems);
                oDashboardModel.setProperty("/access", oAccess);
                // Sticker section renders the admin KPI view when the user is a
                // Sticker Admin, otherwise the personal StickerMaster view.
                oDashboardModel.setProperty("/sticker/isAdmin", bStickerAdmin);
                var sName = oUser.UserName || "-";
                var sInitials =
                  sName !== "-"
                    ? sName
                        .split(" ")
                        .map(function (w) {
                          return w[0];
                        })
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "?";
                oDashboardModel.setProperty("/user/name", sName);
                oDashboardModel.setProperty("/user/initials", sInitials);
                oDashboardModel.setProperty("/user/role", oPersona.roleLabel);
                oDashboardModel.setProperty(
                  "/user/position",
                  oUser.PostionText || "-",
                );
                oDashboardModel.setProperty("/user/id", oUser.Pernr || "-");
                oDashboardModel.setProperty(
                  "/user/loginId",
                  oUser.Usrid || "-",
                );
                oDashboardModel.setProperty(
                  "/user/badgeNo",
                  oUser.UserPosition || "-",
                );
                oDashboardModel.setProperty(
                  "/user/governmentId",
                  oUser.GovermentID || "-",
                );
                oDashboardModel.setProperty(
                  "/user/department",
                  oUser.OrganizationText || "-",
                );
                oDashboardModel.setProperty(
                  "/user/gender",
                  oUser.GenderDesc || "-",
                );

                // Format DOB from yyyyMMdd → dd/MM/yyyy, else show "-"
                var sDob = "-";
                if (oUser.DOB && oUser.DOB.length === 8) {
                  sDob =
                    oUser.DOB.substring(6, 8) +
                    "/" +
                    oUser.DOB.substring(4, 6) +
                    "/" +
                    oUser.DOB.substring(0, 4);
                }
                oDashboardModel.setProperty("/user/dob", sDob);
                oDashboardModel.setProperty(
                  "/user/bloodGroup",
                  oUser.BloodGroup || "-",
                );
                oDashboardModel.setProperty("/user/email", oUser.EMail || "-");
              }
              this._loadDashboardForRole(sRole);
              this._fetchLandingKpis(bAdmin);
              this._fetchStickerData(bStickerAdmin);
              this._fetchViolationData(bViolationAdmin);
            }.bind(this),
          )
          .catch(
            function () {
              this._loadDashboardForRole("COORDINATOR");
              this._fetchLandingKpis(false);
              this._fetchStickerData(false);
              this._fetchViolationData(false);
            }.bind(this),
          );
      },

      /**
       * Per-application access flags derived from the EmployeeHeader
       * authorization fields. Keys match the nav item keys, so the same map
       * drives both the side-navigation entries and the visibility of the
       * matching dashboard KPI sections — a user never sees KPIs for an app
       * they cannot open.
       */
      _buildAccessMap: function (oUser) {
        return {
          // Business Visitor Access
          vendor: oUser.VARAuthorized === "X",
          // Traffic Violation System
          violations:
            oUser.TVSAuthorized === true || oUser.TVSAuthorized === "X",
          // Sticker Management — open to every user. Swap in
          // `oUser.StickerAdmin === "X"` to restrict it to Sticker Admins.
          sticker: true,
          // ID Management System — Admins only
          id: true,
        };
      },

      _loadDashboardForRole: function (sRole) {
        var sFragment = SHELL_FRAGMENTS[sRole] || SHELL_FRAGMENTS.COORDINATOR;
        this._loadShellFragment(sFragment);
      },

      onNavItemSelect: function (oEvent) {
        var oItem = oEvent.getParameter("listItem");
        var sKey = oItem.getCustomData()[0].getValue();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

        // Update selected flag on each nav item so binding reflects new state
        var aNavItems = oDashboardModel.getProperty("/navItems");
        var sTitle = "";
        aNavItems.forEach(function (oNav, i) {
          var bSelected = oNav.key === sKey;
          oDashboardModel.setProperty(
            "/navItems/" + i + "/selected",
            bSelected,
          );
          if (bSelected) {
            sTitle = oNav.title;
          }
        });
        oDashboardModel.setProperty("/selectedNavKey", sKey);
        oDashboardModel.setProperty("/embedTitle", sTitle);

        if (sKey === "vendor") {
          this._loadAppInFrame("BusiVisitorAccess", "manage");
        } else if (sKey === "violations") {
          this._loadAppInFrame("TrafficViolationSystem", "manage");
        } else if (sKey === "sticker") {
          this._loadAppInFrame("StickerMaster", "manage");
        } else if (sKey === "id") {
          this._loadAppInFrame("idmanagementsystem", "manage");
        } else if (sKey === "dashboard") {
          var sRole = oDashboardModel.getProperty("/role");
          this._loadDashboardForRole(sRole);
        }
      },

      onViewModeChange: function (oEvent) {
        var sKey = oEvent.getParameter("item").getKey(); // "org" | "my"
        var bAdmin = sKey === "org";
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

        oDashboardModel.setProperty("/viewMode", sKey);
        oDashboardModel.setProperty("/isAdmin", bAdmin);

        // Re-fetch KPIs with the new admin flag. The toggle also swaps the
        // Traffic Violation System section between the global and personal
        // views, so it reads from the matching endpoint.
        this._fetchLandingKpis(bAdmin);
        this._fetchViolationData(bAdmin);

        // If vendor frame is currently open, reload it with the updated flag
        if (oDashboardModel.getProperty("/isEmbedFrame")) {
          this._loadAppInFrame("BusiVisitorAccess", "manage");
        }
      },

      /**
       * Opens another Fiori app in an iframe filling the dashboard content
       * area.
       *
       * The iframe points at the launchpad shell with the target intent in the
       * hash — the same URL the shell itself would navigate to. Do not point it
       * at the resolved app URL: Work Zone resolves these ABAP-hosted apps to
       * /sap/bc/ui2/flp/ui5appruntime.html, which is an FLP app container that
       * proxies ushell services to its parent over postMessage and waits for
       * that handshake before rendering. Nested here nothing answers it, so the
       * app boots, fires its OData calls, and then sits on the busy indicator
       * forever. The shell URL has no such dependency — it is the container.
       */
      _loadAppInFrame: function (sSemanticObject, sAction, sInnerRoute) {
        var that = this;
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        oDashboardModel.setProperty("/isEmbedFrame", true);
        this._setEmbedMode(true);

        var oContainer = this.byId("dashboardContent");
        oContainer.destroyItems();
        oContainer.setBusy(true);

        var bAdmin = oDashboardModel.getProperty("/isAdmin");

        // Guards against a slow shell-base lookup landing after the user has
        // already navigated somewhere else.
        var iToken = (this._iEmbedToken = (this._iEmbedToken || 0) + 1);

        return this._resolveShellBase()
          .then(function (sShellBase) {
            if (iToken !== that._iEmbedToken) {
              return;
            }

            // Intent hash format is #SemanticObject-action?params&/innerRoute.
            // The first parameter separator is "?" — "&" here would fold the
            // parameters into the action name and the intent would not resolve.
            var sHash =
              "#" +
              sSemanticObject +
              "-" +
              sAction +
              "?admin=" +
              (bAdmin ? "true" : "false");

            if (sInnerRoute) {
              sHash += "&/" + sInnerRoute.replace(/^[&/]+/, "");
            }

            // headerless suppresses the nested shell's own header, so the
            // embedded app sits directly under this dashboard's chrome.
            var sUrl =
              sShellBase +
              (sShellBase.indexOf("?") === -1 ? "?" : "&") +
              "sap-ushell-config=headerless" +
              sHash;

            Log.info("embedding " + sUrl, null, "jhah.embed");

            oContainer.setBusy(false);
            oContainer.addItem(
              new HTML({
                content:
                  '<iframe src="' +
                  encodeURI(sUrl).replace(/"/g, "&quot;") +
                  '" style="width:100%;height:calc(100vh - 6.25rem);' +
                  'min-height:calc(100vh - 6.25rem);border:none;display:block;"' +
                  "></iframe>",
                sanitizeContent: false,
                preferDOM: true,
              }),
            );
          })
          .catch(function (oError) {
            if (iToken !== that._iEmbedToken) {
              return;
            }
            oContainer.setBusy(false);
            oContainer.destroyItems();
            oContainer.addItem(
              new MessageStrip({
                type: "Error",
                showIcon: true,
                text:
                  "Could not open " +
                  sSemanticObject +
                  ": " +
                  ((oError && oError.message) || oError),
              }).addStyleClass("sapUiMediumMargin"),
            );
          });
      },

      /**
       * Resolves the launchpad shell URL, without its hash.
       *
       * window.top is not readable here. Work Zone serves destination-proxied
       * apps from "<subdomain>-sapdelim-<destination>.<host>" while the shell
       * runs on "<subdomain>.<host>", so this app is cross-origin to its own
       * launchpad and touching window.top.location throws.
       */
      _resolveShellBase: function () {
        return Promise.resolve()
          .then(function () {
            // The container knows its own launchpad URL, and in the app
            // runtime it answers over postMessage.
            return sap.ushell.Container.getFLPUrl(false);
          })
          .then(function (sFlpUrl) {
            if (!sFlpUrl) {
              throw new Error("container returned no FLP URL");
            }
            return sFlpUrl.split("#")[0];
          })
          .catch(function (oError) {
            Log.warning(
              "getFLPUrl unavailable, deriving shell base",
              (oError && oError.message) || String(oError),
              "jhah.embed",
            );

            // The parent document is the shell.
            if (document.referrer) {
              return document.referrer.split("#")[0];
            }

            // Last resort: strip the destination suffix off our own host.
            var oUrl = new URL(window.location.href);
            var aHost = oUrl.hostname.split(".");
            aHost[0] = aHost[0].replace(/-sapdelim-.*$/, "");
            return oUrl.protocol + "//" + aHost.join(".") + "/site";
          });
      },

      _loadShellFragment: function (sFragmentName) {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        oDashboardModel.setProperty("/isEmbedFrame", false);
        this._setEmbedMode(false);

        var oContainer = this.byId("dashboardContent");
        oContainer.destroyItems();

        return Fragment.load({
          id: this.getView().getId(),
          name: sFragmentName,
          controller: this,
          type: "XML",
        }).then(
          function (oShell) {
            oContainer.addItem(oShell);
            this._configureVisitorChart();
          }.bind(this),
        );
      },

      _setEmbedMode: function (bEmbed) {
        var oContent = this.byId("dashboardContent");
        var oScroll = this.byId("mainScroll");
        if (oContent) {
          oContent.toggleStyleClass("jhahDashboardContentEmbed", bEmbed);
        }
        if (oScroll) {
          oScroll.toggleStyleClass("jhahMainScrollEmbed", bEmbed);
        }
      },

      _fetchLandingKpis: function (bAdmin) {
        var oODataModel = this.getOwnerComponent().getModel();
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oODataModel) {
          return;
        }
        // These KPIs feed the Business Visitor Access section only — skip the
        // request entirely when that section is hidden for this user.
        if (oDashboardModel.getProperty("/access/vendor") === false) {
          return;
        }
        var sPath = "/LandingPageKPI(" + (bAdmin ? "true" : "false") + ")/Set";
        var oBinding = oODataModel.bindList(sPath);
        oBinding
          .requestContexts()
          .then(function (aContexts) {
            if (!aContexts.length) {
              return;
            }
            var oData = aContexts[0].getObject();

            oDashboardModel.setProperty(
              "/vendorKpis/0/value",
              String(oData.TotalRequests),
            );
            oDashboardModel.setProperty(
              "/vendorKpis/1/value",
              String(oData.ApprovedRequests),
            );
            oDashboardModel.setProperty("/vendorKpis/2/title", "In Progress");
            oDashboardModel.setProperty(
              "/vendorKpis/2/value",
              String(oData.InProgressRequests),
            );

            var iTotalVisitors =
              (oData.totalBusinessReqs || 0) +
              (oData.totalTempStaffReqs || 0) +
              (oData.totalTempJobReqs || 0) +
              (oData.totalProjectReqs || 0) +
              (oData.totalSecurityRequests || 0);
            oDashboardModel.setProperty(
              "/visitorChart/centerLabel",
              iTotalVisitors + " TODAY",
            );
            oDashboardModel.setProperty("/visitorChart/data", [
              { Category: "Business", Count: oData.totalBusinessReqs || 0 },
              {
                Category: "Temporary Staff Access",
                Count: oData.totalTempStaffReqs || 0,
              },
              { Category: "Temporary Job", Count: oData.totalTempJobReqs || 0 },
              { Category: "Project", Count: oData.totalProjectReqs || 0 },
              { Category: "Security", Count: oData.totalSecurityRequests || 0 },
            ]);
          })
          .catch(function () {
            // backend unreachable — static mock data remains in place
          });
      },

      /**
       * Loads the Sticker Management section data.
       *  - Sticker Admins see high-level KPIs (StickerKPI(true)/Set), mirroring
       *    the Business Visitor Access cards.
       *  - Non-admins see their own StickerMaster records (Active Sticker,
       *    Request Status list, and a personal KPI strip).
       */
      _fetchStickerData: function (bStickerAdmin) {
        var oStickerModel = this.getOwnerComponent().getModel("sticker");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oStickerModel || !oDashboardModel) {
          return;
        }
        oDashboardModel.setProperty("/sticker/isAdmin", bStickerAdmin);

        var sKpiPath =
          "/StickerKPI(" + (bStickerAdmin ? "true" : "false") + ")/Set";
        oStickerModel
          .bindList(sKpiPath, undefined, undefined, undefined, {
            $select:
              "Dashboard,TotalRequests,ApprovedRequests," +
              "InProgressRequests,RejectedRequests",
          })
          .requestContexts()
          .then(function (aContexts) {
            if (!aContexts.length) {
              return;
            }
            var oData = aContexts[0].getObject();
            oDashboardModel.setProperty(
              "/sticker/kpis/0/value",
              String(oData.TotalRequests),
            );
            oDashboardModel.setProperty(
              "/sticker/kpis/1/value",
              String(oData.ApprovedRequests),
            );
            oDashboardModel.setProperty(
              "/sticker/kpis/2/value",
              String(oData.InProgressRequests),
            );
            oDashboardModel.setProperty(
              "/sticker/kpis/3/value",
              String(oData.RejectedRequests),
            );
            oDashboardModel.setProperty("/sticker/hasKpiData", true);
          })
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });

        if (!bStickerAdmin) {
          this._fetchStickerMasterForUser();
        }
      },

      _fetchStickerMasterForUser: function () {
        var oStickerModel = this.getOwnerComponent().getModel("sticker");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oStickerModel) {
          return;
        }

        var oBinding = oStickerModel.bindList(
          "/StickerMaster",
          undefined,
          [new Sorter("RequestDate", true)],
          [new Filter("IsActiveEntity", FilterOperator.EQ, true)],
          {
            $select:
              "StkReqId,StkReqIdStr,StkType,StkTypeDesc,Status,StatsCriticality," +
              "ExpireDate,RequestDate,PlateNumEng,ArabicPlateNum," +
              "ManufacturerDesc,ColorDesc,DraftUUID,IsActiveEntity",
          },
        );

        oBinding
          .requestContexts(0, 50)
          .then(
            function (aContexts) {
              var aRequests = aContexts.map(
                function (oCtx) {
                  var o = oCtx.getObject();
                  return {
                    reqId: o.StkReqId,
                    reqIdStr: o.StkReqIdStr || o.StkReqId,
                    stkType: o.StkType || "-",
                    type: o.StkTypeDesc || "-",
                    status: o.Status || "-",
                    statusState: this._stickerCriticalityState(
                      o.StatsCriticality,
                    ),
                    crit: o.StatsCriticality,
                    expiry: this._formatOdataDate(o.ExpireDate),
                    plate: o.PlateNumEng || o.ArabicPlateNum || "-",
                    vehicle: [o.ManufacturerDesc, o.ColorDesc]
                      .filter(Boolean)
                      .join(" · "),
                    draftUUID:
                      o.DraftUUID || "00000000-0000-0000-0000-000000000000",
                    isActive: o.IsActiveEntity !== false,
                  };
                }.bind(this),
              );

              // KPI counts reflect all of the user's requests; the table shows
              // only the 5 most recent to keep the card compact.
              oDashboardModel.setProperty(
                "/sticker/requests",
                aRequests.slice(0, 5),
              );
              oDashboardModel.setProperty(
                "/sticker/hasUserData",
                aRequests.length > 0,
              );

              var iInProgress = aRequests.filter(function (r) {
                return r.crit === 2;
              }).length;
              var aActive = aRequests.filter(function (r) {
                return r.crit === 3;
              });
              oDashboardModel.setProperty(
                "/sticker/userKpis/0/value",
                String(aRequests.length),
              );
              oDashboardModel.setProperty(
                "/sticker/userKpis/1/value",
                String(iInProgress),
              );
              oDashboardModel.setProperty(
                "/sticker/userKpis/2/value",
                String(aActive.length),
              );

              // Active Sticker = most recent active/approved request
              if (aActive.length) {
                var oA = aActive[0];
                oDashboardModel.setProperty("/sticker/active", {
                  hasData: true,
                  plate: oA.plate,
                  type: oA.type,
                  vehicle: oA.vehicle,
                  expiry: oA.expiry,
                  status: oA.status,
                  statusState: oA.statusState,
                });
              } else {
                oDashboardModel.setProperty("/sticker/active/hasData", false);
              }
            }.bind(this),
          )
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });
      },

      _stickerCriticalityState: function (iCrit) {
        switch (iCrit) {
          case 3:
            return "Success";
          case 2:
            return "Warning";
          case 1:
            return "Error";
          default:
            return "None";
        }
      },

      _formatOdataDate: function (sDate) {
        if (!sDate || typeof sDate !== "string" || sDate.length < 10) {
          return "-";
        }
        var aParts = sDate.substring(0, 10).split("-");
        return aParts.length === 3
          ? aParts[2] + "/" + aParts[1] + "/" + aParts[0]
          : "-";
      },

      /**
       * Opens the Sticker Master app in the embedded frame, deep-linked to the
       * clicked request's object page.
       */
      onStickerRequestPress: function (oEvent) {
        var oCtx = oEvent.getSource().getBindingContext("dashboard");
        if (!oCtx) {
          return;
        }
        var oReq = oCtx.getObject();
        var sInnerRoute =
          "/StickerMaster(StkReqId='" +
          oReq.reqId +
          "',DraftUUID=" +
          oReq.draftUUID +
          ",IsActiveEntity=" +
          (oReq.isActive ? "true" : "false") +
          ")";

        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        var aNavItems = oDashboardModel.getProperty("/navItems") || [];
        aNavItems.forEach(function (oNav, i) {
          oDashboardModel.setProperty(
            "/navItems/" + i + "/selected",
            oNav.key === "sticker",
          );
        });
        oDashboardModel.setProperty("/selectedNavKey", "sticker");
        oDashboardModel.setProperty("/embedTitle", "Sticker Management");

        this._loadAppInFrame("StickerMaster", "manage", sInnerRoute);
      },

      /**
       * Loads the Traffic Violation System section data.
       *  - Admins see the global view (adminKPI): headline counts, the two
       *    attention-needed alerts, and a processing breakdown.
       *  - Everyone else sees their own record (employeeKPI): personal counts
       *    plus their active points and last violation date.
       * Mirrors _fetchStickerData, and is re-run when the header's
       * "All Employees / My View" toggle changes.
       */
      _fetchViolationData: function (bAdmin) {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oDashboardModel) {
          return;
        }
        oDashboardModel.setProperty("/violations/isAdmin", bAdmin);

        // Skip the call entirely when the section is hidden for this user.
        if (oDashboardModel.getProperty("/access/violations") === false) {
          return;
        }

        console.log("Fetching violation data for admin:", bAdmin);

        if (bAdmin) {
          this._fetchViolationAdminKpis();
        } else {
          this._fetchViolationUserKpis();
        }
      },

      _fetchViolationAdminKpis: function () {
        var oTvsModel = this.getOwnerComponent().getModel("tvs");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oTvsModel) {
          return;
        }

        oTvsModel
          .bindList("/adminKPI")
          .requestContexts(0, 1)
          .then(function (aContexts) {
            if (!aContexts.length) {
              return;
            }
            var o = aContexts[0].getObject();
            var fnSet = function (sPath, vValue) {
              oDashboardModel.setProperty(sPath, String(vValue || 0));
            };

            fnSet("/violations/adminKpis/0/value", o.ViolationsRaisedToday);
            fnSet("/violations/adminKpis/1/value", o.ViolationsLast30Days);
            fnSet("/violations/adminKpis/2/value", o.TotalPendingReview);
            fnSet("/violations/adminKpis/3/value", o.TotalAppViolations);

            fnSet("/violations/adminAlerts/0/value", o.TotalStagnantTickets);
            fnSet("/violations/adminAlerts/1/value", o.TotalCriticalIncidents);

            fnSet("/violations/adminBreakdown/0/value", o.TotalProcessed);
            fnSet("/violations/adminBreakdown/1/value", o.TotalRejected);
            fnSet(
              "/violations/adminBreakdown/2/value",
              o.TotalSystemActivePoints,
            );

            oDashboardModel.setProperty("/violations/hasAdminData", true);
          })
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });
      },

      _fetchViolationUserKpis: function () {
        var oTvsModel = this.getOwnerComponent().getModel("tvs");
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        if (!oTvsModel) {
          return;
        }

        oTvsModel
          .bindList("/employeeKPI")
          .requestContexts(0, 50)
          .then(
            function (aContexts) {
              if (!aContexts.length) {
                return;
              }
              var o = this._pickOwnViolationRow(
                aContexts.map(function (oCtx) {
                  return oCtx.getObject();
                }),
              );
              if (!o) {
                return;
              }

              oDashboardModel.setProperty(
                "/violations/userKpis/0/value",
                String(o.InProgressViolationCount || 0),
              );
              oDashboardModel.setProperty(
                "/violations/userKpis/1/value",
                String(o.ViolationCountLast12Months || 0),
              );
              oDashboardModel.setProperty(
                "/violations/userKpis/2/value",
                String(o.LifetimeViolationsCount || 0),
              );

              oDashboardModel.setProperty("/violations/points", {
                hasData: true,
                total: String(o.TotalPointsLast12Months || 0),
                lastViolationDate: this._formatOdataDate(o.LastViolationDate),
              });
              oDashboardModel.setProperty("/violations/hasUserData", true);
            }.bind(this),
          )
          .catch(function () {
            // backend unreachable — "No data available" placeholder remains
          });
      },

      /**
       * employeeKPI is expected to be scoped to the logged-in user, but guard
       * against an unscoped list: matching on Pernr/userid keeps another
       * employee's violation record from being shown. Only fall back to the
       * first row when the service returned exactly one.
       */
      _pickOwnViolationRow: function (aRows) {
        if (aRows.length === 1) {
          return aRows[0];
        }
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        var sPernr = String(oDashboardModel.getProperty("/user/id") || "");
        var sLoginId = String(
          oDashboardModel.getProperty("/user/loginId") || "",
        ).toUpperCase();

        var fnTrimZeros = function (sValue) {
          return String(sValue || "").replace(/^0+/, "");
        };

        var oMatch = aRows.filter(function (oRow) {
          return (
            (sPernr && fnTrimZeros(oRow.Pernr) === fnTrimZeros(sPernr)) ||
            (sLoginId && String(oRow.userid || "").toUpperCase() === sLoginId)
          );
        })[0];

        return oMatch || null;
      },

      /**
       * Opens the Traffic Violation System app in the embedded frame and marks
       * its nav item as selected, matching onStickerRequestPress.
       */
      onViolationsNavPress: function () {
        var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
        var aNavItems = oDashboardModel.getProperty("/navItems") || [];
        aNavItems.forEach(function (oNav, i) {
          oDashboardModel.setProperty(
            "/navItems/" + i + "/selected",
            oNav.key === "violations",
          );
        });
        oDashboardModel.setProperty("/selectedNavKey", "violations");
        oDashboardModel.setProperty("/embedTitle", "Traffic Violation System");

        this._loadAppInFrame("TrafficViolationSystem", "manage");
      },

      _configureVisitorChart: function () {
        var oChart = this.byId("visitorCategoryChart");
        if (!oChart) {
          return;
        }
        oChart.setVizProperties({
          title: { visible: false },
          legend: {
            visible: true,
            position: "right",
            layout: { maxWidth: 0.35 },
          },
          plotArea: {
            dataLabel: {
              visible: true,
              type: "value",
            },
            colorPalette: [
              "#1d7db5",
              "#31a56e",
              "#d28c22",
              "#6d8fd7",
              "#9b59b6",
            ],
          },
        });
      },
    });
  },
);
