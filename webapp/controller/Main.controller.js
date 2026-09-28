sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Sorter",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/m/MessageStrip",
  "sap/base/Log",
  "sap/ui/core/HTML"
], (Controller, JSONModel, Sorter, Filter, FilterOperator, MessageStrip, Log, HTML) => {
  "use strict";

  return Controller.extend("com.jhah.zhrjhahseclp.controller.Main", {
    onInit: function () {

      var oGetAuthModel = new sap.ui.model.json.JSONModel();
      this.getView().setModel(oGetAuthModel, "GetAuthModel");
      this._initializeDashboard();


    },
    _initializeDashboard: async function () {
      try {
        await this._getAuthInfo();

        // this._getAuthInfo();
        // Build side navigation based on authorization
        this._applyNavAuthorization();
        this._loadInitialFragments();
        this._fetchEmployeeData();
        // this._fetchActiveIdCard();
        // this._getIDPendingRequests();
        // this._getTVSEmpPendingRequests();
        // // this._getIDEmpPendingRequests();
        // this._fetchAdminKpi();
        // this._fetchStickerData();
        // // this._fetchStickerMasterForUser();
        // this._fetchLandingKpis();
        // this._fetchViolationUserKpis();
        // this._fetchViolationAdminKpis();

      } catch (oError) {
        console.error("Failed to load dashboard:", oError);
      }
    },
    _hasRole: function (sRole) {

      return (
        sRole === "ADMIN" ||
        sRole === "EMPLOYEE"
      );
    },
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

          // Progress reflects remaining validity of a standard 12-month card;
          // it is a visual gauge, not a precise figure from the backend.
          var iPercent = isNaN(iDays)
            ? 0
            : Math.max(0, Math.min(100, Math.round((iDays / 365) * 100)));

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
          console.log("oDashboardModel", oDashboardModel.getData())
        })
        .catch(function () {
          // backend unreachable — "No data available" placeholder remains
        });
    },
    _getAuthInfo: function () {

      var oAuthInfoModel = this.getOwnerComponent().getModel("Auth_Info");
      var oListBinding = oAuthInfoModel.bindList("/authInfo");

      return oListBinding.requestContexts()
        .then(function (aContexts) {

          var aData = aContexts.map(function (oContext) {
            return oContext.getObject();
          });

          var oGetAuthModel = this.getView().getModel("GetAuthModel");

          oGetAuthModel.setData(aData);
          // oGetAuthModel.getData()[0].TVS_ROLE = "ADMIN";
          // oGetAuthModel.getData()[0].VAR_ROLE = "ADMIN";
          // oGetAuthModel.getData()[0].ID_ROLE = "ADMIN";
          // oGetAuthModel.getData()[0].STK_ROLE = "ADMIN";

          console.log(
            "GetAuthModel:",
            oGetAuthModel.getData()
          );

          // Important: return the data so caller can use it
          return aData;
        }.bind(this))
        .catch(function (oError) {

          console.error(
            "Failed to read Auth_Info:",
            oError
          );

          // Re-throw so caller knows that auth failed
          throw oError;
        });
    },
    _getIDPendingRequests: function () {

      var oModel = this.getOwnerComponent().getModel("idmgmt");

      var oBinding = oModel.bindList(
        "/Header",
        null,
        null,
        [
          new sap.ui.model.Filter(
            "Status",
            sap.ui.model.FilterOperator.EQ,
            "PEN"
          )
        ]
      );

      oBinding.requestContexts(0, 5)
        .then(function (aContexts) {

          var aPendingRecords = aContexts.map(function (oContext) {
            return oContext.getObject();
          });

          var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

          oDashboardModel.setProperty("/idCard/pendingrecords", aPendingRecords);

          console.log("Pending Records:", oDashboardModel.getData());

        }.bind(this))
        .catch(function (oError) {

          console.error(
            "Failed to fetch pending records:",
            oError
          );

        });

    },
    _getIDEmpPendingRequests: function () {

      var oModel = this.getOwnerComponent().getModel("idmgmt");
      var sCreatedBy = this.getView().getModel("GetAuthModel").getData()[0].USERID;

      var oBinding = oModel.bindList(
        "/Header",
        null,
        null,
        [
          new sap.ui.model.Filter(
            "Status",
            sap.ui.model.FilterOperator.EQ,
            "PEN"
          ),
          new sap.ui.model.Filter(
            "CreatedBy",
            sap.ui.model.FilterOperator.EQ,
            sCreatedBy
          )
        ]
      );

      oBinding.requestContexts(0, 5)
        .then(function (aContexts) {

          var aPendingRecords = aContexts.map(function (oContext) {
            return oContext.getObject();
          });

          var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

          oDashboardModel.setProperty("/idCard/pendingrecords", aPendingRecords);

          console.log("Pending Records:", oDashboardModel.getData());

        }.bind(this))
        .catch(function (oError) {

          console.error(
            "Failed to fetch pending records:",
            oError
          );

        });

    },
    _getTVSEmpPendingRequests: function () {

      var oModel = this.getOwnerComponent().getModel("tvs");
      var sCreatedBy = this.getView().getModel("GetAuthModel").getData()[0].USERID;

      var oBinding = oModel.bindList(
        "/header",
        null,
        null,
        [
          new sap.ui.model.Filter(
            "CreatedBy",
            sap.ui.model.FilterOperator.EQ,
            sCreatedBy
          )
        ]
      );

      oBinding.requestContexts(0, 5)
        .then(function (aContexts) {

          var aPendingRecords = aContexts.map(function (oContext) {
            return oContext.getObject();
          });

          var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

          // oDashboardModel.setProperty("/idCard/pendingrecords", aPendingRecords);

          // console.log("Pending Records:", oDashboardModel.getData());

        }.bind(this))
        .catch(function (oError) {

          console.error(
            "Failed to fetch pending records:",
            oError
          );

        });

    },
    _fetchAdminKpi: function () {
      var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
      var oDataModel = this.getOwnerComponent().getModel("idmgmt");

      var oListBinding = oDataModel.bindList("/AdminKPI");

      oListBinding.requestContexts(0, 1).then(function (aContexts) {
        var oAdminData = aContexts.length > 0 ? aContexts[0].getObject() : {};

        oDashboardModel.setProperty("/idCard/adminKpi", {
          personaRole: oAdminData.PersonaRole || "",
          totalIdRequests: oAdminData.TotalIdRequests || 0,
          approvedCards: oAdminData.ApprovedCards || 0,
          pendingReview: oAdminData.PendingReview || 0,
          rejectedCards: oAdminData.RejectedCards || 0
        });
      }).catch(function (oError) {
        console.error("Failed to load Admin KPI:", oError);
        oDashboardModel.setProperty("/adminKpi", {
          personaRole: "",
          totalIdRequests: 0,
          approvedCards: 0,
          pendingReview: 0,
          rejectedCards: 0
        });
      });
      console.log("oDashboardModel", oDashboardModel);

    },

    _fetchStickerData: function (sStickerRole) {
      var oStickerModel = this.getOwnerComponent().getModel("sticker");
      var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

      if (!oStickerModel || !oDashboardModel) {
        return;
      }

      oDashboardModel.setProperty(
        "/sticker/isAdmin",
        sStickerRole === true
      );

      var sKpiPath =
        "/StickerKPI(" + sStickerRole + ")/Set";

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

          oDashboardModel.setProperty(
            "/sticker/hasKpiData",
            true
          );

          console.log(oDashboardModel);
        })
        .catch(function () {
          // backend unreachable — "No data available" placeholder remains
        });
    },
    // _fetchStickerData: function () {
    //   var oStickerModel = this.getOwnerComponent().getModel("sticker");
    //   var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
    //   if (!oStickerModel || !oDashboardModel) {
    //     return;
    //   }
    //   var oGetAuthModel = this.getView().getModel("GetAuthModel").getData();
    //   var sStickerRole = oGetAuthModel[0].STK_ROLE;
    //   // var sStickerRole = false;

    //   oDashboardModel.setProperty("/sticker/isAdmin", sStickerRole === "ADMIN");

    //   var sKpiPath =
    //     "/StickerKPI(" + oDashboardModel.getData().sticker.isAdmin + ")/Set";
    //   oStickerModel
    //     .bindList(sKpiPath, undefined, undefined, undefined, {
    //       $select:
    //         "Dashboard,TotalRequests,ApprovedRequests," +
    //         "InProgressRequests,RejectedRequests",
    //     })
    //     .requestContexts()
    //     .then(function (aContexts) {
    //       if (!aContexts.length) {
    //         return;
    //       }
    //       var oData = aContexts[0].getObject();
    //       oDashboardModel.setProperty(
    //         "/sticker/kpis/0/value",
    //         String(oData.TotalRequests),
    //       );
    //       oDashboardModel.setProperty(
    //         "/sticker/kpis/1/value",
    //         String(oData.ApprovedRequests),
    //       );
    //       oDashboardModel.setProperty(
    //         "/sticker/kpis/2/value",
    //         String(oData.InProgressRequests),
    //       );
    //       oDashboardModel.setProperty(
    //         "/sticker/kpis/3/value",
    //         String(oData.RejectedRequests),
    //       );
    //       oDashboardModel.setProperty("/sticker/hasKpiData", true);

    //       console.log(oDashboardModel);
    //     })
    //     .catch(function () {
    //       // backend unreachable — "No data available" placeholder remains
    //     });
    // },
    _fetchEmployeeData: function () {
      var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
      const oModel = this.getOwnerComponent().getModel();
      const oBinding = oModel.bindList("/EmployeeHeader");

      oBinding.requestContexts(0, 1)
        .then((aContexts) => {

          if (!aContexts.length) {
            return;
          }

          const oEmployee = aContexts[0].getObject();

          const oUser = {
            initials: oEmployee.UserName
              ? oEmployee.UserName
                .split(" ")
                .map(sName => sName.charAt(0))
                .join("")
                .substring(0, 2)
                .toUpperCase()
              : "",

            name: oEmployee.UserName || "",
            role: oEmployee.PostionText || "",

            id: oEmployee.Pernr || "",
            loginId: oEmployee.Usrid || "",
            governmentId: oEmployee.GovermentID || "",

            department: oEmployee.OrganizationText || "",
            position: oEmployee.PostionText || "",

            dob: oEmployee.DOB || "",
            gender: oEmployee.GenderDesc || "",
            bloodGroup: oEmployee.BloodGroup || "",

            email: oEmployee.EMail || ""
          };

          oDashboardModel.setProperty("/user", oUser);

          console.log("Dashboard User:", oDashboardModel.getProperty("/user"));
        })
        .catch((oError) => {
          console.error("EmployeeHeader GET failed:", oError);
        });
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

              console.log("oDashboardModelmaster", oDashboardModel.getData());
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
    _fetchLandingKpis: function () {
      var oODataModel = this.getOwnerComponent().getModel();
      var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
      if (!oODataModel) {
        return;
      }
      // These KPIs feed the Business Visitor Access section only — skip the
      // request entirely when that section is hidden for this user.
      // if (oDashboardModel.getProperty("/access/vendor") === false) {
      //   return;
      // }

      var oGetAuthModel = this.getView().getModel("GetAuthModel").getData();
      var sVarRole = oGetAuthModel[0].VAR_ROLE;

      oDashboardModel.setProperty("/violations/isAdmin", sVarRole === "ADMIN");
      var isVarAdmin = oDashboardModel.getData().violations.isAdmin;

      isVarAdmin = "false" ; 
      // if (isVarAdmin == "true") {
      //   isVarAdmin = "X"
      // } else if (isVarAdmin == "false") {
      //   isVarAdmin = " ";
      // }
      var sPath = "/LandingPageKPI(" + isVarAdmin + ")/Set";
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

    _getViewFragment: function (sApp, sViewMode) {

      var oFragmentMap = {

        TVS: {
          org: "com.jhah.zhrjhahseclp.view.fragments.TVS.Admin.admin",
          my: "com.jhah.zhrjhahseclp.view.fragments.TVS.Employee.employee"
        },

        STICKER: {
          org: "com.jhah.zhrjhahseclp.view.fragments.sticker.Admin.admin",
          my: "com.jhah.zhrjhahseclp.view.fragments.sticker.Employee.employee"
        },

        ID_CARD: {
          org: "com.jhah.zhrjhahseclp.view.fragments.IdManagement.Admin.admin",
          my: "com.jhah.zhrjhahseclp.view.fragments.IdManagement.Employee.employee"
        },

        BUSINESS_VISITOR: {
          org: "com.jhah.zhrjhahseclp.view.fragments.VAR.Admin.admin",
          my: "com.jhah.zhrjhahseclp.view.fragments.VAR.Employee.employee"
        }
      };

      return oFragmentMap[sApp]?.[sViewMode] || null;
    },

    _getViewContainer: function (sApp) {

      var oContainerMap = {
        TVS: "tvsVBox",
        STICKER: "stickerVBox",
        ID_CARD: "idVBox",
        BUSINESS_VISITOR: "varVBox"
      };

      return this.byId(oContainerMap[sApp]) || null;
    },

    _getInitialMode: function (sRole) {

      if (sRole === "ADMIN") {
        return "org";
      }

      if (sRole === "EMPLOYEE") {
        return "my";
      }

      return null;
    },

    // _loadDynamicFragment: function (sFragmentName, sApp) {

    //   var oContainer = this._getViewContainer(sApp);

    //   if (!oContainer) {
    //     console.error("Container not found for:", sApp);
    //     return;
    //   }

    //   // IMPORTANT: destroy old fragment controls
    //   oContainer.destroyItems();

    //   this.loadFragment({
    //     name: sFragmentName,
    //     type: "XML"
    //   }).then(function (oFragment) {

    //     oContainer.addItem(oFragment);

    //   }).catch(function (oError) {

    //     console.error(
    //       "Error loading fragment:",
    //       sFragmentName,
    //       oError
    //     );

    //   });
    // },
    _loadDynamicFragment: function (sFragmentName, sApp, sViewMode) {

      var oContainer = this._getViewContainer(sApp);

      if (!oContainer) {
        console.error("Container not found for:", sApp);
        return;
      }

      oContainer.destroyItems();

      this.loadFragment({
        name: sFragmentName,
        type: "XML"
      }).then(function (oFragment) {

        oContainer.addItem(oFragment);

        if (sViewMode === "org") {
          this._loadAdminData(sApp);

        } else if (sViewMode === "my") {
          this._loadEmployeeData(sApp);
        }

      }.bind(this)).catch(function (oError) {

        console.error(
          "Error loading fragment:",
          sFragmentName,
          oError
        );

      });
    },

    _loadEmployeeData: function (sApp) {

      console.log("Employee view loaded:", sApp);

      if (sApp === "ID_CARD") {
        this._getIDEmpPendingRequests();
        this._fetchActiveIdCard();
      }

      if (sApp === "STICKER") {
        this._fetchStickerMasterForUser();
        this._fetchStickerData(false);
      }

      if (sApp === "TVS") {
        this._fetchViolationUserKpis();
      }

      if (sApp === "BUSINESS_VISITOR") {
        this._fetchLandingKpis();
      }
    },

    _loadAdminData: function (sApp) {

      console.log("Admin view loaded:", sApp);

      if (sApp === "ID_CARD") {
        this._getIDPendingRequests();
      }

      if (sApp === "STICKER") {
        this._fetchStickerData(true);
      }

      if (sApp === "TVS") {
        this._fetchViolationAdminKpis();
        this._fetchAdminKpi();
      }

        if (sApp === "BUSINESS_VISITOR") {
       this._fetchLandingKpis();
      }
    },

    onViewModeChange: function (oEvent) {

      var oButton = oEvent.getSource();
      var sButtonId = oButton.getId();

      var sApp = null;

      if (sButtonId.includes("idsegTVS")) {

        sApp = "TVS";

      } else if (sButtonId.includes("idsegSticker")) {

        sApp = "STICKER";

      } else if (sButtonId.includes("idsegIDCard")) {

        sApp = "ID_CARD";

      } else if (sButtonId.includes("idsegBusinessVisitor")) {

        sApp = "BUSINESS_VISITOR";
      }

      if (!sApp) {
        console.error(
          "Application could not be identified from button:",
          sButtonId
        );
        return;
      }

      // Selected key from SegmentedButton
      var sViewMode = oEvent
        .getParameter("item")
        .getKey();

      console.log("Application:", sApp);
      console.log("View Mode:", sViewMode);

      var oDashboardModel =
        this.getOwnerComponent().getModel("dashboard");

      // Store selected mode
      oDashboardModel.setProperty(
        "/viewMode",
        sViewMode
      );

      // Store My View status
      oDashboardModel.setProperty(
        "/isMyView",
        sViewMode === "my"
      );

      // Get fragment
      var sFragmentName = this._getViewFragment(
        sApp,
        sViewMode
      );

      if (!sFragmentName) {
        console.error(
          "No fragment configured for:",
          sApp,
          sViewMode
        );
        return;
      }

      // Load fragment into corresponding VBox
      this._loadDynamicFragment(
        sFragmentName,
        sApp,
        sViewMode
      );
    },

    _loadInitialFragments: function () {

      var oAuthModel =
        this.getView().getModel("GetAuthModel");

      if (!oAuthModel) {
        console.error("GetAuthModel not found");
        return;
      }

      var oAuthData = oAuthModel.getProperty("/0");

      if (!oAuthData) {
        console.error("Authentication data not available");
        return;
      }

      var aApplications = [
        {
          app: "TVS",
          role: oAuthData.TVS_ROLE
        },
        {
          app: "STICKER",
          role: oAuthData.STK_ROLE
        },
        {
          app: "ID_CARD",
          role: oAuthData.ID_ROLE
        },
        {
          app: "BUSINESS_VISITOR",
          role: oAuthData.VAR_ROLE
        }
      ];

      aApplications.forEach(function (oApplication) {

        var sViewMode = this._getInitialMode(
          oApplication.role
        );

        if (!sViewMode) {
          return;
        }

        var sFragmentName = this._getViewFragment(
          oApplication.app,
          sViewMode
        );

        if (!sFragmentName) {
          console.error(
            "No initial fragment found for:",
            oApplication.app,
            sViewMode
          );
          return;
        }

        this._loadDynamicFragment(
          sFragmentName,
          oApplication.app,
          sViewMode
        );

      }.bind(this));
    },
    _applyNavAuthorization: function () {

      var oAuthModel = this.getView().getModel("GetAuthModel");
      var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

      var oAuthData = oAuthModel.getProperty("/0");

      if (!oAuthData) {
        return;
      }

      var aNavItems = oDashboardModel.getProperty("/navItems") || [];

      var oRoleMap = {
        dashboard: true,

        violations: this._hasRole(oAuthData.TVS_ROLE),

        sticker: this._hasRole(oAuthData.STK_ROLE),

        id: this._hasRole(oAuthData.ID_ROLE),

        vendor: this._hasRole(oAuthData.VAR_ROLE)
      };

      var aAuthorizedItems = aNavItems.filter(function (oItem) {

        return oRoleMap[oItem.key] === true;

      });

      oDashboardModel.setProperty(
        "/navItems",
        aAuthorizedItems
      );

      console.log("Auth Data:", oAuthData);
      console.log("Authorized Nav:", aAuthorizedItems);
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
    _loadDashboardForRole: function (sRole) {
      var sFragment = SHELL_FRAGMENTS[sRole];
      this._loadShellFragment(sFragment);
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
    }
  });
});