/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";

export class StudioCeCanvas extends Component {
    setup() {
        this.state = useState({
            archTree: [],
            insertingField: null,
            targetFieldName: "",
            insertPosition: "after",
            groupName: "",
            pageName: "",
            showInsertModal: false,
        });

        onWillStart(() => {
            this.updateArchTree();
        });

        onWillUpdateProps((nextProps) => {
            if (nextProps.view && (!this.props.view || nextProps.view.arch !== this.props.view.arch)) {
                this.updateArchTree(nextProps.view.arch);
            }
        });

        if (this.props.onRegister) {
            this.props.onRegister(this);
        }
    }

    updateArchTree(archXml) {
        if (archXml === undefined) {
            archXml = this.props.view ? this.props.view.arch : "";
        }
        if (!archXml) {
            this.state.archTree = [];
            return;
        }
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(archXml, "text/xml");
            
            const convert = (node) => {
                if (node.nodeType !== 1) return null;
                const attrs = {};
                for (let i = 0; i < node.attributes.length; i++) {
                    const attr = node.attributes[i];
                    attrs[attr.name] = attr.value;
                }
                const children = [];
                for (let i = 0; i < node.childNodes.length; i++) {
                    const child = convert(node.childNodes[i]);
                    if (child) children.push(child);
                }
                return {
                    name: node.nodeName,
                    attrs,
                    children,
                };
            };
            
            const root = xmlDoc.documentElement;
            this.state.archTree = root ? [convert(root)] : [];
        } catch (e) {
            console.error("Failed to parse arch XML", e);
            this.state.archTree = [];
        }
    }

    getFieldLabel(fieldName) {
        const f = this.props.fields.find(field => field.name === fieldName);
        return f ? f.field_description : fieldName;
    }

    selectField(fieldName) {
        const f = this.props.fields.find(field => field.name === fieldName);
        if (f) {
            this.props.onSelectField(f);
        }
    }

    startInsertion(field) {
        this.state.insertingField = field;
        this.state.showInsertModal = true;
    }

    closeInsertion() {
        this.state.insertingField = null;
        this.state.showInsertModal = false;
    }

    async submitInsertion() {
        if (!this.state.insertingField) return;
        await this.props.onInsertField(
            this.state.insertingField.name,
            this.state.targetFieldName || null,
            this.state.insertPosition,
            this.state.groupName || null,
            this.state.pageName || null
        );
        this.closeInsertion();
    }
}

StudioCeCanvas.template = "web_studio_ce.StudioCeCanvas";
StudioCeCanvas.props = {
    view: { type: Object, optional: true },
    fields: Array,
    selectedField: { type: Object, optional: true },
    onSelectField: Function,
    onToggleVisibility: Function,
    onInsertField: Function,
    onOverrideProperty: Function,
    onRegister: Function,
};
