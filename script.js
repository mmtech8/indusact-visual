/* =========================================================
   CONFIG GLOBALE
========================================================= */

// Webhook Make
const MAKE_WEBHOOK_URL = "https://hook.integromat.com/XXX";

// Canvas final HD
const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

// Aperçu
const previewImg = document.getElementById("previewImage");

// État
let hasPreview = false;

// Cropper instances
let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

// Sources finales
let photoSource = null;
let logo1Source = null;
let logo2Source = null;

/* =========================================================
   UTILITAIRE
========================================================= */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/* =========================================================
   BLOQUER CLIC DROIT SUR L’APERÇU UNIQUEMENT
========================================================= */
previewImg.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

/* =========================================================
   BOUTONS
========================================================= */
function updateButtons() {
    const email = document.getElementById("email").value.trim();
    const consent = document.getElementById("consent").checked;

    const previewBtn = document.getElementById("previewBtn");
    const sendBtn = document.getElementById("sendBtn");

    const canPreview =
        email !== "" &&
        consent &&
        cropPhoto !== null &&
        logosAreValid();

    previewBtn.disabled = !canPreview;
    sendBtn.disabled = !hasPreview;
}

/* =========================================================
   VALIDATION LOGOS
========================================================= */
function logosAreValid() {
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    if (nbLogos === "0") return true;
    if (nbLogos === "1") return logo1Source !== null;
    if (nbLogos === "2") return logo1Source !== null && logo2Source !== null;
    return false;
}

/* =========================================================
   PHOTO – CropperJS (carré + masque cercle UI)
========================================================= */
const photoUpload = document.getElementById("photoUpload");
const photoCropImage = document.getElementById("photoCropImage");

photoUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        if (cropPhoto) cropPhoto.destroy();

        photoCropImage.src = reader.result;

        cropPhoto = new Cropper(photoCropImage, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: "move",
            autoCropArea: 1,
            background: false,
            guides: false,
            ready() {
                photoCropImage.classList.add("circle-mask");
            }
        });

        photoSource = null;
        hasPreview = false;
        previewImg.style.display = "none";
        updateButtons();
    };
    reader.readAsDataURL(file);
});

function exportPhoto() {
    if (!cropPhoto) return null;

    const canvas = cropPhoto.getCroppedCanvas({
        width: 466,
        height: 466
    });

    photoSource = canvas.toDataURL("image/png");
    return photoSource;
}

/* =========================================================
   NOMBRE DE LOGOS
========================================================= */
document.querySelectorAll("input[name='nbLogos']").forEach((radio) => {
    radio.addEventListener("change", () => {
        const v = radio.value;
        document.getElementById("logo1Section").style.display = v >= 1 ? "block" : "none";
        document.getElementById("logo2Section").style.display = v === "2" ? "block" : "none";

        logo1Source = null;
        logo2Source = null;
        hasPreview = false;
        previewImg.style.display = "none";
        updateButtons();
    });
});

/* =========================================================
   LOGO – FONCTION GÉNÉRIQUE (UPLOAD → CROP OBLIGATOIRE)
========================================================= */
function initLogoCrop(uploadInput, imgElement, assignFn) {
    uploadInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (imgElement._cropper) imgElement._cropper.destroy();

            imgElement.src = reader.result;

            const cropper = new Cropper(imgElement, {
                aspectRatio: 5 / 2,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                background: false,
                guides: false
            });

            imgElement._cropper = cropper;
            assignFn(null); // reset source tant que non exporté
            hasPreview = false;
            previewImg.style.display = "none";
            updateButtons();
        };
        reader.readAsDataURL(file);
    });
}

function exportLogo(imgElement, assignFn) {
    if (!imgElement._cropper) return null;

    const canvas = imgElement._cropper.getCroppedCanvas({
        width: 500,
        height: 200
    });

    const data = canvas.toDataURL("image/png");
    assignFn(data);
    return data;
}

/* =========================================================
   LOGO 1
========================================================= */
const logoUpload1 = document.getElementById("logoUpload1");
const logoCropImage1 = document.getElementById("logoCropImage1");

initLogoCrop(logoUpload1, logoCropImage1, (v) => (logo1Source = v));

/* =========================================================
   LOGO 2
========================================================= */
const logoUpload2 = document.getElementById("logoUpload2");
const logoCropImage2 = document.getElementById("logoCropImage2");

initLogoCrop(logoUpload2, logoCropImage2, (v) => (logo2Source = v));

/* =========================================================
   GÉNÉRATION VISUEL FINAL
========================================================= */
async function drawFinalCanvas() {
    exportPhoto();
    exportLogo(logoCropImage1, (v) => (logo1Source = v));
    exportLogo(logoCropImage2, (v) => (logo2Source = v));

    if (!photoSource) return;

    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    const template = await loadImage("templates/FR/template_FR_white.png");
    ctx.drawImage(template, 0, 0, 1080, 1350);

    // Photo
    const photo = await loadImage(photoSource);
    ctx.save();
    ctx.beginPath();
    ctx.arc(270, 580, 233, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photo, 37, 347, 466, 466);
    ctx.restore();

    // Logos
    const logos = [];
    if (logo1Source) logos.push(await loadImage(logo1Source));
    if (logo2Source) logos.push(await loadImage(logo2Source));

    const maxH = 142;
    let totalW = 0;
    const sizes = logos.map((img) => {
        const r = img.width / img.height;
        const w = r * maxH;
        totalW += w;
        return { img, w, h: maxH };
    });

    const spacing = logos.length === 2 ? 70 : 0;
    totalW += spacing;

    let x = (1080 - totalW) / 2;
    const y = 1122 + (162 - maxH) / 2;

    sizes.forEach((l) => {
        ctx.drawImage(l.img, x, y, l.w, l.h);
        x += l.w + spacing;
    });

    // Aperçu miniature nette
    previewImg.src = finalCanvas.toDataURL("image/jpeg", 0.8);
    previewImg.style.display = "block";
    previewImg.style.width = "280px";
    previewImg.style.pointerEvents = "none";

    hasPreview = true;
    updateButtons();
}

/* =========================================================
   ACTIONS
========================================================= */
document.getElementById("previewBtn").addEventListener("click", drawFinalCanvas);

document.getElementById("sendBtn").addEventListener("click", async () => {
    if (!hasPreview) return;

    const payload = {
        email: document.getElementById("email").value.trim(),
        image: finalCanvas.toDataURL("image/png"),
        timestamp: new Date().toISOString()
    };

    await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    alert("Votre visuel HD vous a été envoyé par e-mail.");
});

/* =========================================================
   INIT
========================================================= */
document.getElementById("email").addEventListener("input", updateButtons);
document.getElementById("consent").addEventListener("change", updateButtons);
updateButtons();
