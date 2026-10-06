sap.ui.define([], () => {
  "use strict";

  /**
   * One-off reads from an OData V4 model.
   *
   * The dashboard copies what it reads into its JSON view model, so nothing
   * stays bound to the service. Each read therefore goes through a temporary
   * list binding that is destroyed once the data has been copied; a binding
   * left alive would stay registered with the model and take part in every
   * later refresh.
   */
  const ODataReader = {
    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The model to read from
     * @param {string} sPath Absolute path of the collection
     * @param {object} [mOptions] Read options
     * @param {sap.ui.model.Filter[]} [mOptions.filters] Filters, combined with AND
     * @param {sap.ui.model.Sorter[]} [mOptions.sorters] Sorters
     * @param {object} [mOptions.parameters] Binding parameters such as $select
     * @param {int} [mOptions.length] Maximum number of entities; defaults to the model's size limit
     * @returns {Promise<object[]>} Plain copies of the entities
     */
    async readList(oModel, sPath, mOptions = {}) {
      const oBinding = oModel.bindList(
        sPath,
        undefined,
        mOptions.sorters,
        mOptions.filters,
        mOptions.parameters
      );

      try {
        const aContexts = await oBinding.requestContexts(0, mOptions.length);
        return aContexts.map((oContext) => oContext.getObject());
      } finally {
        oBinding.destroy();
      }
    },

    /**
     * @param {sap.ui.model.odata.v4.ODataModel} oModel The model to read from
     * @param {string} sPath Absolute path of the collection
     * @param {object} [mOptions] Read options, see {@link #readList}
     * @returns {Promise<object|undefined>} The first entity, if there is one
     */
    async readFirst(oModel, sPath, mOptions = {}) {
      const aEntities = await ODataReader.readList(oModel, sPath, {
        ...mOptions,
        length: 1,
      });
      return aEntities[0];
    },
  };

  return ODataReader;
});
