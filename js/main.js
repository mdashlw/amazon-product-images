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

function getAllImageUrls(url) {
  url = new URL(url);
  const pathnameParts = url.pathname.split("/");
  const lastPathnamePart = pathnameParts.pop();
  const basePathname = pathnameParts.join("/");

  return lastPathnamePart
    .split("%7C")
    .filter((fragment) => fragment.includes("."))
    .map((fragment, _, fragments) => {
      if (fragment.includes("%2C")) {
        return;
      }

      return fragment
        .replace("._CLa", () => {
          const lastFragment = fragments.at(-1);

          return lastFragment.substring(lastFragment.lastIndexOf("."));
        })
        .split(".")
        .filter((part) => !part.startsWith("_"))
        .join(".");
    })
    .filter(Boolean)
    .map((fragment) => new URL(`${basePathname}/${fragment}`, url).toString());
}

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

  urlObject.search = "";

  const usUrl = domains.reduce(
    (url, domain) => url.replace(`amazon.${domain}`, "amazon.com"),
    urlObject.toString().replace("http:", "https:")
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
            `https://corsproxy.io/?${encodeURIComponent(url)}`
          );

          if (!response.ok) {
            console.error(
              `Failed to fetch ${url} : ${response.status} (${response.statusText})`
            );
            return [];
          }

          const page = await response.text();
          const imageUrls = [];

          let [, colorImages] = page.match(/'colorImages': (.+),/) ?? [];

          if (colorImages) {
            colorImages = eval(`(${colorImages})`);

            for (const { hiRes, large } of colorImages.initial) {
              const imageUrl = hiRes ?? large;

              imageUrls.push(...getAllImageUrls(imageUrl));
            }
          }

          let [, imageGalleryData] =
            page.match(/'imageGalleryData' : (.+),/) ?? [];

          if (imageGalleryData) {
            imageGalleryData = eval(`(${imageGalleryData})`);

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
