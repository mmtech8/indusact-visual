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
const PHOTO_X = 37;
const PHOTO_Y = 347;
const PHOTO_SIZE = 466;
const PHOTO_RADIUS = PHOTO_SIZE / 2;
const PHOTO_CENTER_X = PHOTO_X + PHOTO_RADIUS;
const PHOTO_CENTER_Y = PHOTO_Y + PHOTO_RADIUS;

// Bibliothèque alumni (à partir de data/alumni.json)
let ALUMNI_LOGOS = {};
let alumniList = [];

// Instances CropperJS
let cropPhoto = null;
let cropLogo1 = null;
let cropLogo2 = null;

// Sources finales (base64)
let photoSource = null;
let logo1Source = null;
let logo2Source = null;

// Canvas final (HD mais caché en UI)
const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

// Image d’aperçu
const previewImg = document.getElementById("previewImage");

// INIT APERÇU (IMPORTANT)
previewImg.src = "";
previewImg.style.display = "none";
previewImg.style.pointerEvents = "none";
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

        select.innerHTML = "";

        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "Choisissez votre association d’alumni";
        select.appendChild(emptyOpt);

        alumniList.forEach((a) => {
            const opt = document.createElement("option");
            opt.value = a.id;
            opt.textContent = a.name;
            select.appendChild(opt);
        });

        const uploadOpt = document.createElement("option");
        uploadOpt.value = "__upload__";
        uploadOpt.textContent =
            "Je n’ai pas trouvé mon association – j’importe mon logo";
        select.appendChild(uploadOpt);

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
   PHOTO : UPLOAD + RECADRAGE (CropperJS)
-------------------------------------------*/
const photoUploadInput = document.getElementById("photoUpload");

const photoCropImage = document.getElementById("photoCropImage");

photoUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        photoCropImage.onload = () => {
            if (cropPhoto) {
                cropPhoto.destroy();
            }

            cropPhoto = new Cropper(photoCropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 0.7,
                background: false,
                guides: false,
                center: true,
                highlight: false,
                cropBoxResizable: true,
                cropBoxMovable: true,
                zoomOnWheel: true,
                zoomOnTouch: true,
                ready() {
                    this.cropper.center();
                },
                zoom(event) {
                    const cropper = this.cropper;
                    const imageData = cropper.getImageData();
                    const cropBoxData = cropper.getCropBoxData();

                    // Empêche l’image de devenir plus petite que le cercle
                    if (
                        imageData.width < cropBoxData.width ||
                        imageData.height < cropBoxData.height
                    ) {
                        event.preventDefault();
                        cropper.zoomTo(imageData.oldRatio || imageData.ratio);
                    } else {
                        imageData.oldRatio = imageData.ratio;
                        requestAnimationFrame(() => {
                            cropper.center();
                        });
                    }
                }
            });

            updateButtons();
        };

        photoCropImage.src = event.target.result;
    };

    reader.readAsDataURL(file);

});

