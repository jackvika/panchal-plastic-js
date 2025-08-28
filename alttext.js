
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // ==== Config ====
  var DEBUG = false; // set true for console logs (keep false in production)
  var MAX_ALT_LENGTH = 120;
  var OBSERVER_DEBOUNCE_MS = 120; // group DOM insertions
  // =================

  // helpers
  var log = function () { if (DEBUG && console && console.log) console.log.apply(console, arguments); };
  var warn = function () { if (DEBUG && console && console.warn) console.warn.apply(console, arguments); };

  // run task in idle time (preferred) or fallback to setTimeout
  function runIdle(fn) {
    if (typeof window.requestIdleCallback === 'function') {
      try {
        requestIdleCallback(function (deadline) {
          try { fn(); } catch (e) { warn('alttext idle error', e); }
        }, { timeout: 1000 });
        return;
      } catch (e) { /* fallback below */ }
    }
    setTimeout(function () {
      try { fn(); } catch (e) { warn('alttext timeout error', e); }
    }, 50);
  }

  // Pure function to create alt text from URL
  function buildAltFromSrc(src) {
    if (!src || typeof src !== 'string') return '';
    var clean = src.split('?')[0].split('#')[0];
    var file = clean.substring(clean.lastIndexOf('/') + 1, clean.lastIndexOf('.'));
    if (!file) return '';

    // skip truly generic files like img001, photo1, logo2
    if (/^(img|image|photo|pic|logo)[-_]?\d*$/i.test(file)) return '';

    // folder (third from last) as context if available
    var parts = clean.split('/');
    var folder = parts.length > 2 ? parts[parts.length - 3] : '';
    folder = (folder || '').replace(/[-_]+/g, ' ').trim();

    // normalize filename -> replace underscores and double dashes with space
    var cleaned = file.replace(/[_]+/g, ' ').replace(/--+/g, ' ').trim();
    // split on whitespace or hyphen, keep single-letter tokens (D, A) as meaningful
    var tokens = cleaned.split(/[\s-]+/).filter(Boolean);
    if (tokens.length === 0) return '';

    var words = tokens.map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
    var alt = words.join(' ');

    if (folder && !/^\d+$/.test(folder)) {
      var folderWords = folder.split(/\s+/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
      alt = folderWords.join(' ') + (alt ? ' - ' + alt : '');
    }

    if (alt.length > MAX_ALT_LENGTH) alt = alt.substring(0, MAX_ALT_LENGTH).trim();
    return alt;
  }

  // safety: processed marker so we don't reprocess repeatedly
  var processed = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;

  function isProcessed(img) {
    if (!processed) return img.__alttext_processed === true;
    return processed.has(img);
  }
  function markProcessed(img) {
    if (!processed) {
      try { img.__alttext_processed = true; } catch (e) { /* ignore */ }
      return;
    }
    processed.add(img);
  }

  // Apply alt/title to a single image in the safest possible way
  function applyToImage(img) {
    try {
      if (!img || img.nodeType !== 1 || img.tagName !== 'IMG') return false;
      if (isProcessed(img)) return false;

      // Use actual src first then fallback to data-src (common lazy patterns)
      var src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      var altText = buildAltFromSrc(src);
      if (!altText || altText.length < 2) {
        markProcessed(img); // avoid retrying useless images
        return false;
      }

      // only set if missing/empty — do not overwrite existing alt/title
      var hasAlt = img.hasAttribute('alt') && String(img.getAttribute('alt') || '').trim().length > 0;
      var hasTitle = img.hasAttribute('title') && String(img.getAttribute('title') || '').trim().length > 0;

      if (!hasAlt) {
        try { img.setAttribute('alt', altText); } catch (e) { warn('alttext setAttribute alt failed', e); }
      }
      if (!hasTitle) {
        try { img.setAttribute('title', altText); } catch (e) { warn('alttext setAttribute title failed', e); }
      }

      markProcessed(img);
      log('alttext applied:', src, '→', altText);
      return true;
    } catch (e) {
      warn('alttext applyToImage error', e);
      return false;
    }
  }

  // Process all images in the document (batched)
  function processAllImages() {
    runIdle(function () {
      try {
        var imgs = document.getElementsByTagName('img');
        if (!imgs || imgs.length === 0) return;
        for (var i = 0; i < imgs.length; i++) {
          applyToImage(imgs[i]);
        }
      } catch (e) {
        warn('alttext processAllImages error', e);
      }
    });
  }

  // Process a Node (element) for any images inside or being the image itself
  function processNodeForImages(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === 'IMG') {
      applyToImage(node);
      return;
    }
    // safe query: some exotic nodes may not support querySelectorAll
    if (typeof node.querySelectorAll === 'function') {
      var imgs = [];
      try { imgs = node.querySelectorAll('img'); } catch (e) { /* ignore */ }
      for (var i = 0; i < imgs.length; i++) applyToImage(imgs[i]);
    }
  }

  // Debounced MutationObserver handler
  var pendingNodes = [];
  var debounceTimer = null;
  function scheduleProcessAdded(nodesArr) {
    // push nodes into pendingNodes
    for (var i = 0; i < nodesArr.length; i++) pendingNodes.push(nodesArr[i]);

    if (debounceTimer) return;
    debounceTimer = setTimeout(function () {
      // copy & clear
      var toProcess = pendingNodes.slice(0);
      pendingNodes.length = 0;
      debounceTimer = null;

      // run in idle time to minimize interference
      runIdle(function () {
        try {
          for (var j = 0; j < toProcess.length; j++) processNodeForImages(toProcess[j]);
        } catch (e) { warn('alttext scheduled process error', e); }
      });
    }, OBSERVER_DEBOUNCE_MS);
  }

  // Start observer safely
  function startObserverSafely() {
    if (typeof MutationObserver === 'undefined') return;
    var target = document.body || document.documentElement;
    if (!target || target.nodeType !== 1) {
      // retry shortly if body not available yet
      return setTimeout(startObserverSafely, 50);
    }

    try {
      var observer = new MutationObserver(function (mutations) {
        var nodes = [];
        for (var m = 0; m < mutations.length; m++) {
          var added = mutations[m].addedNodes;
          if (!added || added.length === 0) continue;
          for (var a = 0; a < added.length; a++) {
            var node = added[a];
            if (!node) continue;
            // Only push element nodes (type 1)
            if (node.nodeType === 1) nodes.push(node);
          }
        }
        if (nodes.length) scheduleProcessAdded(nodes);
      });
      observer.observe(target, { childList: true, subtree: true });
    } catch (e) {
      warn('alttext observer start failed', e);
    }
  }

  // Init on DOM ready (safe)
  function init() {
    try {
      processAllImages();
      startObserverSafely();
    } catch (e) {
      warn('alttext init error', e);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // slightly async to mimic DOMContentLoaded timing
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', function onReady() {
      try { init(); } catch (e) { warn('alttext domready error', e); }
    }, { once: true });
  }

  // Extra: if script loaded very late, ensure we at least attempt a pass
  setTimeout(function () {
    try { processAllImages(); } catch (e) { /* ignore */ }
  }, 1500);
})();

