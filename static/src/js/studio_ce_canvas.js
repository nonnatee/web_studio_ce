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
            showDeleteConfirmation: false,
            groupToDelete: null,
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

    onDragStartField(ev, fieldName, fieldLabel) {
        const targetXpath = `//field[@name='${fieldName}']`;
        const findNode = (n) => {
            if (n.name === "field" && n.attrs.name === fieldName) return n;
            if (n.children) {
                for (const child of n.children) {
                    const res = findNode(child);
                    if (res) return res;
                }
            }
            return null;
        };
        let serialized = `<field name="${fieldName}"/>`;
        for (const root of this.state.archTree) {
            const match = findNode(root);
            if (match) {
                serialized = this.serializeNode(match);
                break;
            }
        }
        ev.dataTransfer.setData("text/plain", JSON.stringify({
            type: "existing",
            name: fieldName,
            xpath: targetXpath,
            xml: serialized
        }));
        ev.dataTransfer.effectAllowed = "move";
    }

    onDragStartGroup(ev, node) {
        const xpath = this.getNodeXpath(node);
        const serialized = this.serializeNode(node);
        ev.dataTransfer.setData("text/plain", JSON.stringify({
            type: "group",
            xpath: xpath,
            xml: serialized
        }));
        ev.dataTransfer.effectAllowed = "move";
    }

    onDragOverField(ev, targetFieldName) {
        const rect = ev.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const isBefore = ev.clientY < midpoint;

        const elements = document.querySelectorAll(".o_canvas_field_card");
        elements.forEach(el => {
            el.classList.remove("o_drag_over_before", "o_drag_over_after");
        });

        if (isBefore) {
            ev.currentTarget.classList.add("o_drag_over_before");
        } else {
            ev.currentTarget.classList.add("o_drag_over_after");
        }
    }

    onDragLeaveField(ev) {
        ev.currentTarget.classList.remove("o_drag_over_before", "o_drag_over_after");
    }

    async onDropField(ev, targetFieldName) {
        ev.currentTarget.classList.remove("o_drag_over_before", "o_drag_over_after");
        const dataStr = ev.dataTransfer.getData("text/plain");
        if (!dataStr) return;
        try {
            const data = JSON.parse(dataStr);
            const rect = ev.currentTarget.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const isBefore = ev.clientY < midpoint;
            const position = isBefore ? "before" : "after";
            const targetXpath = `//field[@name='${targetFieldName}']`;

            if (data.type === "existing") {
                if (data.name === targetFieldName) return;
                await this.props.onMoveNode(data.xpath, targetXpath, position, data.xml);
            } else if (data.type === "group") {
                if (data.xpath === targetXpath) return;
                await this.props.onMoveNode(data.xpath, targetXpath, position, data.xml);
            } else if (data.type === "new") {
                await this.props.onInsertNewField(data.fieldType, targetFieldName, position);
            } else if (data.type === "new_group") {
                await this.props.onInsertNewGroup(targetFieldName, position);
            }
        } catch (e) {
            console.error("Drop field error", e);
        }
    }

    onDragOverContainer(ev, node) {
        ev.currentTarget.classList.add("o_drag_over_container");
    }

    onDragLeaveContainer(ev) {
        ev.currentTarget.classList.remove("o_drag_over_container");
    }

    async onDropContainer(ev, node) {
        ev.currentTarget.classList.remove("o_drag_over_container");
        const dataStr = ev.dataTransfer.getData("text/plain");
        if (!dataStr) return;
        try {
            const data = JSON.parse(dataStr);
            let targetXpath = this.getNodeXpath(node);
            let position = "inside";

            if (data.type === "existing") {
                if (data.xpath === targetXpath) return;
                await this.props.onMoveNode(data.xpath, targetXpath, position, data.xml);
            } else if (data.type === "group") {
                if (data.xpath === targetXpath) return;
                await this.props.onMoveNode(data.xpath, targetXpath, position, data.xml);
            } else if (data.type === "new") {
                const targetField = (node.name === "sheet") ? null : targetXpath;
                await this.props.onInsertNewField(data.fieldType, targetField, position);
            } else if (data.type === "new_group") {
                const targetField = (node.name === "sheet") ? null : targetXpath;
                await this.props.onInsertNewGroup(targetField, position);
            }
        } catch (e) {
            console.error("Drop container error", e);
        }
    }

    selectGroup(node) {
        const xpath = this.getNodeXpath(node);
        this.props.onSelectField({
            id: xpath,
            name: xpath,
            field_description: node.attrs.string || "",
            ttype: "group"
        });
    }

    onDeleteGroupClick(node) {
        // Collect children that are fields or subgroups
        const children = (node.children || []).filter(c => c.name === "field" || c.name === "group");
        if (children.length > 0) {
            this.state.groupToDelete = node;
            this.state.showDeleteConfirmation = true;
        } else {
            const xpath = this.getNodeXpath(node);
            this.props.onDeleteNode(xpath);
        }
    }

    closeDeleteConfirmation() {
        this.state.showDeleteConfirmation = false;
        this.state.groupToDelete = null;
    }

    async confirmDeleteGroupAll() {
        if (!this.state.groupToDelete) return;
        const xpath = this.getNodeXpath(this.state.groupToDelete);
        await this.props.onDeleteNode(xpath);
        this.closeDeleteConfirmation();
    }

    async unwrapGroup() {
        if (!this.state.groupToDelete) return;
        const node = this.state.groupToDelete;
        const xpath = this.getNodeXpath(node);
        
        let modificationXml = "";
        for (const child of node.children) {
            const childXml = this.serializeNode(child);
            modificationXml += `<xpath expr="${xpath}" position="before">${childXml}</xpath>\n`;
        }
        modificationXml += `<xpath expr="${xpath}" position="replace"/>`;
        
        this.state.showDeleteConfirmation = false;
        try {
            await this.props.onMoveNode("", "", "", modificationXml);
        } catch (e) {
            console.error("Unwrap group failed", e);
        } finally {
            this.closeDeleteConfirmation();
        }
    }

    serializeNode(node) {
        let attrs = Object.entries(node.attrs || {})
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ");
        if (attrs) attrs = " " + attrs;
        if (!node.children || node.children.length === 0) {
            return `<${node.name}${attrs}/>`;
        }
        const childrenXml = node.children.map(c => this.serializeNode(c)).join("\n");
        return `<${node.name}${attrs}>${childrenXml}</${node.name}>`;
    }

    getNodeXpath(node) {
        if (!node) return "";
        if (node.name === "field") {
            return `//field[@name='${node.attrs.name}']`;
        }
        if (node.name === "group") {
            if (node.attrs.string) {
                return `//group[@string='${node.attrs.string}']`;
            }
            if (node.attrs.name) {
                return `//group[@name='${node.attrs.name}']`;
            }
            const firstField = this.findFirstFieldChild(node);
            if (firstField) {
                return `//field[@name='${firstField.attrs.name}']/parent::group`;
            }
            return "//group[1]";
        }
        if (node.name === "page") {
            if (node.attrs.string) {
                return `//page[@string='${node.attrs.string}']`;
            }
            if (node.attrs.name) {
                return `//page[@name='${node.attrs.name}']`;
            }
            return "//page[1]";
        }
        return "//sheet";
    }

    findFirstFieldChild(node) {
        if (node.name === "field") return node;
        if (node.children) {
            for (const child of node.children) {
                const f = this.findFirstFieldChild(child);
                if (f) return f;
            }
        }
        return null;
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
    onInsertNewField: Function,
    onInsertNewGroup: Function,
    onMoveNode: Function,
    onDeleteNode: Function,
    onOverrideProperty: Function,
    onRegister: Function,
    onViewChange: Function,
};
