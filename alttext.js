(function() {
  // Function to generate SEO-friendly alt text
  function generateAltText(img) {
    let src = img.getAttribute("src");
    if (!src) return;

    // Extract filename
    let fileName = src.substring(src.lastIndexOf("/") + 1, src.lastIndexOf("."));

    // Extract folder name for context
    let folder = src.substring(src.lastIndexOf("/", src.lastIndexOf("/") - 1) + 1, src.lastIndexOf("/"));
    folder = folder.replace(/[-_]+/g, " ").trim();

    // Skip generic or numeric filenames
    if (!fileName || /^(img|image|photo|pic|logo)[-_]?\d*$/i.test(fileName)) return;

    // Clean filename
    let cleanName = fileName
      .replace(/[_]+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^[\d-_]+|[\d-_]+$/g, "")
      .trim();

    // Generate readable words
    let altText = cleanName
      .split("-")
      .filter(word => word.length > 1)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Prepend folder/category if exists
    if (folder && folder.length > 1) {
      folder = folder
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      altText = folder + " - " + altText;
    }

    // Limit to 120 characters
    altText = altText.substring(0, 120);

    // Only set if meaningful
    if (altText.length > 3) {
      img.setAttribute("alt", altText);
      img.setAttribute("title", altText); // Safe for SEO/UX
    }
  }

  // Process all existing images
  function processImages() {
    document.querySelectorAll("img").forEach(img => generateAltText(img));
  }

  // Observe dynamically added images
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === "IMG") {
          generateAltText(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll("img").forEach(img => generateAltText(img));
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Run once on DOM load
  document.addEventListener("DOMContentLoaded", processImages);
})();

