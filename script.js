/* ------------------------------------------
   CONFIG GLOBALE
-------------------------------------------*/

// Webhook Make — à personnaliser
const MAKE_WEBHOOK_URL = "https://hook.integromat.com/XXX";

// Coordonnées de la bande blanche (px)
const BAND_TOP = 1122;
const BAND_BOTTOM = 1284;
const BAND_HEIGHT = BAND_BOTTOM - BAND_TOP;

// Hauteur max des logos dans la bande (px)
const MAX_LOGO_HEIGHT = 142;

// Position de la photo dans le visuel final (px)
// 0,98 cm → ~37 px ; 9,17 cm → ~347 px ; 12,33 cm → ~466 px
const PHOTO_X = 37;
const PHOTO_Y = 347;
const PHOTO_SIZE = 466;
const PHOTO_RADIUS = PHOTO_SIZE / 2;
const PHOTO_CENTER_X = PHOTO_X + PHOTO_RADIUS;
const PHOTO_CENTER_Y = PHOTO_Y + PHOTO_RADIUS;

// Bibliothèque alumni (à partir de data/alumni.json)
let ALUMNI_LOGOS = {};
let alumniList = [];

// Croppie instances
let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

// Sources finales
let photoSource = null;
let logo1Source = null;
let logo2Source = null;

// Canvas final (HD mais caché en UI)
const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

// Image d’aperçu floue
const previewImg = document.getElementById("previewImage");

// État
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
   CHARGEMENT ALUMNI.JSON
-------------------------------------------*/
async function loadAlumniLogos() {
    try {
        const response = await fetch("data/alumni.json");
        const data = await response.json();
        alumniList = data.alumni || [];

        ALUMNI_LOGOS = alumniList.reduce((acc, item) => {
            acc[item.id] = item.logo;
            return acc;
        }, {});

        populateAlumniSelects();
    } catch (err) {
        console.error("Erreur lors du chargement de data/alumni.json :", err);
    }
}

function populateAlumniSelects() {
    const selects = [
        document.getElementById("logo1Alumni"),
        document.getElementById("logo2Alumni")
    ];

    selects.forEach((select) => {
        if (!select) return;

        // Reset
        select.innerHTML = "";

        // Option vide
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "Choisis ton association d’alumni";
        select.appendChild(emptyOpt);

        // Alumni
        alumniList.forEach((a) => {
            const opt = document.createElement("option");
            opt.value = a.id;
            opt.textContent = a.name;
            select.appendChild(opt);
        });

        // Option "je n’ai pas trouvé"
        const uploadOpt = document.createElement("option");
        uploadOpt.value = "__upload__";
        uploadOpt.textContent =
            "Je n’ai pas trouvé mon association – j’importe mon logo";
        select.appendChild(uploadOpt);

        // Activation filtrage clavier
        setupAlumniFilter(select);
    });
}

// Filtrage du <select> via saisie clavier
function setupAlumniFilter(select) {
    let filter = "";
    let timer = null;

    select.addEventListener("keydown", (e) => {
        const key = e.key;

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            filter = "";
            resetAlumniOptions(select);
        }, 1500);

        if (key === "Backspace") {
            filter = filter.slice(0, -1);
        } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            filter += key.toLowerCase();
        } else if (key === "Escape") {
            filter = "";
            resetAlumniOptions(select);
            return;
        } else {
            return;
        }

        const options = Array.from(select.options);
        options.forEach((opt, index) => {
            if (index === 0 || opt.value === "__upload__") {
                opt.hidden = false;
                return;
            }
            opt.hidden = !opt.text.toLowerCase().includes(filter);
        });
    });
}

function resetAlumniOptions(select) {
    Array.from(select.options).forEach((opt) => {
        opt.hidden = false;
    });
}


/* ------------------------------------------
   MISE À JOUR DES BOUTONS
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
   PHOTO : UPLOAD + RECADRAGE (pas d’aperçu rond)
-------------------------------------------*/
const photoUploadInput = document.getElementById("photoUpload");
const photoZoomInput = document.getElementById("photoZoom");

photoUploadInput.addEventListener("change", (e) => {
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

        photoZoomInput.value = 1;
        cropPhoto.setZoom(1);

        updateButtons();
    };

    reader.readAsDataURL(file);
});

photoZoomInput.addEventListener("input", (e) => {
    if (!cropPhoto) return;
    cropPhoto.setZoom(parseFloat(e.target.value));
});

