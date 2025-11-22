// ------------------------
// CONFIG DE BASE
// ------------------------

// ⛔️ À REMPLACER par ton vrai webhook Make
const MAKE_WEBHOOK_URL = "https://hook.integromat.com/TON_WEBHOOK_ICI";

// Dimensions de la photo croppée envoyée à Make
const CROPPED_SIZE = 800;

// ------------------------
// RÉFÉRENCES DOM
// ------------------------

const emailInput = document.getElementById("email");
const fullnameInput = document.getElementById("fullname");
const logoCountRadios = document.querySelectorAll("input[name='logoCount']");

const logosSection = document.getElementById("logosSection");
const logo2Block = document.getElementById("logo2Block");

const typeLogo1Select = document.getElementById("typeLogo1");
const logo1AlumniList = document.getElementById("logo1AlumniList");
const logo1AlumniSelect = document.getElementById("logo1Alumni");
const logo1UploadBlock = document.getElementById("logo1Upload");
const logo1FileInput = document.getElementById("logo1File");
const logoPreview1Canvas = document.getElementById("logoPreview1");

const typeLogo2Select = document.getElementById("typeLogo2");
const logo2AlumniList = document.getElementById("logo2AlumniList");
const logo2AlumniSelect = document.getElementById("logo2Alumni");
const logo2UploadBlock = document.getElementById("logo2Upload");
const logo2FileInput = document.getElementById("logo2File");
const logoPreview2Canvas = document.getElementById("logoPreview2");

const uploadBtn = document.getElementById("uploadBtn");
const photoInput = document.getElementById("photoInput");
const cropArea = document.getElementById("cropArea");
const circlePreview = document.getElementById("circlePreview");

const consentCheckbox = document.getElementById("consent");
const generateBtn = document.getElementById("generateBtn");

// ------------------------
// ÉTAT GLOBAL
// ------------------------

let cropper = null;
let croppedImageDataUrl = null;

let alumniList = []; // chargé depuis alumni.json

let logo1Data = { type: null, alumniId: null, alumniName: null, dataUrl: null };
let logo2Data = { type: null, alumniId: null, alumniName: null, dataUrl: null };

// ------------------------
// INIT
// ------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Charger la liste des alumni
  loadAlumniList();

  // Gestion du nombre de logos
  logoCountRadios.forEach((radio) => {
    radio.addEventListener("change", onLogoCountChange);
  });

  // Type d’organisation par logo
  typeLogo1Select.addEventListener("change", () =>
    onLogoTypeChange(1, typeLogo1Select.value)
  );
  typeLogo2Select.addEventListener("change", () =>
    onLogoTypeChange(2, typeLogo2Select.value)
  );

  // Sélection logo alumni
  logo1AlumniSelect.addEventListener("change", () =>
    onAlumniLogoSelected(1, logo1AlumniSelect.value)
  );
  logo2AlumniSelect.addEventListener("change", () =>
    onAlumniLogoSelected(2, logo2AlumniSelect.value)
  );

  // Upload logos
  logo1FileInput.addEventListener("change", () =>
    onLogoFileSelected(1, logo1FileInput.files[0])
  );
  logo2FileInput.addEventListener("change", () =>
    onLogoFileSelected(2, logo2FileInput.files[0])
  );

  // Upload photo
  uploadBtn.addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", onPhotoSelected);

  // Consentement / email => activer bouton
  emailInput.addEventListener("input", updateGenerateButtonState);
  consentCheckbox.addEventListener("change", updateGenerateButtonState);

  // Génération
  generateBtn.addEventListener("click", onGenerateClicked);
});

// ------------------------
// CHARGEMENT ALUMNI
// ------------------------

async function loadAlumniList() {
  try {
    const res = await fetch("alumni.json");
    if (!res.ok) throw new Error("Erreur chargement alumni.json");
    alumniList = await res.json();

    // Peupler les deux listes
    fillAlumniSelect(logo1AlumniSelect, alumniList);
    fillAlumniSelect(logo2AlumniSelect, alumniList);
  } catch (e) {
    console.error("Impossible de charger alumni.json", e);
    // En cas de problème, on laisse les listes vides
  }
}

function fillAlumniSelect(selectEl, list) {
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Sélectionner…";
  selectEl.appendChild(placeholder);

  list.forEach((al) => {
    const opt = document.createElement("option");
    opt.value = al.id || al.name;
    opt.textContent = al.name;
    opt.dataset.file = al.file || "";
    selectEl.appendChild(opt);
  });
}

// ------------------------
// GESTION NOMBRE DE LOGOS
// ------------------------

function onLogoCountChange() {
  const count = getLogoCount();

  if (count === 0) {
    logosSection.classList.add("hidden");
  } else {
    logosSection.classList.remove("hidden");
  }

  if (count === 2) {
    logo2Block.classList.remove("hidden");
  } else {
    logo2Block.classList.add("hidden");
    // reset logo2Data si on repasse à 0 ou 1
    logo2Data = { type: null, alumniId: null, alumniName: null, dataUrl: null };
    clearCanvas(logoPreview2Canvas);
  }

  updateGenerateButtonState();
}

function getLogoCount() {
  const selected = Array.from(logoCountRadios).find((r) => r.checked);
  return selected ? parseInt(selected.value, 10) : 0;
}

// ------------------------
// TYPE D’ORGANISATION PAR LOGO
// ------------------------

