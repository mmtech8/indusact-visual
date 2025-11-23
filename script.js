/* ------------------------------------------
   CONFIG GLOBALE
-------------------------------------------*/

// Webhook Make à personnaliser
const MAKE_WEBHOOK_URL = "https://hook.integromat.com/XXX";

// Coordonnées de la bande blanche sur le template avec logos
const BAND_TOP = 1122;
const BAND_BOTTOM = 1284;
const BAND_HEIGHT = BAND_BOTTOM - BAND_TOP;
const MAX_LOGO_HEIGHT = 142; // hauteur max pour les logos dans la bande

// Mapping simple des logos alumni (à compléter)
const ALUMNI_LOGOS = {
    insead: "logos/alumni/insead.png",
    arts_metiers: "logos/alumni/artsmetiers.png",
    hec: "logos/alumni/hec.png",
    essec: "logos/alumni/essec.png",
    centrale: "logos/alumni/centrale.png"
    // etc.
};


/* ------------------------------------------
   VARIABLES GLOBALES
-------------------------------------------*/

// Croppie instances
let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

// Sources pour le canvas final
let photoSource = null;     // base64
let logo1Source = null;     // base64 ou chemin logo alumni
let logo2Source = null;     // base64 ou chemin logo alumni

// Canvas final
const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

// État UX
let hasPreview = false;


/* ------------------------------------------
   UTILITAIRE : CHARGER UNE IMAGE
-------------------------------------------*/
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}


/* ------------------------------------------
   GESTION DES BOUTONS (activation)
-------------------------------------------*/
function updateButtons() {
    const email = document.getElementById("email").value.trim();
    const consent = document.getElementById("consent").checked;

    const previewBtn = document.getElementById("previewBtn");
    const sendBtn = document.getElementById("sendBtn");

    // Pour générer l’aperçu : email + consent + photo uploadée
    const canPreview = email !== "" && consent && cropPhoto !== null;

    previewBtn.disabled = !canPreview;

    // On ne peut envoyer que quand un aperçu a été généré
    sendBtn.disabled = !hasPreview;
}


/* ------------------------------------------
   PHOTO – UPLOAD & CROPPING
-------------------------------------------*/
document.getElementById("photoUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        if (cropPhoto) {
            cropPhoto.destroy();
        }

        cropPhoto = new Croppie(document.getElementById("photoCropArea"), {
            viewport: { width: 240, height: 240, type: "circle" },
            boundary: { width: 280, height: 280 },
            enableOrientation: true,
            showZoomer: false // on gère le zoom via notre slider
        });

        cropPhoto.bind({ url: event.target.result });

        // Reset slider zoom
        const photoZoom = document.getElementById("photoZoom");
        photoZoom.value = 1;
        cropPhoto.setZoom(1);

        updateButtons();
    };
    reader.readAsDataURL(file);
});

// Slider de zoom pour la photo
document.getElementById("photoZoom").addEventListener("input", (e) => {
    if (!cropPhoto) return;
    const zoomVal = parseFloat(e.target.value);
    cropPhoto.setZoom(zoomVal);
});

// Export photo recadrée
function exportPhoto() {
    if (!cropPhoto) return Promise.resolve(null);
    return cropPhoto
        .result({
            type: "base64",
            size: { width: 600, height: 600 },
            format: "png",
            circle: true
        })
        .then((output) => {
            photoSource = output;
            // Aperçu rond
            document.getElementById("photoPreview").style.backgroundImage = `url(${output})`;
            return output;
        });
}


/* ------------------------------------------
   LOGOS – GESTION NB LOGOS (0 / 1 / 2)
-------------------------------------------*/
const nbLogosRadios = document.querySelectorAll("input[name='nbLogos']");
nbLogosRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
        const value = radio.value;
        const logo1Section = document.getElementById("logo1Section");
        const logo2Section = document.getElementById("logo2Section");

        if (value === "0") {
            logo1Section.style.display = "none";
            logo2Section.style.display = "none";
        } else if (value === "1") {
            logo1Section.style.display = "block";
            logo2Section.style.display = "none";
        } else if (value === "2") {
            logo1Section.style.display = "block";
            logo2Section.style.display = "block";
        }
    });
});


/* ------------------------------------------
   LOGO 1 – TYPE ORGANISATION
-------------------------------------------*/
const logo1TypeSelect = document.getElementById("logo1Type");
const logo1AlumniZone = document.getElementById("logo1AlumniZone");
const logo1UploadZone = document.getElementById("logo1UploadZone");

logo1TypeSelect.addEventListener("change", () => {
    const type = logo1TypeSelect.value;
    logo1Source = null;
    document.getElementById("logoPreview1").style.backgroundImage = "";
    document.getElementById("logoPreview1Alumni").style.backgroundImage = "";

    if (type === "alumni") {
        logo1AlumniZone.style.display = "block";
        logo1UploadZone.style.display = "none";
    } else if (type === "other") {
        logo1AlumniZone.style.display = "none";
        logo1UploadZone.style.display = "block";
    } else {
        logo1AlumniZone.style.display = "none";
        logo1UploadZone.style.display = "none";
    }
});


