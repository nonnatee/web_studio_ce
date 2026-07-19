/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps } from "@odoo/owl";

export class StudioCeCanvas extends Component {
    setup() {
        this.state = useState({
            blocks: [],
            selectedBlockId: null,
            viewMode: "preview", // 'preview' or 'layout'
            isViewDropdownOpen: false,
        });

        // Initialize design mode in shared config safely
        if (!this.env.config) {
            this.env.config = {};
        }
        this.env.config.studioMode = true;

        onWillStart(async () => {
            if (this.props.view) {
                this.state.blocks = this.parseArchToBlocks(this.props.view.arch);
            }
        });

        onWillUpdateProps((nextProps) => {
            if (nextProps.view) {
                this.state.blocks = this.parseArchToBlocks(nextProps.view.arch);
            }
        });
    }

    parseArchToBlocks(xmlStr) {
        if (!xmlStr) return [];
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
            const parserError = xmlDoc.querySelector("parsererror");
            if (parserError) {
                console.error("XML parse error", parserError.textContent);
                return [];
            }
            
            let nodeIdCounter = 1;
            const convert = (node, xpath = "") => {
                if (node.nodeType !== 1) return null;
                
                const tag = node.nodeName;
                if (["xpath", "data", "attribute"].includes(tag)) {
                    const children = [];
                    for (let i = 0; i < node.childNodes.length; i++) {
                        const child = convert(node.childNodes[i], xpath);
                        if (child) {
                            if (Array.isArray(child)) children.push(...child);
                            else children.push(child);
                        }
                    }
                    return children;
                }
                
                const attrs = {};
                for (let i = 0; i < node.attributes.length; i++) {
                    const attr = node.attributes[i];
                    attrs[attr.name] = attr.value;
                }

                let currentXpath = xpath;
                if (tag === "field" && attrs.name) {
                    currentXpath += `//field[@name='${attrs.name}']`;
                } else if (tag === "group" && attrs.string) {
                    currentXpath += `//group[@string='${attrs.string}']`;
                } else if (tag === "page" && attrs.string) {
                    currentXpath += `//page[@string='${attrs.string}']`;
                } else if (attrs.name) {
                    currentXpath += `//${tag}[@name='${attrs.name}']`;
                } else {
                    currentXpath += `//${tag}`;
                }

                const children = [];
                for (let i = 0; i < node.childNodes.length; i++) {
                    const child = convert(node.childNodes[i], currentXpath);
                    if (child) {
                        if (Array.isArray(child)) children.push(...child);
                        else children.push(child);
                    }
                }

                return {
                    id: `block_${nodeIdCounter++}`,
                    tag,
                    attrs,
                    xpath: currentXpath,
                    children: children.filter(Boolean)
                };
            };
            
            const root = xmlDoc.documentElement;
            if (!root) return [];
            
            const result = convert(root);
            return Array.isArray(result) ? result : [result];
        } catch (e) {
            console.error("Failed to parse arch to blocks", e);
            return [];
        }
    }

    get groupedViews() {
        const groups = {};
        const viewTypes = {
            form: "Form Views",
            list: "List Views",
            tree: "List Views",
            kanban: "Kanban Views",
            search: "Search Views"
        };
        for (const view of this.props.views || []) {
            const label = viewTypes[view.type] || (view.type.charAt(0).toUpperCase() + view.type.slice(1) + " Views");
            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(view);
        }
        return Object.entries(groups).map(([typeLabel, views]) => ({
            typeLabel,
            views
        }));
    }

    toggleViewDropdown() {
        this.state.isViewDropdownOpen = !this.state.isViewDropdownOpen;
    }

    selectView(viewId) {
        this.state.isViewDropdownOpen = false;
        if (this.props.onViewChange) {
            this.props.onViewChange(viewId);
        }
    }

    getBlockLabel(block) {
        if (block.tag === "field" && block.attrs.name) {
            const field = this.props.fields.find(f => f.name === block.attrs.name);
            return field ? field.string : (block.attrs.string || block.attrs.name);
        }
        if (block.tag === "page" && block.attrs.string) {
            return block.attrs.string;
        }
        if (block.tag === "group" && block.attrs.string) {
            return block.attrs.string;
        }
        return block.attrs.string || block.attrs.name || block.tag;
    }

    get sheetChildren() {
        const root = this.state.blocks[0];
        if (!root) return [];
        let list = [];
        if (root.tag === "form") {
            const sheet = root.children.find(c => c.tag === "sheet");
            list = sheet ? sheet.children : root.children;
        } else {
            list = root.children || [];
        }
        return list.filter(c => {
            if (c.tag === "div" && c.attrs.name === "button_box") return false;
            if (c.tag === "button" && (c.attrs.class || "").includes("oe_stat_button")) return false;
            return true;
        });
    }

    get statButtons() {
        const root = this.state.blocks[0];
        if (!root) return [];
        const buttons = [];
        const findButtons = (node) => {
            if (node.tag === "button" && (node.attrs.class || "").includes("oe_stat_button")) {
                buttons.push(node);
            }
            if (node.children) {
                node.children.forEach(findButtons);
            }
        };
        findButtons(root);
        return buttons;
    }

    get listFields() {
        const root = this.state.blocks[0];
        if (!root) return [];
        if (root.tag === "list" || root.tag === "tree") {
            return root.children.filter(c => c.tag === "field");
        }
        const fields = [];
        const findFields = (node) => {
            if (node.tag === "field") fields.push(node);
            if (node.children) {
                node.children.forEach(findFields);
            }
        };
        findFields(root);
        return fields;
    }

    hasSubGroups(block) {
        return block.children && block.children.some(c => c.tag === "group");
    }

    getMockValue(block) {
        const name = block.attrs.name || "";
        const label = this.getBlockLabel(block);
        
        const field = this.props.fields.find(f => f.name === name);
        const ttype = field ? field.ttype : (block.attrs.widget || "char");
        
        switch (ttype) {
            case "boolean":
                return true;
            case "integer":
                return "42";
            case "float":
                return "19.99";
            case "monetary":
                return "1,250.00";
            case "date":
                return "2026-07-18";
            case "datetime":
                return "2026-07-18 14:30:00";
            case "many2one":
                return field && field.relation ? `Mock ${field.relation} (ID: 1)` : "Administrator";
            case "selection":
                return "Draft";
            case "many2many":
                return "Tags";
            case "html":
                return "<p>This is a <strong>mock description</strong> for preview purposes.</p>";
            case "binary":
                return "file.pdf";
            default:
                if (name.includes("name") || name.includes("title")) {
                    return `Mock ${this.props.model} Record`;
                }
                return `Mock ${label}`;
        }
    }

    isContainer(block) {
        return ["sheet", "group", "notebook", "page", "form", "list", "tree", "kanban", "div", "header", "footer"].includes(block.tag);
    }

    getBlockClass(block) {
        let cls = `o_studio_ce_block_${block.tag} `;
        if (this.state.selectedBlockId === block.id) {
            cls += "o_studio_ce_block_selected ";
        }
        return cls.trim();
    }

    selectBlock(block) {
        this.state.selectedBlockId = block.id;
        
        if (block.tag === "field") {
            const fieldData = this.props.fields.find(f => f.name === block.attrs.name) || {
                name: block.attrs.name,
                field_description: block.attrs.string || block.attrs.name,
                ttype: block.attrs.widget || "char",
                required: block.attrs.required === "1" || block.attrs.required === "true",
                invisible: block.attrs.invisible === "1" || block.attrs.invisible === "true",
                readonly: block.attrs.readonly === "1" || block.attrs.readonly === "true",
            };
            this.props.onSelectField(fieldData);
        } else if (block.tag === "button" && (block.attrs.class || "").includes("oe_stat_button")) {
            this.props.onSelectField({
                id: block.xpath,
                name: block.xpath,
                ttype: "button",
                field_description: block.attrs.string || "Smart Button",
                icon: block.attrs.icon || "fa-star",
                action_id: block.attrs.name || "",
            });
        } else {
            this.props.onSelectField({
                id: block.xpath,
                name: block.xpath,
                field_description: block.attrs.string || block.tag,
                ttype: block.tag
            });
        }
    }

    async deleteBlock(block) {
        if (confirm(`Are you sure you want to remove this ${block.tag} from the layout?`)) {
            await this.props.onDeleteNode(block.xpath);
        }
    }

    async renameBlockInline(block) {
        const currentName = block.attrs.string || block.attrs.name || block.tag;
        const newName = prompt(`Enter new label for this ${block.tag} block:`, currentName);
        if (newName !== null && newName.trim() !== "" && newName !== currentName) {
            const fieldName = block.tag === "field" ? block.attrs.name : block.xpath;
            const prop = block.tag === "field" ? "label" : "string";
            await this.props.onOverrideProperty(fieldName, prop, newName.trim());
        }
    }

    onBlockDragStart(ev, block) {
        ev.stopPropagation();
        ev.dataTransfer.setData("text/plain", JSON.stringify({
            type: "existing",
            xpath: block.xpath,
            tag: block.tag,
            name: block.attrs.name || ""
        }));
        ev.dataTransfer.effectAllowed = "move";
    }

    onBlockDragOver(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        ev.currentTarget.classList.add("o_studio_ce_drop_zone_active");
    }

    onBlockDragLeave(ev) {
        ev.stopPropagation();
        ev.currentTarget.classList.remove("o_studio_ce_drop_zone_active");
    }

    async insertNewSmartButton(targetXpath, position) {
        if (!this.props.view) return;
        try {
            await rpc("/web_studio_ce/insert_smart_button", {
                view_id: this.props.view.id,
                target_xpath: targetXpath,
                position: position,
            });
            if (this.props.onViewChange) {
                this.props.onViewChange(this.props.view.id);
            }
        } catch (err) {
            console.error("Failed to insert smart button", err);
        }
    }

    async onBlockDrop(ev, targetBlock, position) {
        ev.preventDefault();
        ev.stopPropagation();
        
        ev.currentTarget.classList.remove("o_studio_ce_drop_zone_active");
        
        const dataStr = ev.dataTransfer.getData("text/plain");
        if (!dataStr) return;
        
        try {
            const data = JSON.parse(dataStr);
            
            if (data.type === "existing") {
                if (data.xpath && data.xpath !== targetBlock.xpath) {
                    await this.props.onMoveNode(data.xpath, targetBlock.xpath, position);
                }
            } else if (data.type === "new") {
                await this.props.onInsertNewField(data.fieldType, targetBlock.xpath, position);
            } else if (data.type === "new_group") {
                await this.props.onInsertNewGroup(targetBlock.xpath, position);
            } else if (data.type === "new_button") {
                await this.insertNewSmartButton(targetBlock.xpath, position);
            }
        } catch (e) {
            console.error("Drop error", e);
        }
    }
}

StudioCeCanvas.template = "web_studio_ce.StudioCeCanvas";
StudioCeCanvas.components = {};
StudioCeCanvas.props = {
    model: String,
    view: { type: true, optional: true },
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
    onViewChange: Function,
    onRegister: { type: Function, optional: true },
};