function exportPhoto() {
    if (!cropPhoto) return Promise.resolve(null);

    return cropPhoto
        .result({
            type: "base64",
            size: { width: PHOTO_SIZE, height: PHOTO_SIZE },
            format: "png",
            circle: true
        })
        .then((output) => {
            photoSource = output;
            return output;
        });
}


/* ------------------------------------------
   NB DE LOGOS (0 / 1 / 2)
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
   LOGO 1 : TYPE & ALUMNI
-------------------------------------------*/
const logo1TypeSelect = document.getElementById("logo1Type");
const logo1AlumniZone = document.getElementById("logo1AlumniZone");
const logo1UploadZone = document.getElementById("logo1UploadZone");
const logo1AlumniSelect = document.getElementById("logo1Alumni");
const logo1ZoomInput = document.getElementById("logo1Zoom");

logo1TypeSelect.addEventListener("change", () => {
    const type = logo1TypeSelect.value;

    logo1Source = null;
    document.getElementById("logoPreview1").style.backgroundImage = "";
    document.getElementById("logoPreview1Alumni").style.backgroundImage = "";

    if (type === "alumni") {
        logo1AlumniZone.style.display = "block";
        const val = logo1AlumniSelect.value;
        logo1UploadZone.style.display = val === "__upload__" ? "block" : "none";
    } else if (type === "other") {
        logo1AlumniZone.style.display = "none";
        logo1UploadZone.style.display = "block";
    } else {
        logo1AlumniZone.style.display = "none";
        logo1UploadZone.style.display = "none";
    }
});

logo1AlumniSelect.addEventListener("change", () => {
    const val = logo1AlumniSelect.value;

    if (val === "__upload__") {
        logo1Source = null;
        document.getElementById("logoPreview1Alumni").style.backgroundImage = "";
        logo1UploadZone.style.display = "block";
        return;
    }

    if (val && ALUMNI_LOGOS[val]) {
        logo1Source = ALUMNI_LOGOS[val];
        logo1UploadZone.style.display = "none";
        document.getElementById("logoPreview1Alumni").style.backgroundImage =
            `url(${logo1Source})`;
    } else {
        logo1Source = null;
        logo1UploadZone.style.display = "none";
        document.getElementById("logoPreview1Alumni").style.backgroundImage = "";
    }
});

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

        logo1ZoomInput.value = 1;
        cropLogo1.setZoom(1);
    };
    reader.readAsDataURL(file);
});

logo1ZoomInput.addEventListener("input", (e) => {
    if (!cropLogo1) return;
    cropLogo1.setZoom(parseFloat(e.target.value));
});

function exportLogo1() {
    const type = logo1TypeSelect.value;

    if (type === "alumni") {
        const val = logo1AlumniSelect.value;
        if (val === "__upload__" && cropLogo1) {
            return cropLogo1
                .result({
                    type: "base64",
                    size: { width: 500, height: 300 },
                    format: "png"
                })
                .then((output) => {
                    logo1Source = output;
                    document.getElementById("logoPreview1").style.backgroundImage =
                        `url(${output})`;
                    return output;
                });
        } else {
            return Promise.resolve(logo1Source || null);
        }
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
                document.getElementById("logoPreview1").style.backgroundImage =
                    `url(${output})`;
                return output;
            });
    }

    return Promise.resolve(null);
}


/* ------------------------------------------
   LOGO 2 : TYPE & ALUMNI
-------------------------------------------*/
const logo2TypeSelect = document.getElementById("logo2Type");
const logo2AlumniZone = document.getElementById("logo2AlumniZone");
const logo2UploadZone = document.getElementById("logo2UploadZone");
const logo2AlumniSelect = document.getElementById("logo2Alumni");
const logo2ZoomInput = document.getElementById("logo2Zoom");

logo2TypeSelect.addEventListener("change", () => {
    const type = logo2TypeSelect.value;

    logo2Source = null;
    document.getElementById("logoPreview2").style.backgroundImage = "";
    document.getElementById("logoPreview2Alumni").style.backgroundImage = "";

    if (type === "alumni") {
        logo2AlumniZone.style.display = "block";
        const val = logo2AlumniSelect.value;
        logo2UploadZone.style.display = val === "__upload__" ? "block" : "none";
    } else if (type === "other") {
        logo2AlumniZone.style.display = "none";
        logo2UploadZone.style.display = "block";
    } else {
        logo2AlumniZone.style.display = "none";
        logo2UploadZone.style.display = "none";
    }
});

