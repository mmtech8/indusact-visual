/* ------------------------------------------
   CONFIG GLOBALE
-------------------------------------------*/

// Webhook Make — à personnaliser
const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/7rlulwhyngfc6aremee3pdgv3ah4ovvn";

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

// Progressive disclosure flags
let photoSectionShown = false;
let logosSectionShown = false;
let previewSectionShown = false;

// Canvas final
const finalCanvas = document.getElementById("finalCanvas");
const ctx = finalCanvas.getContext("2d");

// Image d’aperçu
const previewImg = document.getElementById("previewImage");
previewImg.src = "";
previewImg.style.display = "none";
previewImg.style.pointerEvents = "none";

let hasPreview = false;

const confirmPhotoBtn = document.getElementById("confirmPhotoBtn");
confirmPhotoBtn.disabled = true;


/* ------------------------------------------
   PROGRESSIVE DISCLOSURE
-------------------------------------------*/

function showSection(id) {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.classList.contains("section-hidden")) {
        el.classList.remove("section-hidden");
        el.classList.add("section-visible");
    }
}

function hideSection(id) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("section-visible");
    el.classList.add("section-hidden");
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const yOffset = -12;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({
        top: y,
        behavior: "smooth"
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* ------------------------------------------
   UTILITAIRES
-------------------------------------------*/

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/*
   Gère les aperçus logos.

   - Pour les aperçus alumni :
     le CSS doit masquer .alumni-preview par défaut
     et afficher .alumni-preview.has-image.

   - Pour les aperçus d’import :
     le CSS garde .logo-preview visible par défaut,
     même vide, pour montrer le format attendu.
*/
function setLogoPreview(previewId, src) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    if (src) {
        preview.style.backgroundImage = `url(${src})`;
        preview.classList.add("has-image");
    } else {
        preview.style.backgroundImage = "";
        preview.classList.remove("has-image");
    }
}

function resetLogoUploadUI(index) {
    const uploadInput = document.getElementById(`logoUpload${index}`);
    const cropImage = document.getElementById(`logoCropImage${index}`);
    const confirmBtn = document.getElementById(`confirmLogo${index}Btn`);

    if (index === 1 && cropLogo1) {
        cropLogo1.destroy();
        cropLogo1 = null;
    }

    if (index === 2 && cropLogo2) {
        cropLogo2.destroy();
        cropLogo2 = null;
    }

    if (uploadInput) uploadInput.value = "";
    if (cropImage) cropImage.removeAttribute("src");
    if (confirmBtn) confirmBtn.disabled = true;

    // On vide l’image du cadre importé, mais le cadre reste visible via CSS.
    setLogoPreview(`logoPreview${index}`, null);
}


/* ------------------------------------------
   CHARGEMENT ALUMNI.JSON
-------------------------------------------*/

async function loadAlumniLogos() {
    try {
        const response = await fetch("data/alumni.json", { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Impossible de charger data/alumni.json - statut ${response.status}`);
        }

        const data = await response.json();
        alumniList = data.alumni || [];

        ALUMNI_LOGOS = alumniList.reduce((acc, item) => {
            acc[item.id] = item.logo;
            return acc;
        }, {});

        populateAlumniSelects();
        console.log(`${alumniList.length} associations d’alumni chargées.`);
    } catch (err) {
        console.error("Erreur lors du chargement de data/alumni.json :", err);

        ["logo1Alumni", "logo2Alumni"].forEach((id) => {
            const select = document.getElementById(id);
            if (!select) return;

            select.innerHTML = "";

            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Liste indisponible — importez votre logo";
            select.appendChild(opt);
        });
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
        uploadOpt.textContent = "Je n’ai pas trouvé mon association – j’importe mon logo";
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
    const emailValid = isValidEmail(email);
    const consent = document.getElementById("consent").checked;

    const previewBtn = document.getElementById("previewBtn");
    const sendBtn = document.getElementById("sendBtn");
    const firstname = document.getElementById("firstname").value.trim();
    const lastname = document.getElementById("lastname").value.trim();

    const emailError = document.getElementById("emailError");
    const emailInput = document.getElementById("email");

    const canShowPhoto =
        firstname &&
        lastname &&
        email &&
        emailValid &&
        consent;

    if (email && !emailValid) {
        emailInput.classList.add("invalid");
        emailError.style.display = "block";
    } else {
        emailInput.classList.remove("invalid");
        emailError.style.display = "none";
    }

    if (!consent) {
        hideSection("photoSection");
        hideSection("logosSection");
        hideSection("previewSection");

        photoSectionShown = false;
        logosSectionShown = false;
        previewSectionShown = false;

        photoSource = null;
        logo1Source = null;
        logo2Source = null;
        hasPreview = false;

        confirmPhotoBtn.disabled = true;
        previewBtn.disabled = true;
        sendBtn.disabled = true;

        return;
    }

    if (canShowPhoto) {
        if (!photoSectionShown) {
            showSection("photoSection");
            photoSectionShown = true;
        }
    } else {
        hideSection("photoSection");
        hideSection("logosSection");
        hideSection("previewSection");

        photoSectionShown = false;
        logosSectionShown = false;
        previewSectionShown = false;

        photoSource = null;
        logo1Source = null;
        logo2Source = null;
        hasPreview = false;

        confirmPhotoBtn.disabled = true;
    }

    previewBtn.disabled = !(
        canShowPhoto &&
        photoSource &&
        areLogosReady()
    );

    sendBtn.disabled = !hasPreview;
}


/* ------------------------------------------
   PHOTO : UPLOAD + RECADRAGE
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

            confirmPhotoBtn.disabled = true;
            photoSource = null;
            hasPreview = false;

            cropPhoto = new Cropper(photoCropImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 0.75,
                background: false,
                guides: false,
                center: true,
                highlight: false,
                cropBoxResizable: true,
                cropBoxMovable: true,
                zoomOnWheel: true,
                zoomOnTouch: true,
                wheelZoomRatio: 0.08,
                ready() {
                    confirmPhotoBtn.disabled = false;
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
    hasPreview = false;

    if (!logosSectionShown) {
        showSection("logosSection");
        scrollToSection("logosSection");
        logosSectionShown = true;
    }

    return photoSource;
}

confirmPhotoBtn.addEventListener("click", () => {
    if (!cropPhoto) return;

    exportPhoto();
    confirmPhotoBtn.disabled = true;
    updateButtons();
});


/* ------------------------------------------
   NB DE LOGOS
-------------------------------------------*/

function syncLogoSections() {
    const value =
        document.querySelector("input[name='nbLogos']:checked")?.value || "1";

    document.getElementById("logo1Section").style.display =
        value === "1" || value === "2" ? "block" : "none";

    document.getElementById("logo2Section").style.display =
        value === "2" ? "block" : "none";

    hasPreview = false;
    updateButtons();
}

document.querySelectorAll("input[name='nbLogos']").forEach((radio) => {
    radio.addEventListener("change", syncLogoSections);
});


/* ------------------------------------------
   LOGO 1 : TYPE & ALUMNI
-------------------------------------------*/

const logo1TypeSelect = document.getElementById("logo1Type");
const logo1AlumniZone = document.getElementById("logo1AlumniZone");
const logo1UploadZone = document.getElementById("logo1UploadZone");
const logo1AlumniSelect = document.getElementById("logo1Alumni");
const logoCropImage1 = document.getElementById("logoCropImage1");
const confirmLogo1Btn = document.getElementById("confirmLogo1Btn");

confirmLogo1Btn.disabled = true;

logo1TypeSelect.addEventListener("change", () => {
    const type = logo1TypeSelect.value;

    logo1Source = null;
    hasPreview = false;

    setLogoPreview("logoPreview1", null);
    setLogoPreview("logoPreview1Alumni", null);
    resetLogoUploadUI(1);

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

    confirmLogo1Btn.disabled = true;
    updateButtons();
});

previewImg.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

logo1AlumniSelect.addEventListener("change", () => {
    const val = logo1AlumniSelect.value;

    logo1Source = null;
    hasPreview = false;

    if (val === "__upload__") {
        setLogoPreview("logoPreview1Alumni", null);
        resetLogoUploadUI(1);
        logo1UploadZone.style.display = "block";
        updateButtons();
        return;
    }

    if (val && ALUMNI_LOGOS[val]) {
        logo1Source = ALUMNI_LOGOS[val];

        resetLogoUploadUI(1);
        logo1UploadZone.style.display = "none";
        setLogoPreview("logoPreview1Alumni", logo1Source);

        updateButtons();
        return;
    }

    resetLogoUploadUI(1);
    logo1UploadZone.style.display = "none";
    setLogoPreview("logoPreview1Alumni", null);

    updateButtons();
});

document.getElementById("logoUpload1").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    logo1Source = null;
    hasPreview = false;
    setLogoPreview("logoPreview1", null);

    const reader = new FileReader();

    reader.onload = (event) => {
        logoCropImage1.onload = () => {
            if (cropLogo1) {
                cropLogo1.destroy();
            }

            confirmLogo1Btn.disabled = true;

            cropLogo1 = new Cropper(logoCropImage1, {
                aspectRatio: 5 / 3,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                background: false,
                guides: false,
                movable: true,
                zoomOnWheel: true,
                ready() {
                    confirmLogo1Btn.disabled = false;
                }
            });
        };

        logoCropImage1.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

confirmLogo1Btn.addEventListener("click", () => {
    if (!cropLogo1) return;

    const canvas = cropLogo1.getCroppedCanvas({
        width: 500,
        height: 300
    });

    logo1Source = canvas.toDataURL("image/png");
    hasPreview = false;

    setLogoPreview("logoPreview1", logo1Source);

    confirmLogo1Btn.disabled = true;
    updateButtons();
});

function exportLogo1() {
    const type = logo1TypeSelect.value;

    if (type === "other" && !cropLogo1) {
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
            setLogoPreview("logoPreview1", output);

            return Promise.resolve(output);
        }

        return Promise.resolve(logo1Source || null);
    }

    if (type === "other" && cropLogo1) {
        const canvas = cropLogo1.getCroppedCanvas({
            width: 500,
            height: 300
        });

        const output = canvas.toDataURL("image/png");
        logo1Source = output;
        setLogoPreview("logoPreview1", output);
        updateButtons();

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
const logoCropImage2 = document.getElementById("logoCropImage2");
const confirmLogo2Btn = document.getElementById("confirmLogo2Btn");

confirmLogo2Btn.disabled = true;

logo2TypeSelect.addEventListener("change", () => {
    const type = logo2TypeSelect.value;

    logo2Source = null;
    hasPreview = false;

    setLogoPreview("logoPreview2", null);
    setLogoPreview("logoPreview2Alumni", null);
    resetLogoUploadUI(2);

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

    confirmLogo2Btn.disabled = true;
    updateButtons();
});

logo2AlumniSelect.addEventListener("change", () => {
    const val = logo2AlumniSelect.value;

    logo2Source = null;
    hasPreview = false;

    if (val === "__upload__") {
        setLogoPreview("logoPreview2Alumni", null);
        resetLogoUploadUI(2);
        logo2UploadZone.style.display = "block";
        updateButtons();
        return;
    }

    if (val && ALUMNI_LOGOS[val]) {
        logo2Source = ALUMNI_LOGOS[val];

        resetLogoUploadUI(2);
        logo2UploadZone.style.display = "none";
        setLogoPreview("logoPreview2Alumni", logo2Source);

        updateButtons();
        return;
    }

    resetLogoUploadUI(2);
    logo2UploadZone.style.display = "none";
    setLogoPreview("logoPreview2Alumni", null);

    updateButtons();
});

document.getElementById("logoUpload2").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    logo2Source = null;
    hasPreview = false;
    setLogoPreview("logoPreview2", null);

    const reader = new FileReader();

    reader.onload = (event) => {
        logoCropImage2.onload = () => {
            if (cropLogo2) {
                cropLogo2.destroy();
            }

            confirmLogo2Btn.disabled = true;

            cropLogo2 = new Cropper(logoCropImage2, {
                aspectRatio: 5 / 3,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
                background: false,
                guides: false,
                movable: true,
                zoomOnWheel: true,
                ready() {
                    confirmLogo2Btn.disabled = false;
                }
            });
        };

        logoCropImage2.src = event.target.result;
    };

    reader.readAsDataURL(file);
});

confirmLogo2Btn.addEventListener("click", () => {
    if (!cropLogo2) return;

    const canvas = cropLogo2.getCroppedCanvas({
        width: 500,
        height: 300
    });

    logo2Source = canvas.toDataURL("image/png");
    hasPreview = false;

    setLogoPreview("logoPreview2", logo2Source);

    confirmLogo2Btn.disabled = true;
    updateButtons();
});

function exportLogo2() {
    const type = logo2TypeSelect.value;

    if (type === "other" && !cropLogo2) {
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
            setLogoPreview("logoPreview2", output);

            return Promise.resolve(output);
        }

        return Promise.resolve(logo2Source || null);
    }

    if (type === "other" && cropLogo2) {
        const canvas = cropLogo2.getCroppedCanvas({
            width: 500,
            height: 300
        });

        const output = canvas.toDataURL("image/png");
        logo2Source = output;
        setLogoPreview("logoPreview2", output);
        updateButtons();

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

    if (logo1Source) {
        logos.push(await loadImage(logo1Source));
    }

    if (nbLogos === "2" && logo2Source) {
        logos.push(await loadImage(logo2Source));
    }

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

function areLogosReady() {
    const nbLogos =
        document.querySelector("input[name='nbLogos']:checked")?.value;

    if (!nbLogos) return false;

    if (nbLogos === "0") {
        return true;
    }

    if (nbLogos === "1") {
        return Boolean(logo1Source);
    }

    if (nbLogos === "2") {
        return Boolean(logo1Source && logo2Source);
    }

    return false;
}


/* ------------------------------------------
   CONSTRUCTION DU VISUEL FINAL + APERÇU
-------------------------------------------*/

async function drawFinalCanvas() {
    const nbLogos =
        document.querySelector("input[name='nbLogos']:checked").value;

    if (!photoSource) {
        alert("Merci d’importer et de recadrer votre photo avant de générer votre visuel.");
        return;
    }

    if (!areLogosReady()) {
        alert("Merci de sélectionner ou d’importer le logo demandé avant de générer votre visuel.");
        return;
    }

    if (!previewSectionShown) {
        showSection("previewSection");
        scrollToSection("previewSection");
        previewSectionShown = true;
    }

    ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);

    const templatePath = getTemplatePath(nbLogos);
    const template = await loadImage(templatePath);

    ctx.drawImage(template, 0, 0, 1080, 1350);

    const photoImg = await loadImage(photoSource);

    ctx.save();
    ctx.beginPath();
    ctx.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(photoImg, PHOTO_X, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE);
    ctx.restore();

    if (nbLogos !== "0") {
        await placeLogosOnCanvas(nbLogos);
    }

    const previewBase64 = finalCanvas.toDataURL("image/jpeg", 0.6);

    previewImg.src = previewBase64;
    previewImg.style.display = "block";
    previewImg.style.pointerEvents = "none";

    showSection("previewSection");
    scrollToSection("previewSection");

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

    const nbLogos =
        document.querySelector("input[name='nbLogos']:checked").value;

    const hdBase64 = finalCanvas.toDataURL("image/png");
    const firstname = document.getElementById("firstname").value.trim();
    const lastname = document.getElementById("lastname").value.trim();

    const payload = {
        email,
        firstname,
        lastname,
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
document.getElementById("firstname").addEventListener("input", updateButtons);
document.getElementById("lastname").addEventListener("input", updateButtons);
document.getElementById("consent").addEventListener("change", updateButtons);

document.getElementById("photoSection")?.classList.add("section-hidden");
document.getElementById("logosSection")?.classList.add("section-hidden");
document.getElementById("previewSection")?.classList.add("section-hidden");

// Initialisation
syncLogoSections();
loadAlumniLogos();
