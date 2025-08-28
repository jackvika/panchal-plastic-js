(function() {
  function generateAltText(img) {
    let src = img.getAttribute("src");
    if (!src) return;

    // Extract filename
    let fileName = src.substring(src.lastIndexOf("/") + 1, src.lastIndexOf("."));
    if (!fileName || /^(img|image|photo|pic|logo)[-_]?\d*$/i.test(fileName)) return;

    // Extract top-level folder for category context
    let parts = src.split("/");
    let folder = parts.length > 2 ? parts[parts.length - 3] : "";
    folder = folder.replace(/[-_]+/g, " ").trim();

    // Clean filename
    let cleanName = fileName.replace(/[_]+/g, " ").replace(/--+/g, " ").trim();

    // Capitalize words including single letters
    let altText = cleanName
      .split(/[\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Add folder/category if exists
    if (folder) {
      folder = folder.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      altText = folder + " - " + altText;
    }

    // Limit to 120 chars
    altText = altText.substring(0, 120);

    if (altText.length > 0) {
      img.setAttribute("alt", altText);
      img.setAttribute("title", altText);
    }
  }

  function processImages() {
    document.querySelectorAll("img").forEach(img => generateAltText(img));
  }

  // Observe dynamically added images
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === "IMG") generateAltText(node);
        else if (node.querySelectorAll) node.querySelectorAll("img").forEach(img => generateAltText(img));
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", processImages);
})();