function exportPhoto() {
    if (!cropPhoto) return null;

    const canvas = cropPhoto.getCroppedCanvas({
        width: PHOTO_SIZE,
        height: PHOTO_SIZE
    });

    photoSource = canvas.toDataURL("image/png");
    return photoSource;
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
const logoCropImage1 = document.getElementById("logoCropImage1");

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

previewImg.addEventListener("contextmenu", (e) => {
    e.preventDefault();
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
        // 1️⃣ On nettoie l'ancien handler (sécurité)
        logoCropImage1.onload = null;
        logoCropImage1.onload = () => {
            if (cropLogo1) {
                cropLogo1.destroy();
            }

            cropLogo1 = new Cropper(logoCropImage1, {
                aspectRatio: 5 / 3,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                background: false,
                guides: false,
                movable: true,
                zoomOnWheel: true
            });
        };

        logoCropImage1.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

logo1ZoomInput.addEventListener("input", (e) => {
    if (!cropLogo1) return;
    const zoom = parseFloat(e.target.value);
    cropLogo1.zoomTo(zoom);
});

function exportLogo1() {
    const type = logo1TypeSelect.value;
    if (logo1TypeSelect.value === "other" && !cropLogo1) {
        return Promise.resolve(null);
    }

    if (type === "alumni") {
        const val = logo1AlumniSelect.value;
        if (val === "__upload__" && cropLogo1) {
            const canvas = cropLogo1.getCroppedCanvas({
                width: 500,
                height: 300
            });
            const output = canvas.toDataURL("image/png");
            logo1Source = output;
            document.getElementById("logoPreview1").style.backgroundImage =
                `url(${output})`;
            return Promise.resolve(output);
        } else {
            return Promise.resolve(logo1Source || null);
        }
    }

    if (type === "other" && cropLogo1) {
        const canvas = cropLogo1.getCroppedCanvas({
            width: 500,
            height: 300
        });
        const output = canvas.toDataURL("image/png");
        logo1Source = output;
        document.getElementById("logoPreview1").style.backgroundImage =
            `url(${output})`;
        return Promise.resolve(output);
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
const logoCropImage2 = document.getElementById("logoCropImage2");

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
               // 1️⃣ On nettoie l'ancien handler (sécurité)
        logoCropImage2.onload = null;
        logoCropImage2.onload = () => {
            if (cropLogo2) cropLogo2.destroy();

            cropLogo2 = new Cropper(logoCropImage2, {
                aspectRatio: 5 / 3,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                background: false,
                guides: false,
                movable: true,
                zoomOnWheel: true
            });
        };

        logoCropImage2.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

logo2ZoomInput.addEventListener("input", (e) => {
    if (!cropLogo2) return;
    const zoom = parseFloat(e.target.value);
    cropLogo2.zoomTo(zoom);
});

function exportLogo2() {
    const type = logo2TypeSelect.value;
    if (logo2TypeSelect.value === "other" && !cropLogo2) {
        alert("Merci de recadrer le logo avant de continuer.");
        return Promise.resolve(null);
    }


    if (type === "alumni") {
        const val = logo2AlumniSelect.value;
        if (val === "__upload__" && cropLogo2) {
            const canvas = cropLogo2.getCroppedCanvas({
                width: 500,
                height: 300
            });
            const output = canvas.toDataURL("image/png");
            logo2Source = output;
            document.getElementById("logoPreview2").style.backgroundImage =
                `url(${output})`;
            return Promise.resolve(output);
        } else {
            return Promise.resolve(logo2Source || null);
        }
    }

    if (type === "other" && cropLogo2) {
        const canvas = cropLogo2.getCroppedCanvas({
            width: 500,
            height: 300
        });
        const output = canvas.toDataURL("image/png");
        logo2Source = output;
        document.getElementById("logoPreview2").style.backgroundImage =
            `url(${output})`;
        return Promise.resolve(output);
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
   CONSTRUCTION DU VISUEL FINAL + APERÇU
-------------------------------------------*/
async function drawFinalCanvas() {
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

    // 1️⃣ On récupère la photo recadrée
    exportPhoto();

    // 2️⃣ Sécurité : si pas de photo, on stoppe
    if (!photoSource) {
        alert(
            "Merci d’importer et de recadrer votre photo avant de générer votre visuel."
        );
        return;
    }

    // 3️⃣ Logos (si besoin)
    if (nbLogos !== "0") exportLogo1();
    if (nbLogos === "2") exportLogo2();


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

    // Aperçu réduit (net, mais petite taille)
    const previewBase64 = finalCanvas.toDataURL("image/jpeg", 0.6);
    previewImg.src = previewBase64;
    previewImg.style.display = "block";
    previewImg.style.pointerEvents = "none";


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
        alert("Merci de renseigner votre adresse e-mail.");
        return;
    }

    const fullname = document.getElementById("fullname").value.trim();
    const nbLogos = document.querySelector("input[name='nbLogos']:checked").value;

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
            "Votre visuel a été généré. Vous allez recevoir un e-mail avec la version HD et des suggestions de texte pour votre post."
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
