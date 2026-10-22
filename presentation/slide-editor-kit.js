/**
 * SLIDE EDITOR KIT — présentations HTML éditables + export PDF propre
 *
 * INTÉGRATION (nouvelle présentation) :
 * 1. Copier ce fichier à côté de votre .html
 * 2. Dans <head>, ajouter : <script src="slide-editor-kit.js"></script>
 * 3. Sur <body>, ajouter la classe : class="has-editor"
 * 4. Chaque slide doit être un bloc avec la classe .slide (ex. <section class="slide">)
 *
 * Zones éditables par défaut : titres (.slide-header h2, .slide-title h1, etc.),
 * .slide-body, pieds .slide-footer span — personnalisables via SlideEditorKit.init({ editableSelectors: [...] })
 */
(function (window, document) {
  "use strict";

  if (window.SlideEditorKit && window.SlideEditorKit.__loaded) {
    return;
  }

  var SLIDE_EDITOR_CSS =
    "body.has-editor{padding-bottom:22mm}" +
    ".editor-toolbar{position:fixed;left:0;right:0;bottom:0;z-index:10000;background:#0f172a;color:#e2e8f0;border-top:3px solid #0d9488;box-shadow:0 -4px 24px rgba(15,23,42,.35);font-size:13px;font-family:system-ui,sans-serif}" +
    ".editor-toolbar-inner{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 16px 6px;max-width:297mm;margin:0 auto}" +
    ".editor-label{font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5eead4;margin-right:4px}" +
    ".editor-toolbar button,.editor-toolbar select,.editor-toolbar input[type=color]{font:inherit;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#f1f5f9;padding:6px 10px;cursor:pointer}" +
    ".editor-toolbar button:hover{background:#334155}" +
    ".editor-toolbar button.danger{border-color:#7f1d1d;background:#450a0a}" +
    ".editor-toolbar button.danger:hover{background:#7f1d1d}" +
    ".editor-toolbar button.primary{border-color:#0f766e;background:#0f766e;font-weight:600}" +
    ".editor-toolbar button.primary:hover{background:#0d9488}" +
    ".editor-toolbar select{min-width:9rem}" +
    ".editor-toolbar input[type=color]{width:2.5rem;height:2rem;padding:2px;vertical-align:middle}" +
    ".editor-sep{width:1px;height:1.75rem;background:#475569;margin:0 2px}" +
    ".editor-hint{font-size:11px;color:#94a3b8;padding:0 16px 10px;max-width:297mm;margin:0 auto;line-height:1.35}" +
    ".visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}" +
    "@media screen{body.has-editor{padding-bottom:calc(22mm + 10mm)}" +
    ".slide.is-active{outline:3px solid #f59e0b;outline-offset:6px}" +
    ".is-editable{border-radius:2px;transition:box-shadow .15s ease}" +
    ".is-editable:focus{box-shadow:inset 0 0 0 2px rgba(13,148,136,.45);outline:none}}" +
    "@media print{.editor-toolbar,.slide-editor-print-fix{display:none!important}" +
    ".slide.is-active{outline:none!important}" +
    ".is-editable:focus{box-shadow:none!important}" +
    "body.has-editor{padding-bottom:0!important}" +
    "body > .slide:last-of-type,body > section.slide:last-of-type{page-break-after:auto!important;break-after:auto!important;height:auto;min-height:210mm}" +
    ".slide.slide--removed{display:none!important;height:0!important;margin:0!important;padding:0!important;page-break-after:avoid!important;break-after:avoid!important}}";

  var DEFAULT_EDITABLE =
    ".slide-title h1,.slide-title .subtitle,.slide-title .tagline,.slide-title .eyebrow," +
    ".slide-header h2,.slide-body,.slide-footer span";

  var activeSlide = null;
  var config = { editableSelectors: DEFAULT_EDITABLE.split(","), downloadBasename: "presentation" };

  function injectStyles() {
    if (document.getElementById("slide-editor-kit-styles")) {
      return;
    }
    var style = document.createElement("style");
    style.id = "slide-editor-kit-styles";
    style.textContent = SLIDE_EDITOR_CSS;
    document.head.appendChild(style);
  }

  function getSlides() {
    return Array.prototype.slice.call(document.querySelectorAll("body > .slide, body > section.slide"));
  }

  function syncPrintPageBreaks() {
    var slides = getSlides().filter(function (s) {
      return !s.classList.contains("slide--removed");
    });
    slides.forEach(function (slide, index) {
      slide.style.pageBreakAfter = index < slides.length - 1 ? "always" : "auto";
      slide.style.breakAfter = index < slides.length - 1 ? "page" : "auto";
    });
  }

  function injectToolbar() {
    if (document.getElementById("editorToolbar")) {
      return;
    }
    var bar = document.createElement("div");
    bar.className = "editor-toolbar";
    bar.id = "editorToolbar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Slide editor");
    bar.innerHTML =
      '<div class="editor-toolbar-inner">' +
      '<span class="editor-label">Éditeur</span>' +
      '<button type="button" data-cmd="bold" title="Gras (Ctrl+B)"><strong>G</strong></button>' +
      '<button type="button" data-cmd="italic" title="Italique (Ctrl+I)"><em>I</em></button>' +
      '<button type="button" data-cmd="underline" title="Souligné (Ctrl+U)"><u>S</u></button>' +
      '<span class="editor-sep" aria-hidden="true"></span>' +
      '<label><span class="visually-hidden">Police</span>' +
      '<select id="fontFamily" title="Police">' +
      '<option value="">Police…</option>' +
      '<option value="Segoe UI, system-ui, sans-serif">Segoe UI</option>' +
      '<option value="Georgia, serif">Georgia</option>' +
      '<option value="\'Times New Roman\', Times, serif">Times New Roman</option>' +
      '<option value="Arial, Helvetica, sans-serif">Arial</option>' +
      '<option value="\'Courier New\', Courier, monospace">Courier New</option>' +
      '<option value="Inter, system-ui, sans-serif">Inter</option>' +
      "</select></label>" +
      '<label><span class="visually-hidden">Taille</span>' +
      '<select id="fontSize" title="Taille du texte">' +
      '<option value="">Taille…</option>' +
      '<option value="8pt">8 pt</option><option value="9pt">9 pt</option><option value="10pt">10 pt</option>' +
      '<option value="11pt">11 pt</option><option value="12pt">12 pt</option><option value="14pt">14 pt</option>' +
      '<option value="18pt">18 pt</option><option value="22pt">22 pt</option>' +
      "</select></label>" +
      '<input type="color" id="fontColor" value="#0f172a" title="Couleur du texte" />' +
      '<span class="editor-sep" aria-hidden="true"></span>' +
      '<button type="button" id="deleteSlide" class="danger">Supprimer la slide</button>' +
      '<button type="button" id="downloadHtml" class="primary">Télécharger le HTML</button>' +
      "</div>" +
      '<p class="editor-hint">Cliquez sur une slide (cadre ambre) pour la sélectionner. ' +
      "Sélectionnez du texte puis appliquez un style. <strong>Télécharger le HTML</strong> enregistre vos modifications. " +
      "À l’impression / PDF, la barre est masquée ; les slides supprimées ne produisent plus de page blanche.</p>";
    document.body.appendChild(bar);
  }

  function initEditableRegions() {
    config.editableSelectors.forEach(function (sel) {
      sel = sel.trim();
      if (!sel) {
        return;
      }
      document.querySelectorAll(sel).forEach(function (el) {
        el.setAttribute("contenteditable", "true");
        el.classList.add("is-editable");
        el.setAttribute("spellcheck", "true");
      });
    });
  }

  function setActiveSlide(slide) {
    getSlides().forEach(function (s) {
      s.classList.remove("is-active");
    });
    if (slide) {
      slide.classList.add("is-active");
      activeSlide = slide;
    }
  }

  function applyCommand(cmd, value) {
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, value || null);
  }

  function renumberSlides(root) {
    var scope = root || document;
    var slides = Array.prototype.slice.call(scope.querySelectorAll(".slide")).filter(function (s) {
      return !s.classList.contains("slide--removed");
    });
    slides.forEach(function (slide, index) {
      var footerSpans = slide.querySelectorAll(".slide-footer span");
      if (footerSpans.length >= 2) {
        var numSpan = footerSpans[footerSpans.length - 1];
        if (/slide/i.test(numSpan.textContent)) {
          numSpan.textContent = "Slide " + (index + 1);
        }
      }
    });
  }

  function bindToolbarEvents() {
    document.querySelectorAll("[data-cmd]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyCommand(btn.getAttribute("data-cmd"));
      });
    });

    document.getElementById("fontFamily").addEventListener("change", function (e) {
      var font = e.target.value;
      if (!font) {
        return;
      }
      applyCommand("fontName", font);
      e.target.selectedIndex = 0;
    });

    document.getElementById("fontSize").addEventListener("change", function (e) {
      var size = e.target.value;
      if (!size) {
        return;
      }
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        window.alert("Sélectionnez d’abord du texte pour changer la taille.");
        e.target.selectedIndex = 0;
        return;
      }
      var range = sel.getRangeAt(0);
      var span = document.createElement("span");
      span.style.fontSize = size;
      try {
        range.surroundContents(span);
      } catch (err) {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      sel.removeAllRanges();
      e.target.selectedIndex = 0;
    });

    document.getElementById("fontColor").addEventListener("input", function (e) {
      applyCommand("foreColor", e.target.value);
    });

    document.addEventListener("keydown", function (e) {
      if (!e.ctrlKey && !e.metaKey) {
        return;
      }
      var map = { b: "bold", i: "italic", u: "underline" };
      var cmd = map[e.key.toLowerCase()];
      if (!cmd) {
        return;
      }
      var t = e.target;
      if (t && (t.isContentEditable || t.closest("[contenteditable='true']"))) {
        e.preventDefault();
        applyCommand(cmd);
      }
    });

    document.getElementById("deleteSlide").addEventListener("click", function () {
      if (!activeSlide) {
        window.alert("Cliquez sur une slide pour la sélectionner.");
        return;
      }
      var slides = getSlides();
      if (slides.length <= 1) {
        window.alert("Impossible de supprimer la dernière slide.");
        return;
      }
      if (!window.confirm("Supprimer la slide sélectionnée ?")) {
        return;
      }
      var toRemove = activeSlide;
      var next =
        toRemove.nextElementSibling && toRemove.nextElementSibling.classList.contains("slide")
          ? toRemove.nextElementSibling
          : toRemove.previousElementSibling;
      toRemove.classList.add("slide--removed");
      toRemove.setAttribute("aria-hidden", "true");
      toRemove.parentNode.removeChild(toRemove);
      activeSlide = null;
      renumberSlides();
      syncPrintPageBreaks();
      setActiveSlide(next && next.classList.contains("slide") ? next : getSlides()[0] || null);
    });

    document.getElementById("downloadHtml").addEventListener("click", downloadHtml);
  }

  function bindSlideSelection() {
    getSlides().forEach(function (slide) {
      slide.addEventListener("mousedown", function () {
        setActiveSlide(slide);
      });
    });
    if (getSlides()[0]) {
      setActiveSlide(getSlides()[0]);
    }
  }

  function prepareDocumentForExport(root) {
    renumberSlides(root);
    var slides = Array.prototype.slice.call(root.querySelectorAll(".slide")).filter(function (s) {
      return !s.classList.contains("slide--removed");
    });
    slides.forEach(function (slide, index) {
      slide.classList.remove("is-active");
      slide.style.pageBreakAfter = index < slides.length - 1 ? "always" : "auto";
      slide.style.breakAfter = index < slides.length - 1 ? "page" : "auto";
    });
    root.querySelectorAll(".slide--removed").forEach(function (s) {
      s.remove();
    });
  }

  function downloadHtml() {
    syncPrintPageBreaks();
    var clone = document.documentElement.cloneNode(true);
    prepareDocumentForExport(clone);
    var html = "<!DOCTYPE html>\n" + clone.outerHTML;
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var stamp = new Date().toISOString().slice(0, 10);
    var a = document.createElement("a");
    a.href = url;
    a.download = config.downloadBasename + "-" + stamp + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function init(userConfig) {
    if (userConfig) {
      if (userConfig.editableSelectors) {
        config.editableSelectors = userConfig.editableSelectors;
      }
      if (userConfig.downloadBasename) {
        config.downloadBasename = userConfig.downloadBasename;
      }
    }
    document.body.classList.add("has-editor");
    injectStyles();
    injectToolbar();
    initEditableRegions();
    bindSlideSelection();
    bindToolbarEvents();
    syncPrintPageBreaks();
    window.addEventListener("beforeprint", function () {
      syncPrintPageBreaks();
      getSlides().forEach(function (s) {
        s.classList.remove("is-active");
      });
    });
  }

  window.SlideEditorKit = {
    __loaded: true,
    init: init,
    syncPrintPageBreaks: syncPrintPageBreaks,
    css: SLIDE_EDITOR_CSS,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init(window.__SLIDE_EDITOR_KIT_CONFIG__ || null);
    });
  } else {
    init(window.__SLIDE_EDITOR_KIT_CONFIG__ || null);
  }
})(window, document);
