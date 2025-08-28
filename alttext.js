document.addEventListener("DOMContentLoaded", function () {
  let images = document.querySelectorAll("img");

  images.forEach(img => {
    let src = img.getAttribute("src");
    if (!src) return;

    let fileName = src.substring(src.lastIndexOf("/") + 1, src.lastIndexOf("."));

    if (!fileName || /^(img|image|photo|pic|logo)[-_]?\d*$/i.test(fileName)) return;

    let cleanName = fileName
      .replace(/[_]+/g, "-")
      .replace(/--+/g, "-")
      .replace(/\d+/g, "")
      .trim();

    let altText = cleanName
      .split("-")
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (!img.hasAttribute("alt") || img.getAttribute("alt").trim() === "") {
      img.setAttribute("alt", altText);
    }

    if (!img.hasAttribute("title") || img.getAttribute("title").trim() === "") {
      img.setAttribute("title", altText);
    }

    console.log(`Updated ALT/TITLE for: ${src} → "${altText}"`);
  });
});
