// URL du webhook Make (à renseigner plus tard)
const MAKE_WEBHOOK_URL = null; // ex: "https://hook.eu1.make.com/TON_WEBHOOK_ID"

// Données alumni chargées dynamiquement
let ALUMNI_DATA = {};

// Références DOM
const emailInput = document.getElementById("email");
const fullnameInput = document.getElementById("fullname");
const logoCountRadios = document.querySelectorAll("input[name='logoCount']");
const logo1Card = document.getElementById("logo1Card");
const logo2Card = document.getElementById("logo2Card");

const logo1Type = document.getElementById("logo1Type");
const logo2Type = document.getElementById("logo2Type");

const logo1AlumniBlock = document.getElementById("logo1AlumniBlock");
const logo1AlumniSelect = document.getElementById("logo1Alumni");
const logo1AlumniSearch = document.getElementById("logo1AlumniSearch");
const logo1AlumniFile = document.getElementById("logo1AlumniFile");
const logo1OrgBlock = document.getElementById("logo1OrgBlock");
const logo1File = document.getElementById("logo1File");

const logo2AlumniBlock = document.getElementById("logo2AlumniBlock");
const logo2AlumniSelect = document.getElementById("logo2Alumni");
const logo2AlumniSearch = document.getElementById("logo2AlumniSearch");
const logo2AlumniFile = document.getElementById("logo2AlumniFile");
const logo2OrgBlock = document.getElementById("logo2OrgBlock");
const logo2File = document.getElementById("logo2File");

const bandSection = document.querySelector(".band-section");
const bandLogo1 = document.getElementById("bandLogo1");
const bandLogo2 = document.getElementById("bandLogo2");

const consentCheckbox = document.getElementById("consent");
const photoFileInput = document.getElementById("photoFile");
const photoPreview = document.getElementById("photoPreview");
const generateBtn = document.getElementById("generateBtn");
const statusMsg = document.getElementById("statusMsg");

const cropModalBackdrop = document.getElementById("cropModalBackdrop");
const cropModalTitle = document.getElementById("cropModalTitle");
const cropImage = document.getElementById("cropImage");
const cropCancelBtn = document.getElementById("cropCancelBtn");
const cropValidateBtn = document.getElementById("cropValidateBtn");

// État en mémoire
const STATE = {
  cropper: null,
  currentCropTarget: null, // "photo" | "logo1" | "logo2"
  currentAspect: null,
  photoDataUrl: null,
  logo1DataUrl: null,
  logo2DataUrl: null,
  photoBase64: null,
  logo1Base64: null,
  logo2Base64: null,
};

// Helpers
function dataUrlToBase64(dataUrl) {
  if (!dataUrl) return null;
  const parts = dataUrl.split(",");
  return parts.length === 2 ? parts[1] : null;
}

function getLogoCount() {
  const selected = Array.from(logoCountRadios).find((r) => r.checked);
  return selected ? parseInt(selected.value, 10) : 0;
}

function updateGenerateButtonState() {
  const emailOk = emailInput.value.trim() !== "";
  const consentOk = consentCheckbox.checked;
  const photoOk = !!STATE.photoBase64;
  generateBtn.disabled = !(emailOk && consentOk && photoOk);
}

// Met à jour l’aperçu de la bande blanche
function updateBandPreview() {
  const count = getLogoCount();

  // Si aucun logo → on cache
  if (
    count === 0 ||
    (!STATE.logo1DataUrl && !STATE.logo2DataUrl)
  ) {
    bandSection.style.display = "none";
    bandLogo1.classList.remove("visible");
    bandLogo2.classList.remove("visible");
    return;
  }

  bandSection.style.display = "block";

  if (STATE.logo1DataUrl) {
    bandLogo1.src = STATE.logo1DataUrl;
    bandLogo1.classList.add("visible");
  } else {
    bandLogo1.classList.remove("visible");
  }

  if (STATE.logo2DataUrl) {
    bandLogo2.src = STATE.logo2DataUrl;
    bandLogo2.classList.add("visible");
  } else {
    bandLogo2.classList.remove("visible");
  }
}

// Recadrage
function openCropModal(file, target, aspectRatio, title) {
  const reader = new FileReader();
  reader.onload = (e) => {
    cropImage.src = e.target.result;

    if (STATE.cropper) {
      STATE.cropper.destroy();
      STATE.cropper = null;
    }

    STATE.currentCropTarget = target;
    STATE.currentAspect = aspectRatio || NaN;

    cropModalTitle.textContent = title || "Recadrage";

    const cropArea = document.querySelector(".modal-crop-area");
    if (target === "photo") {
      cropArea.classList.add("circle-mask");
    } else {
      cropArea.classList.remove("circle-mask");
    }

    cropModalBackdrop.classList.remove("modal-hidden");

    setTimeout(() => {
      STATE.cropper = new Cropper(cropImage, {
        aspectRatio: STATE.currentAspect,
        viewMode: 1,
        background: false,
        autoCropArea: 1,
        dragMode: "move",
      });
    }, 50);
  };
  reader.readAsDataURL(file);
}