logo2AlumniSelect.addEventListener("change", () => {
    const val = logo2AlumniSelect.value;

    if (val === "__upload__") {
        logo2Source = null;
        document.getElementById("logoPreview2Alumni").style.backgroundImage = "";
        logo2UploadZone.style.display = "block";
        return;
    }

    if (val && ALUMNI_LOGOS[val]) {
        logo2Source = ALUMNI_LOGOS[val];
        logo2UploadZone.style.display = "none";
        document.getElementById("logoPreview2Alumni").style.backgroundImage =
            `url(${logo2Source})`;
    } else {
        logo2Source = null;
        logo2UploadZone.style.display = "none";
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

        logo2ZoomInput.value = 1;
        cropLogo2.setZoom(1);
    };
    reader.readAsDataURL(file);
});

logo2ZoomInput.addEventListener("input", (e) => {
    if (!cropLogo2) return;
    cropLogo2.setZoom(parseFloat(e.target.value));
});

function exportLogo2() {
    const type = logo2TypeSelect.value;

    if (type === "alumni") {
        const val = logo2AlumniSelect.value;
        if (val === "__upload__" && cropLogo2) {
            return cropLogo2
                .result({
                    type: "base64",
                    size: { width: 500, height: 300 },
                    format: "png"
                })
                .then((output) => {
                    logo2Source = output;
                    document.getElementById("logoPreview2").style.backgroundImage =
                        `url(${output})`;
                    return output;
                });
        } else {
            return Promise.resolve(logo2Source || null);
        }
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
    if (nbLogos === "0") {
        return "templates/FR/template_FR_nologo.png";
    }
    return "templates/FR/template_FR_white.png";
}


/* ------------------------------------------
   POSITIONNEMENT DES LOGOS DANS LA BANDE
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
   CONSTRUCTION DU VISUEL FINAL + APERÇU FLOU
-------------------------------------------*/
async function drawFinalCanvas() {
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    await exportPhoto();
    if (nbLogos !== "0") await exportLogo1();
    if (nbLogos === "2") await exportLogo2();

    if (!photoSource) {
        alert("Merci d’importer et de recadrer ta photo avant de générer ton visuel.");
        return;
    }

    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    const templatePath = getTemplatePath(nbLogos);
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, 1080, 1350);

    // Photo
    const photoImg = await loadImage(photoSource);

    ctx.save();
    ctx.beginPath();
    ctx.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(photoImg, PHOTO_X, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE);
    ctx.restore();

    // Logos
    if (nbLogos !== "0") {
        await placeLogosOnCanvas(nbLogos);
    }

// Aperçu miniature (net mais réduit)
const previewBase64 = finalCanvas.toDataURL("image/jpeg", 0.6);
previewImg.src = previewBase64;
previewImg.style.filter = "none";
previewImg.style.width = "320px";
previewImg.style.pointerEvents = "none";
previewImg.style.userSelect = "none";
previewImg.style.webkitUserDrag = "none";
previewImg.addEventListener("contextmenu", (e) => e.preventDefault());


    hasPreview = true;
    updateButtons();
}


/* ------------------------------------------
   PREVIEW & ENVOI
-------------------------------------------*/
document.getElementById("previewBtn").addEventListener("click", drawFinalCanvas);

document.getElementById("sendBtn").addEventListener("click", async () => {
    if (!hasPreview) {
        alert("Merci de générer d’abord un aperçu.");
        return;
    }

    const email = document.getElementById("email").value.trim();
    if (!email) {
        alert("Merci de renseigner ton e-mail.");
        return;
    }

    const fullname = document.getElementById("fullname").value.trim();
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    // Visuel HD pour Make (PNG plein format)
    const hdBase64 = finalCanvas.toDataURL("image/png");

    const payload = {
        email,
        fullname,
        nbLogos,
        logo1Type: logo1TypeSelect.value,
        logo2Type: logo2TypeSelect.value,
        logo1Alumni: logo1AlumniSelect.value || null,
        logo2Alumni: logo2AlumniSelect.value || null,
        image: hdBase64,
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(MAKE_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        alert(
            "Ton visuel a été généré. Tu vas recevoir un e-mail avec la version HD et des suggestions de texte pour ton post."
        );
    } catch (err) {
        console.error(err);
        alert("Une erreur est survenue lors de l’envoi. Merci de réessayer plus tard.");
    }
});


/* ------------------------------------------
   UX DE BASE
-------------------------------------------*/
document.getElementById("email").addEventListener("input", updateButtons);
document.getElementById("consent").addEventListener("change", updateButtons);

// Initialisation
updateButtons();
loadAlumniLogos();