/* ------------------------------------------
   LOGO 1 – ALUMNI (Sélection + Preview)
-------------------------------------------*/
const logo1AlumniSelect = document.getElementById("logo1Alumni");
const logo1AlumniSearch = document.getElementById("logo1AlumniSearch");

logo1AlumniSearch.addEventListener("input", () => {
    const term = logo1AlumniSearch.value.toLowerCase();
    Array.from(logo1AlumniSelect.options).forEach((opt, index) => {
        if (index === 0) return; // garder l'option vide
        opt.hidden = !opt.text.toLowerCase().includes(term);
    });
});

logo1AlumniSelect.addEventListener("change", () => {
    const val = logo1AlumniSelect.value;
    if (!val || !ALUMNI_LOGOS[val]) {
        logo1Source = null;
        document.getElementById("logoPreview1Alumni").style.backgroundImage = "";
        return;
    }
    const path = ALUMNI_LOGOS[val];
    logo1Source = path;
    document.getElementById("logoPreview1Alumni").style.backgroundImage = `url(${path})`;
});


/* ------------------------------------------
   LOGO 1 – UPLOAD + CROPPING
-------------------------------------------*/
document.getElementById("logoUpload1").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        if (cropLogo1) cropLogo1.destroy();

        cropLogo1 = new Croppie(document.getElementById("logoCrop1"), {
            viewport: { width: 220, height: 130, type: "square" },
            boundary: { width: 280, height: 180 },
            enableOrientation: true,
            showZoomer: false
        });

        cropLogo1.bind({ url: event.target.result });

        const zoomSlider = document.getElementById("logo1Zoom");
        zoomSlider.value = 1;
        cropLogo1.setZoom(1);
    };
    reader.readAsDataURL(file);
});

document.getElementById("logo1Zoom").addEventListener("input", (e) => {
    if (!cropLogo1) return;
    cropLogo1.setZoom(parseFloat(e.target.value));
});

function exportLogo1() {
    const type = logo1TypeSelect.value;

    if (type === "alumni") {
        // On a déjà un chemin ALUMNI_LOGOS, rien à recadrer
        return Promise.resolve(logo1Source);
    }

    if (type === "other" && cropLogo1) {
        return cropLogo1
            .result({
                type: "base64",
                size: { width: 500, height: 300 },
                format: "png"
            })
            .then((output) => {
                logo1Source = output;
                document.getElementById("logoPreview1").style.backgroundImage = `url(${output})`;
                return output;
            });
    }

    return Promise.resolve(null);
}


/* ------------------------------------------
   LOGO 2 – TYPE ORGANISATION
-------------------------------------------*/
const logo2TypeSelect = document.getElementById("logo2Type");
const logo2AlumniZone = document.getElementById("logo2AlumniZone");
const logo2UploadZone = document.getElementById("logo2UploadZone");

logo2TypeSelect.addEventListener("change", () => {
    const type = logo2TypeSelect.value;
    logo2Source = null;
    document.getElementById("logoPreview2").style.backgroundImage = "";
    document.getElementById("logoPreview2Alumni").style.backgroundImage = "";

    if (type === "alumni") {
        logo2AlumniZone.style.display = "block";
        logo2UploadZone.style.display = "none";
    } else if (type === "other") {
        logo2AlumniZone.style.display = "none";
        logo2UploadZone.style.display = "block";
    } else {
        logo2AlumniZone.style.display = "none";
        logo2UploadZone.style.display = "none";
    }
});


/* ------------------------------------------
   LOGO 2 – ALUMNI
-------------------------------------------*/
const logo2AlumniSelect = document.getElementById("logo2Alumni");
const logo2AlumniSearch = document.getElementById("logo2AlumniSearch");

logo2AlumniSearch.addEventListener("input", () => {
    const term = logo2AlumniSearch.value.toLowerCase();
    Array.from(logo2AlumniSelect.options).forEach((opt, index) => {
        if (index === 0) return;
        opt.hidden = !opt.text.toLowerCase().includes(term);
    });
});

logo2AlumniSelect.addEventListener("change", () => {
    const val = logo2AlumniSelect.value;
    if (!val || !ALUMNI_LOGOS[val]) {
        logo2Source = null;
        document.getElementById("logoPreview2Alumni").style.backgroundImage = "";
        return;
    }
    const path = ALUMNI_LOGOS[val];
    logo2Source = path;
    document.getElementById("logoPreview2Alumni").style.backgroundImage = `url(${path})`;
});


