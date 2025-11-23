/* ------------------------------------------
   CONFIG GLOBALE
-------------------------------------------*/

// Webhook Make — À personnaliser
const MAKE_WEBHOOK_URL = "https://hook.integromat.com/XXX";

// Coordonnées exactes de la bande blanche (px)
const BAND_TOP = 1122;
const BAND_BOTTOM = 1284;
const BAND_HEIGHT = BAND_BOTTOM - BAND_TOP;

// Hauteur maximum autorisée pour un logo (px)
const MAX_LOGO_HEIGHT = 142;

// Bibliothèque Alumni (chargée dynamiquement)
let ALUMNI_LOGOS = {};  


/* ------------------------------------------
   CHARGEMENT DU FICHIER alumni.json
-------------------------------------------*/
async function loadAlumniLogos() {
    try {
        const response = await fetch("data/alumni.json");
        const data = await response.json();
        ALUMNI_LOGOS = data.alumni.reduce((acc, item) => {
            acc[item.id] = item.logo;
            return acc;
        }, {});
    } catch (err) {
        console.error("Erreur lors du chargement de alumni.json :", err);
    }
}
loadAlumniLogos();


/* ------------------------------------------
   VARIABLES GLOBALES
-------------------------------------------*/

let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

let photoSource = null;
let logo1Source = null;
let logo2Source = null;

const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

let hasPreview = false;


/* ------------------------------------------
   UTILITAIRE : CHARGEMENT IMAGE
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
   ACTUALISATION DES BOUTONS
-------------------------------------------*/
function updateButtons() {
    const email = document.getElementById("email").value.trim();
    const consent = document.getElementById("consent").checked;

    const previewBtn = document.getElementById("previewBtn");
    const sendBtn = document.getElementById("sendBtn");

    const canPreview = email !== "" && consent && cropPhoto !== null;

    previewBtn.disabled = !canPreview;
    sendBtn.disabled = !hasPreview;
}


/* ------------------------------------------
   PHOTO : UPLOAD + CROPPING
-------------------------------------------*/
document.getElementById("photoUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (cropPhoto) cropPhoto.destroy();

        cropPhoto = new Croppie(document.getElementById("photoCropArea"), {
            viewport: { width: 260, height: 260, type: "circle" },
            boundary: { width: 300, height: 300 },
            enableOrientation: true,
            showZoomer: false
        });

        cropPhoto.bind({ url: event.target.result });

        document.getElementById("photoZoom").value = 1;
        cropPhoto.setZoom(1);
        updateButtons();
    };

    reader.readAsDataURL(file);
});

document.getElementById("photoZoom").addEventListener("input", (e) => {
    if (!cropPhoto) return;
    cropPhoto.setZoom(parseFloat(e.target.value));
});

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
            document.getElementById("photoPreview").style.backgroundImage = `url(${output})`;
            return output;
        });
}


/* ------------------------------------------
   GESTION 0 / 1 / 2 LOGOS
-------------------------------------------*/
document.querySelectorAll("input[name='nbLogos']").forEach((radio) => {
    radio.addEventListener("change", () => {
        const value = radio.value;

        document.getElementById("logo1Section").style.display =
            value === "1" || value === "2" ? "block" : "none";

        document.getElementById("logo2Section").style.display =
            value === "2" ? "block" : "none";
    });
});


/* ------------------------------------------
   LOGO 1 : GESTION TYPE
-------------------------------------------*/
document.getElementById("logo1Type").addEventListener("change", (e) => {
    const type = e.target.value;

    logo1Source = null;
    document.getElementById("logoPreview1").style.backgroundImage = "";
    document.getElementById("logoPreview1Alumni").style.backgroundImage = "";

    document.getElementById("logo1AlumniZone").style.display =
        type === "alumni" ? "block" : "none";
    document.getElementById("logo1UploadZone").style.display =
        type === "other" ? "block" : "none";
});


