/* ------------------------------------------
   VARIABLES GLOBALES
-------------------------------------------*/

// Instances croppie
let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

// Base64 finals
let photoFinal = null;
let logo1Final = null;
let logo2Final = null;

// Canvas final
const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

// Bande blanche du template avec logos
const BAND_TOP = 1122; 
const BAND_BOTTOM = 1284;
const BAND_HEIGHT = BAND_BOTTOM - BAND_TOP;
const PAD_X = 57;
const MAX_LOGO_HEIGHT = 142; // hauteur utile


/* ------------------------------------------
   ACTIVATION / DÉSACTIVATION BOUTON GÉNÉRER
-------------------------------------------*/
function updateGenerateButton() {
    const email = document.getElementById("email").value.trim();
    const consent = document.getElementById("consent").checked;

    if (email !== "" && consent && photoFinal !== null) {
        document.getElementById("generateBtn").disabled = false;
    } else {
        document.getElementById("generateBtn").disabled = true;
    }
}


/* ------------------------------------------
   INITIALISATION DU CROPPER PHOTO (CERCLE)
-------------------------------------------*/
document.getElementById("photoUpload").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {

        // Détruire ancien cropper si existant
        if (cropPhoto) cropPhoto.destroy();

        cropPhoto = new Croppie(document.getElementById("photoCropArea"), {
            viewport: { width: 240, height: 240, type: "circle" },
            boundary: { width: 280, height: 280 },
            enableOrientation: true,
            showZoomer: true,
        });

        cropPhoto.bind({ url: event.target.result });
    };
    reader.readAsDataURL(file);
});


/* EXPORT PHOTO CROPPÉE À LA DEMANDE */
function exportPhoto() {
    return cropPhoto
        .result({
            type: "base64",
            size: { width: 600, height: 600 },
            format: "png",
            circle: true,
        })
        .then((output) => {
            photoFinal = output;

            // Aperçu rond
            document.getElementById("photoPreview").style.backgroundImage = `url(${output})`;

            updateGenerateButton();
        });
}


/* ------------------------------------------
   CROPPER LOGO 1
-------------------------------------------*/
document.getElementById("logoUpload1").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {

        if (cropLogo1) cropLogo1.destroy();

        cropLogo1 = new Croppie(document.getElementById("logoCrop1"), {
            viewport: { width: 200, height: 120, type: "square" },
            boundary: { width: 280, height: 280 },
            enableOrientation: true,
            showZoomer: true,
        });

        cropLogo1.bind({ url: event.target.result });
    };
    reader.readAsDataURL(file);
});


function exportLogo1() {
    if (!cropLogo1) return Promise.resolve(null);

    return cropLogo1
        .result({
            type: "base64",
            size: { width: 500, height: 300 },
            format: "png",
        })
        .then((output) => {
            logo1Final = output;
            document.getElementById("logoPreview1").style.backgroundImage = `url(${output})`;
            return output;
        });
}


/* ------------------------------------------
   CROPPER LOGO 2
-------------------------------------------*/
document.getElementById("logoUpload2").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {

        if (cropLogo2) cropLogo2.destroy();

        cropLogo2 = new Croppie(document.getElementById("logoCrop2"), {
            viewport: { width: 200, height: 120, type: "square" },
            boundary: { width: 280, height: 280 },
            enableOrientation: true,
            showZoomer: true,
        });

        cropLogo2.bind({ url: event.target.result });
    };
    reader.readAsDataURL(file);
});

function exportLogo2() {
    if (!cropLogo2) return Promise.resolve(null);

    return cropLogo2
        .result({
            type: "base64",
            size: { width: 500, height: 300 },
            format: "png",
        })
        .then((output) => {
            logo2Final = output;
            document.getElementById("logoPreview2").style.backgroundImage = `url(${output})`;
            return output;
        });
}


/* ------------------------------------------
   DESSIN DU VISUEL FINAL SUR LE CANVAS
-------------------------------------------*/
async function drawFinalCanvas() {

    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    // Export des éléments recadrés
    await exportPhoto();
    if (nbLogos >= 1) await exportLogo1();
    if (nbLogos == 2) await exportLogo2();

    // Effacer canvas
    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Charger template
    const template = await loadImage(nbLogos == 0 ? "template_FR_nologo.png" : "template_FR_white.png");
    ctx.drawImage(template, 0, 0, 1080, 1350);

    // PHOTO CIRCULAIRE
    if (photoFinal) {
        const photoImg = await loadImage(photoFinal);

        ctx.save();
        ctx.beginPath();
        ctx.arc(305, 450, 240, 0, Math.PI * 2); 
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(photoImg, 65, 210, 480, 480);
        ctx.restore();
    }

    // LOGOS
    if (nbLogos >= 1 && logo1Final) {
        await placeCenteredLogos(nbLogos);
    }
}


/* ------------------------------------------
   GESTION DU PLACEMENT AUTOMATIQUE DES LOGOS
-------------------------------------------*/
async function placeCenteredLogos(nb) {
    const logos = [];

    if (logo1Final) logos.push(await loadImage(logo1Final));
    if (nb === "2" && logo2Final) logos.push(await loadImage(logo2Final));

    // Process logos (redimension dynamique)
    const processed = logos.map((img) => {
        const ratio = img.width / img.height;
        const drawHeight = MAX_LOGO_HEIGHT;
        const drawWidth = drawHeight * ratio;
        return { img, w: drawWidth, h: drawHeight };
    });

    // Placement
    if (processed.length === 1) {
        const { img, w, h } = processed[0];

        const x = (1080 - w) / 2;
        const y = BAND_TOP + (BAND_HEIGHT - h) / 2;

        ctx.drawImage(img, x, y, w, h);
    }

    if (processed.length === 2) {
        const spacing = 70;
        const totalWidth = processed[0].w + processed[1].w + spacing;

        let x = (1080 - totalWidth) / 2;
        const y = BAND_TOP + (BAND_HEIGHT - processed[0].h) / 2;

        ctx.drawImage(processed[0].img, x, y, processed[0].w, processed[0].h);

        x += processed[0].w + spacing;

        ctx.drawImage(processed[1].img, x, y, processed[1].w, processed[1].h);
    }
}


/* ------------------------------------------
   UTILITAIRE : CHARGEMENT IMAGE
-------------------------------------------*/
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
}


/* ------------------------------------------
   BOUTON "GÉNÉRER"
-------------------------------------------*/
document.getElementById("generateBtn").addEventListener("click", async () => {
    await drawFinalCanvas();

    const finalBase64 = finalCanvas.toDataURL("image/png");

    alert("Visuel généré !");

    // Tu peux maintenant envoyer à MAKE :
    // fetch("WEBHOOK_MAKE", { method: "POST", body: JSON.stringify({ email, finalBase64 }) })
});
