const domains = [
  "com.au",
  "com.br",
  "ca",
  "cn",
  "eg",
  "fr",
  "de",
  "in",
  "it",
  "co.jp",
  "com.mx",
  "nl",
  "pl",
  "sa",
  "sg",
  "es",
  "se",
  "com.tr",
  "ae",
  "co.uk",
];

document.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const inputUrl = document.querySelector("#url-input").value;
  let urlObject;

  try {
    urlObject = new URL(inputUrl);
  } catch (error) {
    alert(error.message);
    return;
  }

  if (
    !urlObject.hostname.startsWith("amazon.") &&
    !urlObject.hostname.startsWith("www.amazon.")
  ) {
    alert("Invalid URL.");
    return;
  }

  const usUrl = domains.reduce(
    (url, domain) => url.replace(`amazon.${domain}`, "amazon.com"),
    inputUrl.replace("http:", "https:")
  );
  const urls = [
    usUrl,
    ...domains.map((domain) => usUrl.replace("amazon.com", `amazon.${domain}`)),
  ];

  const imageUrls = new Set(
    (
      await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
          );

          if (!response.ok) {
            console.error(
              `Failed to fetch ${url} : ${response.status} (${response.statusText})`
            );
            return [];
          }

          const { contents: page } = await response.json();
          const imageUrls = [];

          const [, colorImagesStr] = page.match(/'colorImages': (.+)/) ?? [];

          if (colorImagesStr) {
            let colorImages;
            eval(`colorImages = ${colorImagesStr.slice(0, -1)}`);

            for (const { hiRes, large } of colorImages.initial) {
              let imageUrl = hiRes ?? large;
              const extension = imageUrl.substring(imageUrl.lastIndexOf("."));
              imageUrl = imageUrl.substring(0, imageUrl.lastIndexOf("."));
              imageUrl = imageUrl.substring(0, imageUrl.lastIndexOf("."));
              imageUrl = `${imageUrl}${extension}`;

              imageUrls.push(imageUrl);
            }
          }

          const [, imageGalleryDataStr] =
            page.match(/'imageGalleryData' : (.+)/) ?? [];

          if (imageGalleryDataStr) {
            let imageGalleryData;
            eval(`imageGalleryData = ${imageGalleryDataStr.slice(0, -1)}`);

            for (const { mainUrl } of imageGalleryData) {
              imageUrls.push(mainUrl);
            }
          }

          return imageUrls;
        })
      )
    ).flat()
  );

  const gallery = document.querySelector(".gallery");

  gallery.innerHTML = "";

  for (const imageUrl of imageUrls) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = imageUrl;
    const figcaption = document.createElement("figcaption");
    // figcaption.innerHTML = `<a href="${imageUrl}" target="_blank" rel="noopener noreferrer">${imageUrl}</a>`;

    img.onload = function () {
      figcaption.textContent = `${this.naturalWidth}x${this.naturalHeight}`;
    };
    img.onclick = () => {
      window.open(imageUrl);
    };

    figure.append(img, figcaption);
    gallery.append(figure);
  }
});