function closeCropModal() {
  if (STATE.cropper) {
    STATE.cropper.destroy();
    STATE.cropper = null;
  }
  STATE.currentCropTarget = null;
  cropModalBackdrop.classList.add("modal-hidden");
}

// Gestion du nombre de logos
logoCountRadios.forEach((r) => {
  r.addEventListener("change", () => {
    const count = getLogoCount();
    if (count === 0) {
      logo1Card.style.display = "none";
      logo2Card.style.display = "none";
    } else if (count === 1) {
      logo1Card.style.display = "block";
      logo2Card.style.display = "none";
    } else {
      logo1Card.style.display = "block";
      logo2Card.style.display = "block";
    }
    updateBandPreview();
  });
});

// Type logo 1 / 2
function handleLogoTypeChange(selectEl, alumniBlock, orgBlock, alumniSelect, alumniFileInput, logoIndex) {
  selectEl.addEventListener("change", () => {
    const value = selectEl.value;
    alumniBlock.style.display = value === "alumni" ? "block" : "none";
    orgBlock.style.display = value === "organisation" ? "block" : "none";

    if (value !== "alumni") {
      alumniSelect.value = "";
      alumniFileInput.value = "";
    }
    if (value !== "organisation") {
      if (logoIndex === 1) logo1File.value = "";
      if (logoIndex === 2) logo2File.value = "";
    }

    if (!value) {
      if (logoIndex === 1) {
        STATE.logo1DataUrl = null;
        STATE.logo1Base64 = null;
      } else {
        STATE.logo2DataUrl = null;
        STATE.logo2Base64 = null;
      }
      updateBandPreview();
    }
  });
}

handleLogoTypeChange(
  logo1Type,
  logo1AlumniBlock,
  logo1OrgBlock,
  logo1AlumniSelect,
  logo1AlumniFile,
  1
);
handleLogoTypeChange(
  logo2Type,
  logo2AlumniBlock,
  logo2OrgBlock,
  logo2AlumniSelect,
  logo2AlumniFile,
  2
);

// Peupler un select alumni depuis ALUMNI_DATA
function populateAlumniSelect(selectEl, data) {
  // On garde toujours une première option vide + "Autre"
  selectEl.innerHTML = "";

  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = "Sélectionner…";
  selectEl.appendChild(emptyOpt);

  // Tri alphabétique par name
  const items = Object.values(data).sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );

  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    selectEl.appendChild(opt);
  }

  const otherOpt = document.createElement("option");
  otherOpt.value = "autre";
  otherOpt.textContent = "Autre (je téléverse le logo)";
  selectEl.appendChild(otherOpt);
}

// Filtrer la liste en fonction du texte saisi
function filterAlumniSelect(selectEl, data, searchTerm) {
  if (!data || Object.keys(data).length === 0) return;
  const term = searchTerm.trim().toLowerCase();

  selectEl.innerHTML = "";

  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = term ? "Sélectionner un résultat…" : "Sélectionner…";
  selectEl.appendChild(emptyOpt);

  const items = Object.values(data).sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );

  for (const item of items) {
    if (!term || item.name.toLowerCase().includes(term)) {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      selectEl.appendChild(opt);
    }
  }

  const otherOpt = document.createElement("option");
  otherOpt.value = "autre";
  otherOpt.textContent = "Autre (je téléverse le logo)";
  selectEl.appendChild(otherOpt);
}

// Chargement dynamique du fichier alumni.json
fetch("alumni.json")
  .then((res) => res.json())
  .then((data) => {
    ALUMNI_DATA = data || {};
    populateAlumniSelect(logo1AlumniSelect, ALUMNI_DATA);
    populateAlumniSelect(logo2AlumniSelect, ALUMNI_DATA);
  })
  .catch((err) => {
    console.error("Erreur de chargement de alumni.json :", err);
  });

// Gestion recherche simple pour chaque bloc
if (logo1AlumniSearch) {
  logo1AlumniSearch.addEventListener("input", () => {
    filterAlumniSelect(logo1AlumniSelect, ALUMNI_DATA, logo1AlumniSearch.value);
  });
}
if (logo2AlumniSearch) {
  logo2AlumniSearch.addEventListener("input", () => {
    filterAlumniSelect(logo2AlumniSelect, ALUMNI_DATA, logo2AlumniSearch.value);
  });
}

// Sélection alumni (logique d’affectation logo)
function handleAlumniSelect(alumniSelect, fileInput, logoIndex) {
  alumniSelect.addEventListener("change", () => {
    const value = alumniSelect.value;

    if (value === "autre") {
      fileInput.style.display = "block";
    } else {
      fileInput.style.display = "none";
    }

    if (value && value !== "autre" && ALUMNI_DATA[value]) {
      const url = ALUMNI_DATA[value].logo;
      if (logoIndex === 1) {
        STATE.logo1DataUrl = url;
        STATE.logo1Base64 = null;
      } else {
        STATE.logo2DataUrl = url;
        STATE.logo2Base64 = null;
      }
      updateBandPreview();
    }

    if (!value) {
      if (logoIndex === 1) {
        STATE.logo1DataUrl = null;
        STATE.logo1Base64 = null;
      } else {
        STATE.logo2DataUrl = null;
        STATE.logo2Base64 = null;
      }
      updateBandPreview();
    }
  });

  // Upload d'un logo alumni "autre"
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    openCropModal(
      file,
      logoIndex === 1 ? "logo1" : "logo2",
      NaN,
      "Recadrer le logo alumni"
    );
  });
}