/* ------------------------------------------
   LOGO 1 : ALUMNI (Sélection + Preview)
-------------------------------------------*/
document.getElementById("logo1AlumniSearch").addEventListener("input", () => {
    const term = document.getElementById("logo1AlumniSearch").value.toLowerCase();
    const select = document.getElementById("logo1Alumni");

    Array.from(select.options).forEach((opt, index) => {
        if (index === 0) return;
        opt.hidden = !opt.text.toLowerCase().includes(term);
    });
});

document.getElementById("logo1Alumni").addEventListener("change", () => {
    const val = document.getElementById("logo1Alumni").value;

    if (val && ALUMNI_LOGOS[val]) {
        logo1Source = ALUMNI_LOGOS[val];
        document.getElementById("logoPreview1Alumni").style.backgroundImage =
            `url(${logo1Source})`;
    } else {
        logo1Source = null;
        document.getElementById("logoPreview1Alumni").style.backgroundImage = "";
    }
});


/* ------------------------------------------
   LOGO 1 : UPLOAD + CROP
-------------------------------------------*/
document.getElementById("logoUpload1").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (cropLogo1) cropLogo1.destroy();

        cropLogo1 = new Croppie(document.getElementById("logoCrop1"), {
            viewport: { width: 240, height: 140, type: "square" },
            boundary: { width: 300, height: 200 },
            enableOrientation: true,
            showZoomer: false
        });

        cropLogo1.bind({ url: event.target.result });
        document.getElementById("logo1Zoom").value = 1;
        cropLogo1.setZoom(1);
    };
    reader.readAsDataURL(file);
});

document.getElementById("logo1Zoom").addEventListener("input", (e) => {
    if (!cropLogo1) return;
    cropLogo1.setZoom(parseFloat(e.target.value));
});

function exportLogo1() {
    const type = document.getElementById("logo1Type").value;

    if (type === "alumni") return Promise.resolve(logo1Source);

    if (type === "other" && cropLogo1) {
        return cropLogo1.result({
            type: "base64",
            size: { width: 500, height: 300 },
            format: "png"
        }).then((output) => {
            logo1Source = output;
            document.getElementById("logoPreview1").style.backgroundImage =
                `url(${output})`;
            return output;
        });
    }

    return Promise.resolve(null);
}


/* ------------------------------------------
   LOGO 2 – même logique que LOGO 1
-------------------------------------------*/

document.getElementById("logo2Type").addEventListener("change", (e) => {
    const type = e.target.value;

    logo2Source = null;
    document.getElementById("logoPreview2").style.backgroundImage = "";
    document.getElementById("logoPreview2Alumni").style.backgroundImage = "";

    document.getElementById("logo2AlumniZone").style.display =
        type === "alumni" ? "block" : "none";
    document.getElementById("logo2UploadZone").style.display =
        type === "other" ? "block" : "none";
});

document.getElementById("logo2AlumniSearch").addEventListener("input", () => {
    const term = document.getElementById("logo2AlumniSearch").value.toLowerCase();
    const select = document.getElementById("logo2Alumni");

    Array.from(select.options).forEach((opt, index) => {
        if (index === 0) return;
        opt.hidden = !opt.text.toLowerCase().includes(term);
    });
});

document.getElementById("logo2Alumni").addEventListener("change", () => {
    const val = document.getElementById("logo2Alumni").value;

    if (val && ALUMNI_LOGOS[val]) {
        logo2Source = ALUMNI_LOGOS[val];
        document.getElementById("logoPreview2Alumni").style.backgroundImage =
            `url(${logo2Source})`;
    } else {
        logo2Source = null;
        document.getElementById("logoPreview2Alumni").style.backgroundImage = "";
    }
});

document.getElementById("logoUpload2").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (cropLogo2) cropLogo2.destroy();

        cropLogo2 = new Croppie(document.getElementById("logoCrop2"), {
            viewport: { width: 240, height: 140, type: "square" },
            boundary: { width: 300, height: 200 },
            enableOrientation: true,
            showZoomer: false
        });

        cropLogo2.bind({ url: event.target.result });
        document.getElementById("logo2Zoom").value = 1;
        cropLogo2.setZoom(1);
    };
    reader.readAsDataURL(file);
});

