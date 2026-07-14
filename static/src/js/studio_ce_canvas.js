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
            mode: "canvas", // canvas (edit), form (realistic form), list (realistic list)
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

    async switchMode(newMode) {
        if (newMode === 'form') {
            const formView = this.props.views.find(v => v.type === 'form');
            if (formView && (!this.props.view || this.props.view.id !== formView.id)) {
                await this.props.onViewChange(formView.id);
            }
        } else if (newMode === 'list') {
            const listView = this.props.views.find(v => v.type === 'list' || v.type === 'tree');
            if (listView && (!this.props.view || this.props.view.id !== listView.id)) {
                await this.props.onViewChange(listView.id);
            }
        } else if (newMode === 'kanban') {
            const kanbanView = this.props.views.find(v => v.type === 'kanban');
            if (kanbanView && (!this.props.view || this.props.view.id !== kanbanView.id)) {
                await this.props.onViewChange(kanbanView.id);
            }
        }
        this.state.mode = newMode;
    }

    getListFields(node) {
        const fields = [];
        const findFields = (n) => {
            if (n.name === 'field') {
                fields.push({
                    name: n.attrs.name,
                    string: n.attrs.string || this.getFieldLabel(n.attrs.name),
                    type: this.getFieldType(n.attrs.name),
                });
            }
            if (n.children) {
                n.children.forEach(findFields);
            }
        };
        findFields(node);
        return fields;
    }

    getFieldType(fieldName) {
        const f = this.props.fields.find(field => field.name === fieldName);
        return f ? f.ttype : 'char';
    }

    getMockValue(name, type, rowNum) {
        if (type === 'boolean') return '☑';
        if (type === 'integer') return `${10 * rowNum + 5}`;
        if (type === 'float' || type === 'monetary') return `$${(45.5 * rowNum).toFixed(2)}`;
        if (type === 'date' || type === 'datetime') return '2026-07-13';
        return `Sample Value ${rowNum}`;
    }
}

StudioCeCanvas.template = "web_studio_ce.StudioCeCanvas";
StudioCeCanvas.props = {
    view: { type: Object, optional: true },
    views: Array,
    fields: Array,
    selectedField: { type: true, optional: true },
    onSelectField: Function,
    onToggleVisibility: Function,
    onInsertField: Function,
    onOverrideProperty: Function,
    onRegister: Function,
    onViewChange: Function,
};
