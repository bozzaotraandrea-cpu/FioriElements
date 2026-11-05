sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Input",
    "sap/m/Label",
    "sap/m/DatePicker",
    "sap/m/Text",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/core/Element"
], function (Controller, MessageBox, MessageToast, Dialog, Button, Input, Label, DatePicker, Text, SimpleForm, Element) {
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
         * Gestisce il click su una riga e apre il Dialog di Acquisto
         */
        onRowPress: function (oEvent) {
            var oSelectedItem = oEvent.getSource();
            var oModel = this.getView().getModel("odataSydea");
            var oContext = oSelectedItem.getBindingContext("odataSydea");
            
            if (!oContext) {
                return;
            }

            // 1. Recuperiamo i dati del materiale selezionato
            var oMaterialData = oContext.getObject();
            this._sSelectedMatnr = oMaterialData.Matnr; 

            var oView = this.getView();

            // 2. Creiamo il Dialog di Acquisto programmaticamente se non esiste ancora
            if (!this._oPurchaseDialog) {
                this._oPurchaseDialog = new Dialog({
                    title: "Riepilogo Acquisto",
                    type: "Message",
                    content: [
                        new Text({ id: "purchaseDialogText", class: "sapUiSmallMarginBottom" }),
                        //new Label({ text: "Specificare la quantità da acquistare", required: true }),
                        new Input({ 
                            id: "inputQuantity", 
                            type: "Number", 
                            placeholder: "Es. 10" 
                        })
                    ],
                    beginButton: new Button({
                        text: "Acquista",
                        type: "Emphasized",
                        press: this.onExecutePurchase.bind(this)
                    }),
                    endButton: new Button({
                        text: "Annulla",
                        press: function () {
                            this._oPurchaseDialog.close();
                        }.bind(this)
                    })
                });
                oView.addDependent(this._oPurchaseDialog);
            }

            // Resetta il campo quantità e blocca lo schermo con un indicatore di caricamento sul Dialog
            Element.getElementById("inputQuantity").setValue(""); 
            this._oPurchaseDialog.open();
            this._oPurchaseDialog.setBusy(true);

            // 3. Chiamata GET OData v2 per recuperare la descrizione specifica del materiale
            // NOTA: Sostituisci '/MaterialDescriptionSet' con il nome reale del tuo EntitySet delle descrizioni
            // e 'Maktx' con il nome tecnico del campo descrizione backend.
            var sKeyPath = oModel.createKey("/Material_TextSet", {
                Matnr: this._sSelectedMatnr
            });

            oModel.read(sKeyPath, {
                success: function (oData) {
                    this._oPurchaseDialog.setBusy(false);
                    var sDescrizione = oData.Maktx || "Nessuna descrizione disponibile";

                    // Aggiorna il testo dinamico includendo Codice E Descrizione del materiale
                    Element.getElementById("purchaseDialogText").setText(
                        "Stai acquistando il materiale: " + this._sSelectedMatnr + " - " + sDescrizione + ".\n" +
                        "Scegli la quantità da acquistare?"
                    );
                }.bind(this),
                error: function (oError) {
                    this._oPurchaseDialog.setBusy(false);
                    
                    // Se la lettura fallisce, mostriamo comunque il codice materiale per non bloccare l'utente
                    Element.getElementById("purchaseDialogText").setText(
                        "Vuoi procedere con la creazione dell'Ordine di Acquisto per il materiale " + this._sSelectedMatnr + "?"
                    );
                }.bind(this)
            });
        },

        /**
         * Chiama l'azione/metodo custom su ABAP per registrare l'acquisto
         */
        onExecutePurchase: function () {
            var oModel = this.getView().getModel("odataSydea");
            
            // 1. Recupera e convalida la quantità inserita
            var sQuantity = Element.getElementById("inputQuantity").getValue();
            
            if (!sQuantity || parseFloat(sQuantity) <= 0) {
                MessageBox.error("Inserire una quantità valida maggiore di zero.");
                return;
            }

            this._oPurchaseDialog.setBusy(true);

            // 2. Inviamo i parametri (Matnr e Menge/Quantity) al backend ABAP
            oModel.callFunction("/CreatePurchaseOrder", {
                method: "POST",
                urlParameters: {
                    "Matnr": this._sSelectedMatnr,
                    "Quantity": sQuantity // Nome del parametro tecnico che mapperai su SEGW
                },
                success: function (oData, oResponse) {
                    this._oPurchaseDialog.setBusy(false);
                    this._oPurchaseDialog.close();
                    
                    var sPoNumber = oData.Ebeln || "Generato"; 
                    MessageBox.success("Ordine di acquisto " + sPoNumber + " (Qtà: " + sQuantity + ") creato con successo!");
                }.bind(this),
                error: function (oError) {
                    this._oPurchaseDialog.setBusy(false);
                    var sErrorMessage = "Errore durante la creazione dell'ordine.";
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