/* ------------------------------------------
   LOGO 2 – UPLOAD + CROPPING
-------------------------------------------*/
document.getElementById("logoUpload2").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        if (cropLogo2) cropLogo2.destroy();

        cropLogo2 = new Croppie(document.getElementById("logoCrop2"), {
            viewport: { width: 220, height: 130, type: "square" },
            boundary: { width: 280, height: 180 },
            enableOrientation: true,
            showZoomer: false
        });

        cropLogo2.bind({ url: event.target.result });

        const zoomSlider = document.getElementById("logo2Zoom");
        zoomSlider.value = 1;
        cropLogo2.setZoom(1);
    };
    reader.readAsDataURL(file);
});

document.getElementById("logo2Zoom").addEventListener("input", (e) => {
    if (!cropLogo2) return;
    cropLogo2.setZoom(parseFloat(e.target.value));
});

function exportLogo2() {
    const type = logo2TypeSelect.value;

    if (type === "alumni") {
        return Promise.resolve(logo2Source);
    }

    if (type === "other" && cropLogo2) {
        return cropLogo2
            .result({
                type: "base64",
                size: { width: 500, height: 300 },
                format: "png"
            })
            .then((output) => {
                logo2Source = output;
                document.getElementById("logoPreview2").style.backgroundImage = `url(${output})`;
                return output;
            });
    }

    return Promise.resolve(null);
}


/* ------------------------------------------
   CHOIX DU TEMPLATE (FR)
-------------------------------------------*/
function getTemplatePath(nbLogos) {
    if (parseInt(nbLogos, 10) === 0) {
        return "templates/template_FR_nologo.png";
    }
    return "templates/template_FR_white.png";
}


/* ------------------------------------------
   PLACEMENT AUTOMATIQUE DES LOGOS
-------------------------------------------*/
async function placeLogosOnCanvas(nbLogos) {
    const logos = [];

    if (logo1Source) logos.push(await loadImage(logo1Source));
    if (parseInt(nbLogos, 10) === 2 && logo2Source) logos.push(await loadImage(logo2Source));

    if (logos.length === 0) return;

    const processed = logos.map((img) => {
        const ratio = img.width / img.height;
        const h = MAX_LOGO_HEIGHT;
        const w = h * ratio;
        return { img, w, h };
    });

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
   CONSTRUCTION DU VISUEL FINAL (APERÇU)
-------------------------------------------*/
async function drawFinalCanvas() {
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    // Export recadrages
    await exportPhoto();
    if (parseInt(nbLogos, 10) >= 1) await exportLogo1();
    if (parseInt(nbLogos, 10) === 2) await exportLogo2();

    if (!photoSource) {
        alert("Merci d’importer et de recadrer ta photo avant de générer l’aperçu.");
        return;
    }

    // Reset canvas
    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Charger le bon template
    const templatePath = getTemplatePath(nbLogos);
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, 1080, 1350);

    // Dessiner la photo dans un cercle (coordonnées à adapter au template)
    const photoImg = await loadImage(photoSource);
    ctx.save();
    ctx.beginPath();
    ctx.arc(305, 450, 240, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(photoImg, 65, 210, 480, 480);
    ctx.restore();

    // Logos (si bande blanche)
    if (parseInt(nbLogos, 10) >= 1 && (logo1Source || logo2Source)) {
        await placeLogosOnCanvas(nbLogos);
    }

    hasPreview = true;
    updateButtons();
}


/* ------------------------------------------
   ÉVÈNEMENTS PREVIEW & ENVOI
-------------------------------------------*/

// Générer l’aperçu
document.getElementById("previewBtn").addEventListener("click", async () => {
    await drawFinalCanvas();
});

// Envoyer le visuel par e-mail
document.getElementById("sendBtn").addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const fullname = document.getElementById("fullname").value.trim();
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    if (!email) {
        alert("Merci de renseigner ton email.");
        return;
    }

    if (!hasPreview) {
        alert("Merci de générer d’abord un aperçu.");
        return;
    }

    const finalBase64 = finalCanvas.toDataURL("image/png");

    const payload = {
        email,
        fullname,
        nbLogos,
        logo1Type: logo1TypeSelect.value,
        logo2Type: logo2TypeSelect.value,
        logo1Alumni: document.getElementById("logo1Alumni").value || null,
        logo2Alumni: document.getElementById("logo2Alumni").value || null,
        image: finalBase64,
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert("Ton visuel a bien été envoyé. Tu vas recevoir un e-mail avec ton visuel et des suggestions de texte pour ton post.");
    } catch (e) {
        console.error(e);
        alert("Une erreur est survenue lors de l’envoi. Merci de réessayer plus tard.");
    }
});


/* ------------------------------------------
   LISTENERS DE BASE POUR ACTUALISER L’UX
-------------------------------------------*/
document.getElementById("email").addEventListener("input", updateButtons);
document.getElementById("consent").addEventListener("change", updateButtons);