handleAlumniSelect(logo1AlumniSelect, logo1AlumniFile, 1);
handleAlumniSelect(logo2AlumniSelect, logo2AlumniFile, 2);

// Upload logos organisation
logo1File.addEventListener("change", () => {
  const file = logo1File.files && logo1File.files[0];
  if (!file) return;
  openCropModal(file, "logo1", NaN, "Recadrer le logo 1");
});

logo2File.addEventListener("change", () => {
  const file = logo2File.files && logo2File.files[0];
  if (!file) return;
  openCropModal(file, "logo2", NaN, "Recadrer le logo 2");
});

// Upload photo
photoFileInput.addEventListener("change", () => {
  const file = photoFileInput.files && photoFileInput.files[0];
  if (!file) return;
  openCropModal(file, "photo", 4 / 5, "Recadrer ta photo de profil");
});

// Boutons modale
cropCancelBtn.addEventListener("click", () => {
  closeCropModal();
});

cropValidateBtn.addEventListener("click", () => {
  if (!STATE.cropper || !STATE.currentCropTarget) {
    closeCropModal();
    return;
  }

  let canvas;
  if (STATE.currentCropTarget === "photo") {
    // Portrait vertical (900x1125), cercle appliqué côté visuel final
    canvas = STATE.cropper.getCroppedCanvas({
      width: 900,
      height: 1125,
      imageSmoothingQuality: "high",
    });
  } else {
    // Logos : rectangle standard pour la bande blanche
    canvas = STATE.cropper.getCroppedCanvas({
      width: 1200,
      height: 400,
      imageSmoothingQuality: "high",
    });
  }

  const dataUrl = canvas.toDataURL("image/png");

  if (STATE.currentCropTarget === "photo") {
    STATE.photoDataUrl = dataUrl;
    STATE.photoBase64 = dataUrlToBase64(dataUrl);
    photoPreview.src = dataUrl;
    photoPreview.style.display = "block";
    updateGenerateButtonState();
  } else if (STATE.currentCropTarget === "logo1") {
    STATE.logo1DataUrl = dataUrl;
    STATE.logo1Base64 = dataUrlToBase64(dataUrl);
    updateBandPreview();
  } else if (STATE.currentCropTarget === "logo2") {
    STATE.logo2DataUrl = dataUrl;
    STATE.logo2Base64 = dataUrlToBase64(dataUrl);
    updateBandPreview();
  }

  closeCropModal();
});

// Activer / désactiver le bouton de génération
emailInput.addEventListener("input", updateGenerateButtonState);
consentCheckbox.addEventListener("change", updateGenerateButtonState);

// Soumission
generateBtn.addEventListener("click", async () => {
  statusMsg.className = "status";
  statusMsg.textContent = "";

  if (!STATE.photoBase64) {
    statusMsg.textContent = "Merci de recadrer ta photo avant de générer le visuel.";
    statusMsg.classList.add("error");
    return;
  }
  if (!emailInput.value.trim()) {
    statusMsg.textContent = "L’e-mail est obligatoire.";
    statusMsg.classList.add("error");
    return;
  }
  if (!consentCheckbox.checked) {
    statusMsg.textContent = "Merci de cocher la case de consentement.";
    statusMsg.classList.add("error");
    return;
  }

  const logoCount = getLogoCount();

  const payload = {
    email: emailInput.value.trim(),
    fullname: fullnameInput.value.trim() || null,
    logo_count: logoCount,
    photo_base64: STATE.photoBase64,
    logo1_base64: STATE.logo1Base64,
    logo2_base64: STATE.logo2Base64,
    logo1_source_url: STATE.logo1Base64 ? null : STATE.logo1DataUrl || null,
    logo2_source_url: STATE.logo2Base64 ? null : STATE.logo2DataUrl || null,
    timestamp: new Date().toISOString(),
  };

  if (!MAKE_WEBHOOK_URL) {
    console.log("Payload prêt pour Make :", payload);
    statusMsg.textContent =
      "Simulation : le visuel serait généré et envoyé. (Webhook Make non configuré)";
    statusMsg.classList.add("ok");
    return;
  }

  try {
    generateBtn.disabled = true;
    statusMsg.textContent = "Envoi des informations…";

    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error("Erreur HTTP " + res.status);
    }

    statusMsg.textContent =
      "Merci ! Tes informations ont été envoyées. Tu recevras ton visuel par e-mail.";
    statusMsg.classList.add("ok");
  } catch (err) {
    console.error(err);
    statusMsg.textContent =
      "Une erreur est survenue lors de l’envoi. Merci de réessayer.";
    statusMsg.classList.add("error");
  } finally {
    generateBtn.disabled = false;
  }
});

// Initial
bandSection.style.display = "none";
updateGenerateButtonState();