function onLogoTypeChange(logoIndex, type) {
  const isAlumni = type === "alumni";

  if (logoIndex === 1) {
    logo1AlumniList.classList.toggle("hidden", !isAlumni);
    logo1UploadBlock.classList.toggle("hidden", isAlumni);
    logo1Data = { type, alumniId: null, alumniName: null, dataUrl: null };
    clearCanvas(logoPreview1Canvas);
  } else {
    logo2AlumniList.classList.toggle("hidden", !isAlumni);
    logo2UploadBlock.classList.toggle("hidden", isAlumni);
    logo2Data = { type, alumniId: null, alumniName: null, dataUrl: null };
    clearCanvas(logoPreview2Canvas);
  }
}

// ------------------------
// LOGOS ALUMNI (BIBLIOTHÈQUE)
// ------------------------

function onAlumniLogoSelected(logoIndex, alumniId) {
  const list = alumniList || [];
  const found = list.find((al) => (al.id || al.name) === alumniId);
  if (!found) return;

  const path = found.file; // ex: "logos/alumni/ax.png"

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    if (logoIndex === 1) {
      drawLogoOnCanvas(logoPreview1Canvas, img);
      logo1Data = {
        type: "alumni",
        alumniId: alumniId,
        alumniName: found.name,
        dataUrl: null, // pas besoin, côté Make on a le path
      };
    } else {
      drawLogoOnCanvas(logoPreview2Canvas, img);
      logo2Data = {
        type: "alumni",
        alumniId: alumniId,
        alumniName: found.name,
        dataUrl: null,
      };
    }
  };
  img.onerror = (e) => console.error("Erreur chargement logo alumni", e);
  img.src = path;
}

// ------------------------
// LOGOS UPLOAD
// ------------------------

function onLogoFileSelected(logoIndex, file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      if (logoIndex === 1) {
        drawLogoOnCanvas(logoPreview1Canvas, img);
        logo1Data = {
          type: "upload",
          alumniId: null,
          alumniName: null,
          dataUrl: e.target.result, // base64 du logo
        };
      } else {
        drawLogoOnCanvas(logoPreview2Canvas, img);
        logo2Data = {
          type: "upload",
          alumniId: null,
          alumniName: null,
          dataUrl: e.target.result,
        };
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawLogoOnCanvas(canvas, img) {
  const ctx = canvas.getContext("2d");
  const width = 380;
  const height = 120; // bande rectangulaire
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // on garde les proportions du logo
  const ratio = Math.min(width / img.width, height / img.height);
  const drawWidth = img.width * ratio;
  const drawHeight = img.height * ratio;
  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ------------------------
// PHOTO + CROPPER
// ------------------------

function onPhotoSelected() {
  const file = photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    // Clear cropArea
    cropArea.innerHTML = "";
    const img = document.createElement("img");
    img.id = "photoToCrop";
    img.src = e.target.result;
    cropArea.appendChild(img);

    // Détruire l’ancien cropper si besoin
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    cropper = new Cropper(img, {
      aspectRatio: 1,
      viewMode: 2,
      background: false,
      autoCropArea: 1,
      dragMode: "move",
      movable: true,
      zoomable: true,
      responsive: true,
      minCropBoxWidth: 100,
      minCropBoxHeight: 100,
      ready() {
        updateCroppedPreview();
      },
      crop() {
        updateCroppedPreview();
      },
    });
  };

  reader.readAsDataURL(file);
}

function updateCroppedPreview() {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas({
    width: CROPPED_SIZE,
    height: CROPPED_SIZE,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  if (!canvas) return;

  croppedImageDataUrl = canvas.toDataURL("image/png");
  circlePreview.style.backgroundImage = `url(${croppedImageDataUrl})`;

  updateGenerateButtonState();
}

// ------------------------
// GESTION BOUTON "GÉNÉRER"
// ------------------------

function updateGenerateButtonState() {
  const emailOk = emailInput.value.trim().length > 0;
  const consentOk = consentCheckbox.checked;
  const photoOk = !!croppedImageDataUrl;

  const enable = emailOk && consentOk && photoOk;
  generateBtn.disabled = !enable;
}

// ------------------------
// GÉNÉRATION + ENVOI VERS MAKE
// ------------------------

async function onGenerateClicked() {
  if (generateBtn.disabled) return;

  const email = emailInput.value.trim();
  const fullname = fullnameInput.value.trim();
  const logoCount = getLogoCount();

  if (!email || !croppedImageDataUrl || !consentCheckbox.checked) {
    alert("Merci de remplir l’e-mail, d’ajouter ta photo et de cocher le consentement.");
    return;
  }

  const template = logoCount === 0 ? "sans_bande" : "avec_bande";

  const payload = {
    email,
    fullname: fullname || null,
    logoCount,
    template,
    logos: {
      logo1: logoCount >= 1 ? logo1Data : null,
      logo2: logoCount === 2 ? logo2Data : null,
    },
    photoBase64: croppedImageDataUrl,
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };

  generateBtn.disabled = true;
  generateBtn.textContent = "Génération en cours…";

  try {
    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Erreur API Make : " + res.status);
    }

    alert("Merci ! Ton visuel sera envoyé par e-mail dans quelques instants.");
  } catch (e) {
    console.error(e);
    alert("Un problème est survenu lors de l’envoi. Merci de réessayer plus tard.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Générer mon visuel";
  }
}

function generateToken() {
  return (
    "tok_" +
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}