document.getElementById("logo2Zoom").addEventListener("input", (e) => {
    if (!cropLogo2) return;
    cropLogo2.setZoom(parseFloat(e.target.value));
});

function exportLogo2() {
    const type = document.getElementById("logo2Type").value;

    if (type === "alumni") return Promise.resolve(logo2Source);

    if (type === "other" && cropLogo2) {
        return cropLogo2.result({
            type: "base64",
            size: { width: 500, height: 300 },
            format: "png"
        }).then((output) => {
            logo2Source = output;
            document.getElementById("logoPreview2").style.backgroundImage =
                `url(${output})`;
            return output;
        });
    }
    return Promise.resolve(null);
}


/* ------------------------------------------
   CHOIX DU TEMPLATE
-------------------------------------------*/
function getTemplatePath(nbLogos) {
    return nbLogos === "0"
        ? "templates/FR/template_FR_nologo.png"
        : "templates/FR/template_FR_white.png";
}


/* ------------------------------------------
   POSITIONNEMENT AUTOMATIQUE DES LOGOS
-------------------------------------------*/
async function placeLogosOnCanvas(nbLogos) {
    const logos = [];

    if (logo1Source) logos.push(await loadImage(logo1Source));
    if (nbLogos === "2" && logo2Source) logos.push(await loadImage(logo2Source));

    if (logos.length === 0) return;

    const processed = logos.map((img) => {
        const ratio = img.width / img.height;
        const h = MAX_LOGO_HEIGHT;
        const w = ratio * h;
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
   CONSTRUCTION DU VISUEL FINAL
-------------------------------------------*/
async function drawFinalCanvas() {
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    await exportPhoto();
    if (nbLogos !== "0") await exportLogo1();
    if (nbLogos === "2") await exportLogo2();

    if (!photoSource) {
        alert("Merci d’importer et recadrer ta photo.");
        return;
    }

    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    const template = await loadImage(getTemplatePath(nbLogos));
    ctx.drawImage(template, 0, 0, 1080, 1350);

    const photoImg = await loadImage(photoSource);

    ctx.save();
    ctx.beginPath();
    ctx.arc(305, 455, 250, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photoImg, 55, 205, 500, 500);
    ctx.restore();

    if (nbLogos !== "0") {
        await placeLogosOnCanvas(nbLogos);
    }

    hasPreview = true;
    updateButtons();
}


/* ------------------------------------------
   ÉVÈNEMENTS : PREVIEW & SEND
-------------------------------------------*/
document.getElementById("previewBtn").addEventListener("click", drawFinalCanvas);

document.getElementById("sendBtn").addEventListener("click", async () => {
    if (!hasPreview) {
        alert("Merci de générer un aperçu d’abord.");
        return;
    }

    const email = document.getElementById("email").value.trim();
    if (!email) {
        alert("Merci de renseigner ton email.");
        return;
    }

    const fullname = document.getElementById("fullname").value.trim();
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    const payload = {
        email,
        fullname,
        nbLogos,
        logo1Type: document.getElementById("logo1Type").value,
        logo2Type: document.getElementById("logo2Type").value,
        logo1Alumni: document.getElementById("logo1Alumni").value || null,
        logo2Alumni: document.getElementById("logo2Alumni").value || null,
        image: finalCanvas.toDataURL("image/png"),
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert("Ton visuel a été envoyé ! Tu vas recevoir un e-mail avec ton image et des suggestions de texte.");
    } catch (err) {
        console.error(err);
        alert("Erreur lors de l’envoi. Réessaie plus tard.");
    }
});


/* ------------------------------------------
   UX : LISTENERS
-------------------------------------------*/
document.getElementById("email").addEventListener("input", updateButtons);
document.getElementById("consent").addEventListener("change", updateButtons);
