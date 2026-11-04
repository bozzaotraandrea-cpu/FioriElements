sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("my.namespace.myapp.controller.Main", {

        onInit: function () {
            // Il modello OData definito nel manifest.json viene ereditato automaticamente.
            // Attiviamo l'indicatore di caricamento sulla tabella durante il fetch dei dati
            var oTable = this.getView().byId("genericTable");
            
            oTable.attachEventOnce("updateFinished", function() {
                MessageToast.show("Dati caricati con successo!");
            });
        },

        /**
         * Gestisce il refresh manuale della tabella legato al bottone della Toolbar
         */
        onRefresh: function () {
            var oTable = this.getView().byId("genericTable");
            var oBinding = oTable.getBinding("items");

            if (oBinding) {
                // In OData V2, il refresh ricarica i dati direttamente dal server backend
                oBinding.refresh(true); 
                MessageToast.show("Aggiornamento in corso...");
            } else {
                MessageBox.error("Impossibile aggiornare: Binding non trovato.");
            }
        },

        /**
         * Gestisce il click su una riga della tabella (Navigation)
         */
        onRowPress: function (oEvent) {
            // Recupera l'oggetto della riga selezionata
            var oSelectedItem = oEvent.getSource();
            var oContext = oSelectedItem.getBindingContext();
            
            if (oContext) {
                // Estrae la chiave dell'entità (es. /NomeDellaTuaEntity('101'))
                var sPath = oContext.getPath();
                var oData = oContext.getObject();

                MessageToast.show("Hai selezionato l'elemento con ID: " + oData.ID);

                // Qui puoi implementare la navigazione verso una vista di dettaglio, ad esempio:
                // this.getOwnerComponent().getRouter().navTo("detail", {
                //     entityId: oData.ID
                // });
            }
        }
    });
});