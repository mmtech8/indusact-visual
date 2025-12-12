const photoInput = document.getElementById("photoInput");
const photoToCrop = document.getElementById("photoToCrop");
const generateBtn = document.getElementById("generateBtn");
const previewImg = document.getElementById("previewImage");

const logo1Select = document.getElementById("logo1Alumni");
const logo2Select = document.getElementById("logo2Alumni");
const customLogo1 = document.getElementById("customLogo1");
const customLogo2 = document.getElementById("customLogo2");

let cropper;
previewImg.style.display = "none";

/* PHOTO CROP */

photoInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        photoToCrop.src = reader.result;
        if (cropper) cropper.destroy();
        cropper = new Cropper(photoToCrop, {
            aspectRatio: 1,
            viewMode: 1
        });
    };
    reader.readAsDataURL(file);
});

/* LOGO SELECT */

logo1Select.addEventListener("change", () => {
    customLogo1.hidden = logo1Select.value !== "custom";
});

logo2Select.addEventListener("change", () => {
    customLogo2.hidden = logo2Select.value !== "custom";
});

/* GENERATE */

generateBtn.addEventListener("click", async () => {
    if (!cropper) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 800;
    canvas.height = 800;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* PHOTO */
    const photoCanvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
    ctx.save();
    ctx.beginPath();
    ctx.arc(400, 240, 150, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photoCanvas, 250, 90);
    ctx.restore();

    /* LOGOS */
    const logos = [];

    if (logo1Select.value && logo1Select.value !== "custom") {
        logos.push(logo1Select.value);
    }
    if (logo1Select.value === "custom" && customLogo1.files[0]) {
        logos.push(URL.createObjectURL(customLogo1.files[0]));
    }
    if (logo2Select.value === "custom" && customLogo2.files[0]) {
        logos.push(URL.createObjectURL(customLogo2.files[0]));
    }

    const logoY = 500;
    const maxLogoWidth = 140;
    const spacing = 40;

    const totalWidth =
        logos.length * maxLogoWidth +
        (logos.length - 1) * spacing;

    let startX = (canvas.width - totalWidth) / 2;

    for (const src of logos) {
        const img = await loadImage(src);
        const ratio = img.width / img.height;
        const w = maxLogoWidth;
        const h = maxLogoWidth / ratio;
        ctx.drawImage(img, startX, logoY, w, h);
        startX += maxLogoWidth + spacing;
    }

    const result = canvas.toDataURL("image/png");
    previewImg.src = result;
    previewImg.style.display = "block";
});

/* UTILS */

function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
}
