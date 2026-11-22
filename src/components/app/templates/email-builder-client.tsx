"use client";

import { useEffect, useRef, useState } from "react";

interface EmailBuilderClientProps {
  templateId?: string;
  onHtml: (html: string) => void;
  onSave?: (project: string, mjml: string, html: string) => Promise<void>;
}

/**
 * Client-only GrapesJS wrapper with MJML plugin.
 * Mounts editor, loads template if templateId provided,
 * exports MJML->HTML and calls onHtml callback.
 */
export function EmailBuilderClient({
  templateId,
  onHtml,
  onSave,
}: EmailBuilderClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initEditor() {
      try {
        // Dynamic imports for client-side only
        const grapesjsModule = await import("grapesjs");
        const grapesjsMjmlModule = await import("grapesjs-mjml");
        const grapesjs = grapesjsModule.default;
        const grapesjsMjml = grapesjsMjmlModule.default;

        if (!mounted || !containerRef.current) return;

        const editor = grapesjs.init({
          container: containerRef.current,
          fromElement: false,
          height: "600px",
          width: "auto",
          storageManager: false, // We'll handle storage manually
          plugins: [grapesjsMjml],
          pluginsOpts: {
            "grapesjs-mjml": {
              // MJML plugin options
            },
          },
          deviceManager: {
            devices: [
              {
                name: "Desktop",
                width: "",
                widthMedia: "",
              },
              {
                name: "Mobile",
                width: "375px",
                widthMedia: "max-width: 375px",
              },
            ],
          },
          blockManager: {
            appendTo: "#gjs-blocks",
            blocks: [
              // Section blocks
              {
                id: "section-1col",
                label: "1 Column",
                category: "Layout",
                content: `<mj-section><mj-column></mj-column></mj-section>`,
              },
              {
                id: "section-2col",
                label: "2 Columns",
                category: "Layout",
                content: `<mj-section><mj-column width="50%"></mj-column><mj-column width="50%"></mj-column></mj-section>`,
              },
              {
                id: "section-3col",
                label: "3 Columns",
                category: "Layout",
                content: `<mj-section><mj-column width="33.33%"></mj-column><mj-column width="33.33%"></mj-column><mj-column width="33.33%"></mj-column></mj-section>`,
              },
              // Content blocks
              {
                id: "text",
                label: "Text",
                category: "Content",
                content: `<mj-text font-family="Helvetica, Arial, sans-serif" font-size="16px" line-height="26px" color="#1a1a1a">Enter your text here...</mj-text>`,
              },
              {
                id: "image",
                label: "Image",
                category: "Content",
                content: `<mj-image src="https://via.placeholder.com/560x300" alt="Image" padding="20px"></mj-image>`,
              },
              {
                id: "button",
                label: "Button",
                category: "Content",
                content: `<mj-button background-color="#1a1a1a" color="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="16px" padding="20px" border-radius="6px">Call to Action</mj-button>`,
              },
              {
                id: "divider",
                label: "Divider",
                category: "Content",
                content: `<mj-divider border-color="#ececec" border-width="1px" padding="20px"></mj-divider>`,
              },
              {
                id: "spacer",
                label: "Spacer",
                category: "Content",
                content: `<mj-spacer height="20px"></mj-spacer>`,
              },
              {
                id: "social",
                label: "Social Links",
                category: "Content",
                content: `<mj-social font-size="14px" icon-size="24px" mode="horizontal" padding="20px"><mj-social-element name="twitter" href="https://twitter.com"></mj-social-element><mj-social-element name="facebook" href="https://facebook.com"></mj-social-element><mj-social-element name="linkedin" href="https://linkedin.com"></mj-social-element></mj-social>`,
              },
              {
                id: "hero",
                label: "Hero",
                category: "Content",
                content: `<mj-hero mode="fluid-height" background-color="#faf9f6" padding="40px"><mj-text align="center" font-size="28px" font-weight="bold" font-family="Helvetica, Arial, sans-serif" color="#1a1a1a" padding="0 20px 20px">Hero Title</mj-text><mj-text align="center" font-size="16px" font-family="Helvetica, Arial, sans-serif" color="#666" padding="0 20px">Hero description text goes here.</mj-text><mj-button align="center" background-color="#1a1a1a" color="#ffffff" font-family="Helvetica, Arial, sans-serif" font-size="16px" padding="16px 32px" border-radius="6px">Get Started</mj-button></mj-hero>`,
              },
              {
                id: "html",
                label: "Custom HTML",
                category: "Advanced",
                content: `<mj-raw><!-- Custom HTML --></mj-raw>`,
              },
            ],
          },
          styleManager: {
            sectors: [
              {
                name: "General",
                open: true,
                buildProps: [
                  "float",
                  "display",
                  "position",
                  "top",
                  "right",
                  "left",
                  "bottom",
                ],
                properties: [
                  {
                    id: "float",
                    name: "Float",
                    property: "float",
                    type: "select",
                    defaults: "none",
                    list: [
                      { id: "none", value: "none", name: "None" },
                      { id: "left", value: "left", name: "Left" },
                      { id: "right", value: "right", name: "Right" },
                    ],
                  },
                  {
                    id: "display",
                    name: "Display",
                    property: "display",
                    type: "select",
                    defaults: "block",
                    list: [
                      { id: "block", value: "block", name: "Block" },
                      { id: "inline-block", value: "inline-block", name: "Inline Block" },
                      { id: "flex", value: "flex", name: "Flex" },
                      { id: "none", value: "none", name: "None" },
                    ],
                  },
                ],
              },
              {
                name: "Typography",
                open: true,
                buildProps: [
                  "font-family",
                  "font-size",
                  "font-weight",
                  "letter-spacing",
                  "color",
                  "line-height",
                  "text-align",
                  "text-decoration",
                  "text-transform",
                ],
                properties: [
                  {
                    id: "font-family",
                    name: "Font Family",
                    property: "font-family",
                    type: "select",
                    defaults: "Helvetica, Arial, sans-serif",
                    list: [
                      { id: "helvetica", value: "Helvetica, Arial, sans-serif", name: "Helvetica" },
                      { id: "arial", value: "Arial, Helvetica, sans-serif", name: "Arial" },
                      { id: "verdana", value: "Verdana, Geneva, sans-serif", name: "Verdana" },
                      { id: "georgia", value: "Georgia, 'Times New Roman', serif", name: "Georgia" },
                    ],
                  },
                  {
                    id: "font-size",
                    name: "Font Size",
                    property: "font-size",
                    type: "select",
                    defaults: "16px",
                    list: [
                      { id: "12px", value: "12px", name: "12px" },
                      { id: "14px", value: "14px", name: "14px" },
                      { id: "16px", value: "16px", name: "16px" },
                      { id: "18px", value: "18px", name: "18px" },
                      { id: "20px", value: "20px", name: "20px" },
                      { id: "24px", value: "24px", name: "24px" },
                      { id: "28px", value: "28px", name: "28px" },
                      { id: "32px", value: "32px", name: "32px" },
                    ],
                  },
                  {
                    id: "font-weight",
                    name: "Font Weight",
                    property: "font-weight",
                    type: "select",
                    defaults: "400",
                    list: [
                      { id: "400", value: "400", name: "Normal" },
                      { id: "500", value: "500", name: "Medium" },
                      { id: "600", value: "600", name: "Semi Bold" },
                      { id: "700", value: "700", name: "Bold" },
                    ],
                  },
                  {
                    id: "color",
                    name: "Color",
                    property: "color",
                    type: "color",
                    defaults: "#1a1a1a",
                  },
                  {
                    id: "line-height",
                    name: "Line Height",
                    property: "line-height",
                    type: "select",
                    defaults: "26px",
                    list: [
                      { id: "20px", value: "20px", name: "20px" },
                      { id: "22px", value: "22px", name: "22px" },
                      { id: "24px", value: "24px", name: "24px" },
                      { id: "26px", value: "26px", name: "26px" },
                      { id: "28px", value: "28px", name: "28px" },
                      { id: "32px", value: "32px", name: "32px" },
                    ],
                  },
                  {
                    id: "text-align",
                    name: "Text Align",
                    property: "text-align",
                    type: "select",
                    defaults: "left",
                    list: [
                      { id: "left", value: "left", name: "Left" },
                      { id: "center", value: "center", name: "Center" },
                      { id: "right", value: "right", name: "Right" },
                    ],
                  },
                ],
              },
              {
                name: "Dimension",
                open: false,
                buildProps: ["width", "height", "max-width", "min-height", "margin", "padding"],
                properties: [
                  {
                    id: "width",
                    name: "Width",
                    property: "width",
                    type: "select",
                    defaults: "auto",
                    list: [
                      { id: "auto", value: "auto", name: "Auto" },
                      { id: "100%", value: "100%", name: "100%" },
                      { id: "50%", value: "50%", name: "50%" },
                      { id: "300px", value: "300px", name: "300px" },
                      { id: "400px", value: "400px", name: "400px" },
                      { id: "560px", value: "560px", name: "560px" },
                    ],
                  },
                  {
                    id: "padding",
                    name: "Padding",
                    property: "padding",
                    type: "composite",
                    properties: [
                      { id: "padding-top", name: "Top", property: "padding-top", type: "integer", units: ["px"], default: "0" },
                      { id: "padding-right", name: "Right", property: "padding-right", type: "integer", units: ["px"], default: "0" },
                      { id: "padding-bottom", name: "Bottom", property: "padding-bottom", type: "integer", units: ["px"], default: "0" },
                      { id: "padding-left", name: "Left", property: "padding-left", type: "integer", units: ["px"], default: "0" },
                    ],
                  },
                  {
                    id: "margin",
                    name: "Margin",
                    property: "margin",
                    type: "composite",
                    properties: [
                      { id: "margin-top", name: "Top", property: "margin-top", type: "integer", units: ["px"], default: "0" },
                      { id: "margin-right", name: "Right", property: "margin-right", type: "integer", units: ["px"], default: "0" },
                      { id: "margin-bottom", name: "Bottom", property: "margin-bottom", type: "integer", units: ["px"], default: "0" },
                      { id: "margin-left", name: "Left", property: "margin-left", type: "integer", units: ["px"], default: "0" },
                    ],
                  },
                ],
              },
              {
                name: "Background",
                open: false,
                buildProps: ["background-color", "background-image", "background-repeat", "background-position", "background-size"],
                properties: [
                  {
                    id: "background-color",
                    name: "Background Color",
                    property: "background-color",
                    type: "color",
                    defaults: "transparent",
                  },
                ],
              },
              {
                name: "Border",
                open: false,
                buildProps: ["border", "border-radius", "box-shadow"],
                properties: [
                  {
                    id: "border",
                    name: "Border",
                    property: "border",
                    type: "composite",
                    properties: [
                      { id: "border-width", name: "Width", property: "border-width", type: "integer", units: ["px"], default: "1" },
                      { id: "border-style", name: "Style", property: "border-style", type: "select", defaults: "solid", list: [{ id: "solid", value: "solid", name: "Solid" }, { id: "dashed", value: "dashed", name: "Dashed" }, { id: "dotted", value: "dotted", name: "Dotted" }] },
                      { id: "border-color", name: "Color", property: "border-color", type: "color", defaults: "#ececec" },
                    ],
                  },
                  {
                    id: "border-radius",
                    name: "Border Radius",
                    property: "border-radius",
                    type: "select",
                    defaults: "0",
                    list: [
                      { id: "0", value: "0", name: "None" },
                      { id: "4px", value: "4px", name: "4px" },
                      { id: "8px", value: "8px", name: "8px" },
                      { id: "12px", value: "12px", name: "12px" },
                      { id: "16px", value: "16px", name: "16px" },
                    ],
                  },
                ],
              },
            ],
          },
          traitManager: {
            appendTo: "#gjs-traits",
          },
          selectorManager: {
            appendTo: "#gjs-selector",
          },
          panels: {
            defaults: [
              {
                id: "panel-devices",
                el: ".panel__devices",
                buttons: [
                  {
                    id: "device-desktop",
                    command: "set-device-desktop",
                    active: true,
                    togglable: false,
                  },
                  {
                    id: "device-mobile",
                    command: "set-device-mobile",
                    togglable: false,
                  },
                ],
              },
              {
                id: "panel-switcher",
                el: ".panel__switcher",
                buttons: [
                  {
                    id: "show-blocks",
                    command: "show-blocks",
                    active: true,
                    togglable: false,
                  },
                  {
                    id: "show-style",
                    command: "show-style",
                    togglable: false,
                  },
                  {
                    id: "show-traits",
                    command: "show-traits",
                    togglable: false,
                  },
                ],
              },
            ],
          },
        });

        // Add panel elements to DOM
        const panelDevices = document.createElement("div");
        panelDevices.className = "panel__devices";
        document.body.appendChild(panelDevices);

        const panelSwitcher = document.createElement("div");
        panelSwitcher.className = "panel__switcher";
        document.body.appendChild(panelSwitcher);

        const blocksContainer = document.createElement("div");
        blocksContainer.id = "gjs-blocks";
        document.body.appendChild(blocksContainer);

        const traitsContainer = document.createElement("div");
        traitsContainer.id = "gjs-traits";
        document.body.appendChild(traitsContainer);

        const selectorContainer = document.createElement("div");
        selectorContainer.id = "gjs-selector";
        document.body.appendChild(selectorContainer);

        editorRef.current = editor;

        // Load template if templateId provided
        if (templateId) {
          await loadTemplate(editor, templateId);
        }

        // Set up export on change
        editor.on("change", () => {
          exportAndNotify(editor);
        });

        // Initial export
        exportAndNotify(editor);

        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize GrapesJS:", err);
        setError(err instanceof Error ? err.message : "Failed to load editor");
        setLoading(false);
      }
    }

    async function loadTemplate(editor: any, id: string) {
      try {
        const res = await fetch(`/api/templates/${id}`);
        if (!res.ok) throw new Error("Failed to load template");
        const data = await res.json();
        if (data.project) {
          editor.loadProject(JSON.parse(data.project));
        }
      } catch (err) {
        console.error("Failed to load template:", err);
      }
    }

    function exportAndNotify(editor: any) {
      const mjml = editor.getMJML();
      const html = editor.getHtml();
      onHtml(html);
    }

    async function handleSave() {
      if (!editorRef.current || !onSave) return;
      const editor = editorRef.current;
      const project = JSON.stringify(editor.getProjectData());
      const mjml = editor.getMJML();
      const html = editor.getHtml();
      await onSave(project, mjml, html);
    }

    // Expose save globally for toolbar
    (window as any).__emailBuilderSave = handleSave;

    initEditor();

    return () => {
      mounted = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      // Clean up panel elements
      ["gjs-blocks", "gjs-traits", "gjs-selector", "panel__devices", "panel__switcher"].forEach((id) => {
        const el = document.getElementById(id) || document.querySelector(`.${id}`);
        if (el) el.remove();
      });
      delete (window as any).__emailBuilderSave;
    };
  }, [templateId, onHtml, onSave]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg border">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading email builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-destructive text-center p-4">{error}</p>
      </div>
    );
  }

  return <div ref={containerRef} id="gjs-editor" className="w-full" />;
}