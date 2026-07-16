/** @odoo-module **/

import { Component, useState, onWillStart, onWillUpdateProps, useRef } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";

export class ReportEditor extends Component {
    setup() {
        this.previewIframe = useRef("previewIframe");
        this.state = useState({
            parsedTree: [],
            selectedNode: null,
            selectedNodeId: null,
            activeEditorTab: "tree",
            recordId: 1,
        });

        onWillStart(async () => {
            await this.loadRecordId();
            if (this.props.report) {
                this.state.parsedTree = this.parseQWebXml(this.props.report.arch);
            }
        });

        onWillUpdateProps(async (nextProps) => {
            if (nextProps.report && (!this.props.report || nextProps.report.id !== this.props.report.id)) {
                this.state.parsedTree = this.parseQWebXml(nextProps.report.arch);
                this.state.selectedNode = null;
                this.state.selectedNodeId = null;
            }
        });
    }

    async loadRecordId() {
        try {
            const ids = await rpc("/web/dataset/call_kw", {
                model: this.props.model,
                method: "search",
                args: [[]],
                kwargs: { limit: 1 }
            });
            if (ids && ids.length > 0) {
                this.state.recordId = ids[0];
            }
        } catch (error) {
            console.error("Failed to load sample record ID", error);
            this.state.recordId = 1;
        }
    }

    get reportPreviewUrl() {
        if (!this.props.report) return "";
        return `/report/html/${this.props.report.report_name}/${this.state.recordId}`;
    }

    parseQWebXml(arch) {
        if (!arch) return [];
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(arch, "text/xml");
            
            let nodeIdCounter = 1;
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
                
                let text = "";
                for (let i = 0; i < node.childNodes.length; i++) {
                    if (node.childNodes[i].nodeType === 3) {
                        const val = node.childNodes[i].nodeValue.trim();
                        if (val) {
                            text = val;
                            break;
                        }
                    }
                }

                return {
                    id: `qn_${nodeIdCounter++}`,
                    tag: node.nodeName,
                    attrs,
                    children,
                    text,
                    _originalNodeRef: node
                };
            };
            
            const root = xmlDoc.documentElement;
            this.xmlDoc = xmlDoc;
            return root ? [convert(root)] : [];
        } catch (e) {
            console.error("Failed to parse QWeb XML", e);
            return [];
        }
    }

    serializeQWebXml() {
        if (!this.xmlDoc) return "";
        const serializer = new XMLSerializer();
        return serializer.serializeToString(this.xmlDoc);
    }

    selectNode(node) {
        this.state.selectedNode = node;
        this.state.selectedNodeId = node.id;
        this.state.activeEditorTab = "properties";
    }

    isTextNode(node) {
        if (!node) return false;
        return ["span", "div", "p", "strong", "em", "h1", "h2", "h3", "td", "th", "li"].includes(node.tag);
    }

    onTextNodeChange(ev) {
        const val = ev.target.value;
        this.state.selectedNode.text = val;
        const rawNode = this.state.selectedNode._originalNodeRef;
        if (rawNode) {
            let foundText = false;
            for (let i = 0; i < rawNode.childNodes.length; i++) {
                if (rawNode.childNodes[i].nodeType === 3) {
                    rawNode.childNodes[i].nodeValue = val;
                    foundText = true;
                    break;
                }
            }
            if (!foundText) {
                const txtNode = this.xmlDoc.createTextNode(val);
                rawNode.appendChild(txtNode);
            }
        }
    }

    getNodeStyle(styleName) {
        if (!this.state.selectedNode) return "";
        const styleStr = this.state.selectedNode.attrs['style'] || "";
        const match = styleStr.match(new RegExp(`${styleName}\\s*:\\s*([^;]+)`));
        return match ? match[1].trim() : "";
    }

    setNodeStyle(styleName, val) {
        if (!this.state.selectedNode) return;
        const styleStr = this.state.selectedNode.attrs['style'] || "";
        const styles = {};
        styleStr.split(";").forEach(s => {
            const parts = s.split(":");
            if (parts.length === 2) {
                styles[parts[0].trim()] = parts[1].trim();
            }
        });
        
        if (val) {
            styles[styleName] = val;
        } else {
            delete styles[styleName];
        }
        
        const newStyleStr = Object.entries(styles)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
            
        this.state.selectedNode.attrs['style'] = newStyleStr;
        const rawNode = this.state.selectedNode._originalNodeRef;
        if (rawNode) {
            if (newStyleStr) {
                rawNode.setAttribute("style", newStyleStr);
            } else {
                rawNode.removeAttribute("style");
            }
        }
    }

    setNodeAttribute(attrName, val) {
        if (!this.state.selectedNode) return;
        const rawNode = this.state.selectedNode._originalNodeRef;
        if (rawNode) {
            if (val) {
                this.state.selectedNode.attrs[attrName] = val;
                rawNode.setAttribute(attrName, val);
            } else {
                delete this.state.selectedNode.attrs[attrName];
                rawNode.removeAttribute(attrName);
            }
        }
    }

    deleteSelectedNode() {
        if (!this.state.selectedNode) return;
        const rawNode = this.state.selectedNode._originalNodeRef;
        if (rawNode && rawNode.parentNode) {
            rawNode.parentNode.removeChild(rawNode);
            this.state.parsedTree = this.parseQWebXml(this.serializeQWebXml());
            this.state.selectedNode = null;
            this.state.selectedNodeId = null;
            this.state.activeEditorTab = "tree";
        }
    }

    async saveReport() {
        if (!this.props.report) return;
        try {
            const arch = this.serializeQWebXml();
            const res = await rpc("/web_studio_ce/save_report_layout", {
                view_id: this.props.report.view_id,
                arch: arch
            });
            if (res.status === "success") {
                alert("Report layout saved successfully!");
                this.refreshPreview();
            } else {
                alert(`Error saving report: ${res.error}`);
            }
        } catch (error) {
            console.error("Save report failed", error);
            alert("Error saving report template.");
        }
    }

    refreshPreview() {
        if (this.previewIframe.el) {
            this.previewIframe.el.src = this.reportPreviewUrl;
        }
    }

    onIframeLoaded() {
        // Option to intercept iframe clicks if needed
    }
}

ReportEditor.template = "web_studio_ce.ReportEditor";
ReportEditor.props = {
    model: String,
    report: { type: true, optional: true },
    onBack: Function,
};
