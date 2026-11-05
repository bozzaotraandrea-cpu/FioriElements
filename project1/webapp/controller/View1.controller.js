sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/DatePicker",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/core/Element"
], function (Controller, MessageBox, MessageToast, Dialog, Button, Input, Label, DatePicker, SimpleForm, Element) {
    "use strict";

    return Controller.extend("my.namespace.myapp.controller.Main", {

        onInit: function () {
            // Inizializzazione pulita
        },

        /**
         * Rinfresca la tabella prendendo i dati aggiornati dal backend S/4 HANA
         */
        onRefresh: function () {
            var oTable = this.getView().byId("genericTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh(true);
            }
        },

        /**
         * Apre il Dialog per l'inserimento dei dati del nuovo materiale con il DatePicker
         */
        onOpenCreateDialog: function () {
            var oView = this.getView();

            if (!this._oCreateDialog) {
                this._oCreateDialog = new Dialog({
                    title: "Crea Nuovo Materiale",
                    contentWidth: "400px",
                    content: new SimpleForm({
                        editable: true,
                        content: [
                            new Label({ text: "Codice Materiale (Matnr)", required: true }),
                            new Input({ id: "inputMatnr" }),

                            new Label({ text: "Data Creazione (Ersda)" }),
                            new DatePicker({ 
                                id: "inputErsda",
                                displayFormat: "dd/MM/yyyy",
                                valueFormat: "yyyy-MM-ddT00:00:00"
                            }),

                            new Label({ text: "Creato Da (Ernam)" }),
                            new Input({ id: "inputErnam" }),

                            new Label({ text: "Tipo Materiale (Mtart)" }),
                            new Input({ id: "inputMtart" })
                        ]
                    }),
                    beginButton: new Button({
                        text: "Salva",
                        type: "Emphasized",
                        press: this.onCreateMaterial.bind(this)
                    }),
                    endButton: new Button({
                        text: "Annulla",
                        press: function () {
                            this._oCreateDialog.close();
                        }.bind(this)
                    })
                });

                oView.addDependent(this._oCreateDialog);
            }

            // Pulisce i campi in modo sicuro usando Element
            Element.getElementById("inputMatnr").setValue("");
            Element.getElementById("inputErsda").setValue(""); 
            Element.getElementById("inputErnam").setValue("");
            Element.getElementById("inputMtart").setValue("");

            this._oCreateDialog.open();
        },

        /**
         * Esegue l'operazione di POST (Create) verso S/4 HANA
         */
        onCreateMaterial: function () {
            var oModel = this.getView().getModel("odataSydea");
            
            // Recupero sicuro dei valori dei campi
            var sMatnr = Element.getElementById("inputMatnr").getValue();
            var sErsda = Element.getElementById("inputErsda").getValue(); 
            var sErnam = Element.getElementById("inputErnam").getValue();
            var sMtart = Element.getElementById("inputMtart").getValue();

            if (!sMatnr) {
                MessageBox.error("Il Codice Materiale è obbligatorio.");
                return;
            }

            var oPayload = {
                Matnr: sMatnr,
                Ersda: sErsda ? sErsda : null, 
                Ernam: sErnam,
                Mtart: sMtart
            };

            this._oCreateDialog.setBusy(true);

            oModel.create("/MaterialSet", oPayload, {
                success: function (oData, oResponse) {
                    this._oCreateDialog.setBusy(false);
                    this._oCreateDialog.close();
                    MessageToast.show("Materiale creato con successo!");
                    this.onRefresh();
                }.bind(this),
                error: function (oError) {
                    this._oCreateDialog.setBusy(false);
                    var sErrorMessage = "Errore durante la creazione del materiale.";
                    if (oError.responseText) {
                        try {
                            var oResponseObj = JSON.parse(oError.responseText);
                            sErrorMessage = oResponseObj.error.message.value;
                        } catch (e) {
                            sErrorMessage = oError.responseText;
                        }
                    }
                    MessageBox.error(sErrorMessage);
                }.bind(this)
            });
        }
    });
});
